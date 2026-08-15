import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase, todaySaigon } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const emptyPlan = { license_plate: '', customer_name: '', insurance: '', scope_of_repair: '', arrival_date: todaySaigon(), estimated_completion_date: '', plan_parts_status: '', status: 'received', overall_progress: '', plan_note: '', plan_completed: false }
const normalise = value => String(value || '').trim().toLocaleLowerCase('vi-VN')

function getPartsStatus(tasks) {
  const withParts = tasks.filter(task => task.parts_needed)
  if (!withParts.length) return 'Chưa cập nhật'
  const missing = withParts.filter(task => !task.parts_complete)
  return missing.length ? `Thiếu: ${missing.map(task => task.parts_needed).join(', ')}` : `Đủ: ${withParts.map(task => task.parts_needed).join(', ')}`
}

function readWorkContents(rows) {
  const start = rows.findIndex(row => row.some(cell => normalise(cell).includes('nhân công bảo dưỡng')))
  if (start < 0) return []
  const contents = []
  for (let index = start + 1; index < rows.length; index += 1) {
    const row = rows[index]
    if (row.some(cell => normalise(cell).includes('ii. vật tư'))) break
    const content = String(row[8] || '').trim()
    if (content) contents.push(content)
  }
  return contents
}

export default function PlanningBoard() {
  const { profile } = useAuth()
  const inputRef = useRef(null)
  const [vehicles, setVehicles] = useState([])
  const [tasks, setTasks] = useState([])
  const [newPlan, setNewPlan] = useState(emptyPlan)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadPlan({ silent = false } = {}) {
    if (!silent) setLoading(true)
    const [{ data: vehicleData, error: vehicleError }, { data: taskData, error: taskError }] = await Promise.all([
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }), supabase.from('tasks').select('*'),
    ])
    setVehicles(vehicleData || []); setTasks(taskData || []); setError(vehicleError?.message || taskError?.message || '')
    if (!silent) setLoading(false)
  }
  useEffect(() => { loadPlan() }, [])

  const tasksByVehicle = useMemo(() => tasks.reduce((groups, task) => {
    ;(groups[task.vehicle_id] ||= []).push(task)
    return groups
  }, {}), [tasks])

  const sortedVehicles = useMemo(() => {
    const now = new Date(`${todaySaigon()}T12:00:00`).getTime()
    const distanceFromToday = value => {
      const time = value ? new Date(`${value}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER
      return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : Math.abs(time - now)
    }
    return [...vehicles].sort((a, b) => {
      if (Boolean(a.plan_completed) !== Boolean(b.plan_completed)) return a.plan_completed ? 1 : -1
      const dateDifference = distanceFromToday(a.estimated_completion_date) - distanceFromToday(b.estimated_completion_date)
      if (dateDifference) return dateDifference
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })
  }, [vehicles])

  async function saveCell(vehicle, field, value) {
    if (String(vehicle[field] || '') === String(value || '')) return
    setError(''); setMessage('')
    const dbValue = typeof value === 'boolean' ? value : value || null
    const { error: saveError } = await supabase.from('vehicles').update({ [field]: dbValue }).eq('id', vehicle.id)
    if (saveError) { setError(`Không thể lưu: ${saveError.message}`); return }
    setVehicles(current => current.map(item => item.id === vehicle.id ? { ...item, [field]: value } : item)); setMessage('Đã lưu thay đổi.')
  }

  async function createPlan() {
    setError(''); setMessage('')
    if (!newPlan.license_plate.trim() || !newPlan.customer_name.trim()) { setError('Nhập Biển số xe và Khách hàng trước khi thêm dòng.'); return }
    setSaving(true)
    const payload = Object.fromEntries(Object.entries(newPlan).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]))
    const { error: createError } = await supabase.from('vehicles').insert({ ...payload, customer_phone: null, created_by: profile?.id || null }).select().single()
    setSaving(false)
    if (createError) { setError(`Không thể thêm dòng: ${createError.message}`); return }
    setNewPlan(emptyPlan); setMessage('Đã thêm xe vào bảng kế hoạch.'); loadPlan({ silent: true })
  }

  async function importExcel(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(''); setMessage('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false })
      const contents = readWorkContents(rows)
      if (!contents.length) throw new Error('Không tìm thấy phần “Nhân công bảo dưỡng, sửa chữa”.')
      setNewPlan(current => ({ ...current, scope_of_repair: contents.join('; ') }))
      setMessage(`Đã lấy và tổng hợp ${contents.length} nội dung công việc từ ${file.name}.`)
    } catch (importError) { setError(`Không thể đọc file Excel: ${importError.message}`) } finally { event.target.value = '' }
  }

  async function setCompleted(vehicle, completed) {
    const changes = { plan_completed: completed }
    if (completed && !vehicle.estimated_completion_date) changes.estimated_completion_date = todaySaigon()
    setError(''); setMessage('')
    const { error: saveError } = await supabase.from('vehicles').update(changes).eq('id', vehicle.id)
    if (saveError) { setError(`Không thể lưu: ${saveError.message}`); return }
    setVehicles(current => current.map(item => item.id === vehicle.id ? { ...item, ...changes } : item))
    setMessage(completed ? 'Xe đã được đánh dấu xuất xưởng.' : 'Xe được đưa lại vào danh sách đang xử lý.')
  }

  async function editPlan(vehicle) {
    const content = window.prompt('Nội dung công việc:', vehicle.scope_of_repair || '')
    if (content !== null) await saveCell(vehicle, 'scope_of_repair', content)
  }

  async function deletePlan(vehicle) {
    if (!window.confirm(`Xóa xe ${vehicle.license_plate || ''} và các công việc liên quan?`)) return
    const { error: taskError } = await supabase.from('tasks').delete().eq('vehicle_id', vehicle.id)
    if (taskError) { setError(`Không thể xóa công việc: ${taskError.message}`); return }
    const { error: vehicleError } = await supabase.from('vehicles').delete().eq('id', vehicle.id)
    if (vehicleError) { setError(`Không thể xóa xe: ${vehicleError.message}`); return }
    setVehicles(current => current.filter(item => item.id !== vehicle.id)); setMessage('Đã xóa dòng kế hoạch.')
  }

  const input = (vehicle, field, type = 'text', fallback = '') => <input className="plan-cell-input" type={type} defaultValue={vehicle[field] ?? fallback} onBlur={event => saveCell(vehicle, field, event.target.value)} />
  if (loading) return <p style={{ color: 'var(--text-muted)', padding: '24px 0' }}>Đang tải bảng kế hoạch…</p>

  return <section style={{ padding: '24px 0' }}>
    <div className="plan-board-heading"><div><h2>Bảng kế hoạch</h2><p>Nhập trực tiếp từng ô. Thay đổi sẽ tự lưu khi bạn rời khỏi ô.</p></div><span>{vehicles.length} xe</span></div>
    <div className="plan-board-actions"><input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={importExcel} /><button type="button" className="btn" onClick={() => inputRef.current?.click()}>↑ Import nội dung Excel</button><button type="button" className="btn btn-accent" disabled={saving} onClick={createPlan}>{saving ? 'Đang thêm…' : '+ Thêm dòng kế hoạch'}</button></div>
    {message && <p className="plan-message">✓ {message}</p>}{error && <p className="error-text">{error}</p>}
    <div className="plan-table-wrap"><table className="plan-table plan-table-editable"><thead><tr><th>STT</th><th>Biển số xe</th><th>Khách hàng</th><th>Bảo hiểm</th><th>Nội dung công việc</th><th>Thời gian vào</th><th>Thời gian xe ra</th><th>Tình trạng phụ tùng</th><th>Tiến độ chung</th><th>Hoàn thiện</th><th>Ghi chú</th>{profile?.role === 'admin' && <th>Quản lý</th>}</tr></thead><tbody>
      <tr className="plan-new-row"><td>+</td><td><input className="plan-cell-input" value={newPlan.license_plate} onChange={e => setNewPlan(v => ({ ...v, license_plate: e.target.value.toUpperCase() }))} placeholder="29H-917.72" /></td><td><input className="plan-cell-input" value={newPlan.customer_name} onChange={e => setNewPlan(v => ({ ...v, customer_name: e.target.value }))} placeholder="Khách hàng" /></td><td><input className="plan-cell-input" value={newPlan.insurance} onChange={e => setNewPlan(v => ({ ...v, insurance: e.target.value }))} placeholder="Bảo hiểm" /></td><td><textarea className="plan-cell-input plan-cell-textarea" value={newPlan.scope_of_repair} onChange={e => setNewPlan(v => ({ ...v, scope_of_repair: e.target.value }))} placeholder="Nội dung công việc" /></td><td><input className="plan-cell-input" type="date" value={newPlan.arrival_date} onChange={e => setNewPlan(v => ({ ...v, arrival_date: e.target.value }))} /></td><td><input className="plan-cell-input" type="date" value={newPlan.estimated_completion_date} onChange={e => setNewPlan(v => ({ ...v, estimated_completion_date: e.target.value }))} /></td><td><input className="plan-cell-input" value={newPlan.plan_parts_status} onChange={e => setNewPlan(v => ({ ...v, plan_parts_status: e.target.value }))} placeholder="Đủ / Thiếu" /></td><td><input className="plan-cell-input" value={newPlan.overall_progress} onChange={e => setNewPlan(v => ({ ...v, overall_progress: e.target.value }))} placeholder="Tự nhập tiến độ" /></td><td><input type="checkbox" checked={newPlan.plan_completed} onChange={e => setNewPlan(v => ({ ...v, plan_completed: e.target.checked, estimated_completion_date: e.target.checked && !v.estimated_completion_date ? todaySaigon() : v.estimated_completion_date }))} /></td><td><textarea className="plan-cell-input plan-cell-textarea" value={newPlan.plan_note} onChange={e => setNewPlan(v => ({ ...v, plan_note: e.target.value }))} placeholder="Ghi chú" /></td>{profile?.role === 'admin' && <td />}</tr>
      {sortedVehicles.map((vehicle, index) => { const vehicleTasks = tasksByVehicle[vehicle.id] || []; return <tr key={vehicle.id} className={vehicle.plan_completed ? 'plan-completed-row' : ''}><td>{index + 1}</td><td>{input(vehicle, 'license_plate')}</td><td>{input(vehicle, 'customer_name')}</td><td>{input(vehicle, 'insurance')}</td><td><textarea className="plan-cell-input plan-cell-textarea" defaultValue={vehicle.scope_of_repair || vehicleTasks.map(task => task.description).filter(Boolean).join('; ')} onBlur={e => saveCell(vehicle, 'scope_of_repair', e.target.value)} /></td><td>{input(vehicle, 'arrival_date', 'date')}</td><td>{input(vehicle, 'estimated_completion_date', 'date')}</td><td>{input(vehicle, 'plan_parts_status', 'text', getPartsStatus(vehicleTasks))}</td><td>{input(vehicle, 'overall_progress', 'text', '')}</td><td><input type="checkbox" checked={Boolean(vehicle.plan_completed)} onChange={e => setCompleted(vehicle, e.target.checked)} aria-label="Xe đã xuất xưởng" /></td><td><textarea className="plan-cell-input plan-cell-textarea" defaultValue={vehicle.plan_note || ''} onBlur={e => saveCell(vehicle, 'plan_note', e.target.value)} /></td>{profile?.role === 'admin' && <td><div className="plan-admin-actions"><button type="button" className="btn btn-ghost" onClick={() => editPlan(vehicle)}>Sửa</button><button type="button" className="btn plan-delete-btn" onClick={() => deletePlan(vehicle)}>Xóa</button></div></td>}</tr> })}
    </tbody></table></div>
  </section>
}
