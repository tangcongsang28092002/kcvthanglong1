import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase, todaySaigon } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { REPAIR_TEAMS, emptyRepairItem, teamFromWorkCode } from '../lib/teams'

const emptyVehicle = { license_plate: '', customer_name: '', customer_phone: '', vehicle_type: '', arrival_date: todaySaigon(), estimated_completion_date: '' }
const normalise = (value) => String(value || '').trim().toLocaleLowerCase('vi-VN')

function dateFromExcel(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : todaySaigon()
}

function readValueAfterLabel(rows, label) {
  const wanted = normalise(label)
  for (const row of rows) {
    const index = row.findIndex(cell => normalise(cell).includes(wanted))
    if (index < 0) continue
    const cellText = String(row[index] || '')
    const inlineValue = cellText.replace(/^.*?(?:đt|điện thoại)\s*:\s*/i, '').trim()
    if (inlineValue && normalise(cellText) !== wanted) return inlineValue
    for (let i = index + 1; i < row.length; i += 1) if (String(row[i] || '').trim()) return String(row[i]).trim()
  }
  return ''
}

function readRepairItems(rows) {
  const start = rows.findIndex(row => row.some(cell => normalise(cell).includes('nhân công bảo dưỡng')))
  if (start < 0) return []
  const items = []
  for (let rowIndex = start + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (row.some(cell => normalise(cell).includes('ii. vật tư'))) break
    const workCode = String(row[4] || '').trim()
    const description = String(row[8] || '').trim()
    const team = teamFromWorkCode(workCode)
    if (team && description) items.push({ ...emptyRepairItem(), work_code: workCode, description, team })
  }
  return items
}

