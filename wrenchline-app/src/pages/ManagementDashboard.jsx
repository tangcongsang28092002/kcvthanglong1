import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import StatusBadge from '../components/StatusBadge'
import RepairTicketForm from '../components/RepairTicketForm'
import RecordFilterBar from '../components/RecordFilterBar'
import RepairItemsPreview from '../components/RepairItemsPreview'
import { ROLES } from '../lib/supabase'

const TABS = [
  { key: 'create', label: 'Lên phiếu' },
  { key: 'vehicles', label: 'Tất cả xe' },
  { key: 'assign', label: 'Giao việc' },
  { key: 'staff', label: 'Nhân sự & vị trí' },
]

export default function ManagementDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('vehicles')
  const [vehicles, setVehicles] = useState([])
  const [staff, setStaff] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const [taskForm, setTaskForm] = useState({ vehicle_id: '', assigned_to: '', description: '' })
  const [taskError, setTaskError] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: v }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*, vehicles(license_plate), assignee:assigned_to(full_name)').order('created_at', { ascending: false }),
    ])
    setVehicles(v || [])
    setStaff(p || [])
    setTasks(t || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const tasksByVehicle = useMemo(() => {
    const grouped = {}
    for (const t of tasks) {
      grouped[t.vehicle_id] = grouped[t.vehicle_id] || []
      grouped[t.vehicle_id].push(t)
    }
    return grouped
  }, [tasks])

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles.filter(v => {
      if (status && v.status !== status) return false
      if (!q) return true
      return [v.license_plate, v.customer_name, v.scope_of_repair]
        .some(f => (f || '').toLowerCase().includes(q))
    })
  }, [vehicles, search, status])

  const foremen = staff.filter(s => s.role === 'foreman')
  const workers = staff.filter(s => s.role === 'foreman' || s.role === 'technician')
  const pendingCount = staff.filter(s => !s.approved).length

  async function assignForeman(vehicleId, foremanId) {
    await supabase.from('vehicles').update({ foreman_id: foremanId || null }).eq('id', vehicleId)
    loadAll()
  }

  async function changeRole(userId, role) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    loadAll()
  }

  async function toggleApproved(userId, approved) {
    await supabase.from('profiles').update({ approved }).eq('id', userId)
    loadAll()
  }

  async function createTask(e) {
    e.preventDefault()
    setTaskError('')
    if (!taskForm.vehicle_id || !taskForm.assigned_to) { setTaskError('Chọn xe và người được giao việc.'); return }
    setSavingTask(true)
    const { error } = await supabase.from('tasks').insert({
      vehicle_id: taskForm.vehicle_id,
      assigned_to: taskForm.assigned_to,
      description: taskForm.description,
      assigned_by: profile.id,
    })
    setSavingTask(false)
    if (error) { setTaskError(error.message); return }
    setTaskForm({ vehicle_id: '', assigned_to: '', description: '' })
    loadAll()
  }

  return (
    <div style={{ padding: '32px 0' }}>
      <h2 style={{ fontSize: 22, marginBottom: 16 }}>Tổng quan quản lý</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} className="btn" onClick={() => setTab(t.key)}
            style={{ background: tab === t.key ? 'var(--accent)' : 'var(--surface-raised)', color: tab === t.key ? 'var(--accent-ink)' : 'var(--text)', borderColor: tab === t.key ? 'var(--accent)' : 'var(--border)' }}>
            {t.key === 'staff' ? `${t.label}${pendingCount ? ` (${pendingCount} chờ duyệt)` : ''}` : t.label}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)' }}>Đang tải…</p> : (
        <>
          {tab === 'create' && (
            <div style={{ maxWidth: 640 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Lên phiếu tiếp nhận xe, khai báo hạng mục sửa chữa, phụ tùng đi kèm và phân công tổ kỹ thuật viên phụ trách.</p>
              <RepairTicketForm onCreated={() => { loadAll(); setTab('vehicles') }} />
            </div>
          )}

          {tab === 'vehicles' && (
            <>
              <RecordFilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} resultCount={filteredVehicles.length} />

              {/* Desktop / laptop: Excel-style table */}
              <div className="record-table-wrap">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>Biển số</th>
                      <th>Khách hàng</th>
                      <th>Hạng mục sửa chữa / phụ tùng / tổ phụ trách</th>
                      <th>Trạng thái</th>
                      <th>Tổ trưởng phụ trách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map(v => (
                      <tr key={v.id}>
                        <td><span className="plate">{v.license_plate}</span></td>
                        <td>{v.customer_name}</td>
                        <td style={{ minWidth: 300 }}><RepairItemsPreview items={tasksByVehicle[v.id]} /></td>
                        <td><StatusBadge status={v.status} /></td>
                        <td>
                          <select value={v.foreman_id || ''} onChange={e => assignForeman(v.id, e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)' }}>
                            <option value="">Chưa phân công</option>
                            {foremen.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: card layout */}
              <div className="record-cards">
                {filteredVehicles.map(v => (
                  <div key={v.id} className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span className="plate">{v.license_plate}</span>
                      <StatusBadge status={v.status} />
                    </div>
                    <div style={{ fontWeight: 600 }}>{v.customer_name}</div>
                    <div style={{ marginTop: 8, marginBottom: 10 }}><RepairItemsPreview items={tasksByVehicle[v.id]} compact /></div>
                    <select value={v.foreman_id || ''} onChange={e => assignForeman(v.id, e.target.value)} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)' }}>
                      <option value="">Chưa phân công tổ trưởng</option>
                      {foremen.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'assign' && (
            <div className="dashboard-grid-340">
              <form onSubmit={createTask} className="card">
                <h3 style={{ fontSize: 17, marginBottom: 14 }}>Giao việc bổ sung cho cá nhân</h3>
                <div className="field">
                  <label>Xe</label>
                  <select required value={taskForm.vehicle_id} onChange={e => setTaskForm({ ...taskForm, vehicle_id: e.target.value })}>
                    <option value="">Chọn xe…</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} — {v.customer_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Giao cho</label>
                  <select required value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}>
                    <option value="">Chọn tổ trưởng hoặc kỹ thuật viên…</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({ROLES[w.role]})</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Nội dung công việc</label>
                  <textarea required value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Thay má phanh và đĩa phanh trước" />
                </div>
                {taskError && <p className="error-text">{taskError}</p>}
                <button className="btn btn-accent" style={{ width: '100%' }} disabled={savingTask}>{savingTask ? 'Đang giao…' : 'Giao việc'}</button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks.map(t => (
                  <div key={t.id} className="card" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="plate" style={{ fontSize: 12 }}>{t.vehicles?.license_plate}</span>
                      <StatusBadge status={t.status === 'completed' ? 'completed' : t.status === 'in_progress' ? 'in_repair' : 'received'} />
                    </div>
                    <div style={{ fontSize: 14, marginBottom: 4 }}>{t.description}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>Giao cho {t.assignee?.full_name || '—'}</span>
                      {t.team && <span className="tag tag-team">{t.team}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'staff' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {staff.map(s => (
                <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                      {!s.approved && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase' }}>
                          Chờ duyệt
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.phone || 'Chưa có số điện thoại'}</div>
                  </div>
                  <select value={s.role} onChange={e => changeRole(s.id, e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)' }}>
                    {Object.entries(ROLES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                  {s.approved ? (
                    <button className="btn btn-ghost" onClick={() => toggleApproved(s.id, false)}>Thu hồi quyền</button>
                  ) : (
                    <button className="btn btn-accent" onClick={() => toggleApproved(s.id, true)}>Xác nhận</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