export default function RepairTicketForm({ onCreated }) {
  const { profile } = useAuth()
  const fileInputRef = useRef(null)
  const [vehicle, setVehicle] = useState(emptyVehicle)
  const [items, setItems] = useState([emptyRepairItem()])
  const [error, setError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const updateItem = (key, patch) => setItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item))
  const addItem = () => setItems(current => [...current, emptyRepairItem()])
  const removeItem = (key) => setItems(current => current.length === 1 ? current : current.filter(item => item.key !== key))

  async function importExcel(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError(''); setImportMessage('')
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false })
      const importedItems = readRepairItems(rows)
      if (!importedItems.length) throw new Error('Không tìm thấy hạng mục trong phần “Nhân công bảo dưỡng, sửa chữa”.')
      setVehicle({
        license_plate: readValueAfterLabel(rows, 'Biển số').toUpperCase(), customer_name: readValueAfterLabel(rows, 'Chủ xe'),
        vehicle_type: readValueAfterLabel(rows, 'Loại xe'), customer_phone: readValueAfterLabel(rows, 'ĐT') || readValueAfterLabel(rows, 'Điện thoại'),
        arrival_date: dateFromExcel(readValueAfterLabel(rows, 'Ngày vào')), estimated_completion_date: '',
      })
      setItems(importedItems)
      setImportMessage(`Đã nạp ${importedItems.length} hạng mục từ ${file.name}. Hãy kiểm tra trước khi tạo phiếu.`)
    } catch (importError) { setError(`Không thể đọc file Excel: ${importError.message}`) } finally { event.target.value = '' }
  }

  async function handleCreate(event) {
    event.preventDefault(); setError('')
    const activeItems = items.filter(item => item.description.trim())
    if (!activeItems.length) { setError('Nhập ít nhất một hạng mục sửa chữa.'); return }
    setSaving(true)
    const { data: createdVehicle, error: vehicleError } = await supabase.from('vehicles').insert({
      ...vehicle, vehicle_type: vehicle.vehicle_type.trim() || null, estimated_completion_date: vehicle.estimated_completion_date || null,
      scope_of_repair: activeItems.map(item => item.description.trim()).join('; '), created_by: profile.id,
    }).select().single()
    if (vehicleError) { setSaving(false); setError(vehicleError.message); return }
    const { error: taskError } = await supabase.from('tasks').insert(activeItems.map(item => ({
      vehicle_id: createdVehicle.id, work_code: item.work_code.trim() || null, description: item.description.trim(),
      parts_needed: item.parts_needed.trim() || null, parts_complete: item.parts_complete, team: item.team.trim() || null,
      start_time: item.start_time || null, end_time: item.end_time || null, assigned_by: profile.id,
    })))
    setSaving(false)
    if (taskError) { setError(taskError.message); return }
    setVehicle(emptyVehicle); setItems([emptyRepairItem()]); setImportMessage(''); onCreated?.()
  }

  return <form onSubmit={handleCreate} className="ticket-form card">
    <div className="ticket-form-topbar"><div><p className="ticket-form-eyebrow">PHIẾU TIẾP NHẬN SỬA CHỮA</p><h3>Lên phiếu xe</h3><p>Nhập thủ công hoặc nạp trực tiếp từ phiếu yêu cầu sửa chữa Excel.</p></div><div><input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={importExcel} hidden /><button type="button" className="btn ticket-import-btn" onClick={() => fileInputRef.current?.click()}>↑ Import Excel</button></div></div>
    {importMessage && <div className="ticket-import-success">✓ {importMessage}</div>}{error && <p className="error-text">{error}</p>}
    <section className="ticket-section"><div className="ticket-section-title"><span>01</span><div><strong>Thông tin xe &amp; khách hàng</strong><small>Các trường có dấu * là bắt buộc</small></div></div>
      <div className="ticket-details-grid"><div className="field"><label>Biển số xe *</label><input required value={vehicle.license_plate} onChange={e => setVehicle({ ...vehicle, license_plate: e.target.value.toUpperCase() })} placeholder="29H-917.72" /></div><div className="field"><label>Loại xe</label><input value={vehicle.vehicle_type} onChange={e => setVehicle({ ...vehicle, vehicle_type: e.target.value })} placeholder="QMR77" /></div><div className="field ticket-field-wide"><label>Tên chủ xe *</label><input required value={vehicle.customer_name} onChange={e => setVehicle({ ...vehicle, customer_name: e.target.value })} /></div><div className="field"><label>Điện thoại *</label><input required value={vehicle.customer_phone} onChange={e => setVehicle({ ...vehicle, customer_phone: e.target.value })} /></div><div className="field"><label>Ngày vào xưởng *</label><input required type="date" value={vehicle.arrival_date} onChange={e => setVehicle({ ...vehicle, arrival_date: e.target.value })} /></div><div className="field"><label>Dự kiến hoàn thành</label><input type="date" value={vehicle.estimated_completion_date} onChange={e => setVehicle({ ...vehicle, estimated_completion_date: e.target.value })} /></div></div>
    </section>
    <section className="ticket-section"><div className="ticket-section-title"><span>02</span><div><strong>Nhân công bảo dưỡng, sửa chữa</strong><small>Mã CV tự phân tổ: 01–02 KTV · 03 Sơn · 04 Gò · 05 Gia công</small></div></div>
      <div className="ticket-items-table-wrap"><table className="ticket-items-table"><thead><tr><th>Mã CV</th><th>Nội dung công việc *</th><th>Tổ thực hiện</th><th>Phụ tùng</th><th></th></tr></thead><tbody>{items.map((item, index) => <tr key={item.key}><td><input value={item.work_code} onChange={e => updateItem(item.key, { work_code: e.target.value, team: teamFromWorkCode(e.target.value) || item.team })} placeholder="01.00000" /></td><td><input value={item.description} onChange={e => updateItem(item.key, { description: e.target.value })} placeholder={`Hạng mục ${index + 1}`} /></td><td><input list="repair-teams" value={item.team} onChange={e => updateItem(item.key, { team: e.target.value })} placeholder="Tự động phân tổ" /></td><td><input value={item.parts_needed} onChange={e => updateItem(item.key, { parts_needed: e.target.value })} placeholder="Nếu có" /></td><td><button type="button" className="btn-remove-item" onClick={() => removeItem(item.key)} disabled={items.length === 1} aria-label="Xóa hạng mục">×</button></td></tr>)}</tbody></table></div>
      <datalist id="repair-teams">{REPAIR_TEAMS.map(team => <option key={team} value={team} />)}</datalist><button type="button" className="btn btn-ghost btn-add-item" onClick={addItem}>+ Thêm hạng mục</button>
    </section>
    <div className="ticket-submit-row"><span>{items.filter(item => item.description.trim()).length} hạng mục sẽ được tạo</span><button className="btn btn-accent" disabled={saving}>{saving ? 'Đang tạo phiếu…' : 'Tạo phiếu theo dõi →'}</button></div>
  </form>
}
