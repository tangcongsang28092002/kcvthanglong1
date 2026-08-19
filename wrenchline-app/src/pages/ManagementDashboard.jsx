import { useEffect, useMemo, useState } from 'react'
import { PAINT_ORDER_STATUSES, supabase, PAINT_STATUS_LABELS } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import StatusBadge from '../components/StatusBadge'
import RepairTicketForm from '../components/RepairTicketForm'
import RecordFilterBar from '../components/RecordFilterBar'
import RepairItemsPreview from '../components/RepairItemsPreview'
import PaintOrderForm from '../components/PaintOrderForm'
import PaintOrdersTable from '../components/PaintOrdersTable'
import { ROLES } from '../lib/supabase'
import { withViewTransition } from '../lib/viewTransition'

const TABS = [
  { key: 'create', label: 'Lên phiếu' },
  { key: 'vehicles', label: 'Tất cả xe' },
  { key: 'assign', label: 'Giao việc' },
  { key: 'paint', label: '🎨 Sơn xe' },
  { key: 'staff', label: 'Nhân sự & vị trí' },
]

export default function ManagementDashboard() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('vehicles')
  const [vehicles, setVehicles] = useState([])
  const [staff, setStaff] = useState([])
  const [tasks, setTasks] = useState([])
  const [paintOrders, setPaintOrders] = useState([])
  const [paintFilter, setPaintFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const [taskForm, setTaskForm] = useState({ vehicle_id: '', assigned_to: '', description: '' })
  const [taskError, setTaskError] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [processingVehicleId, setProcessingVehicleId] = useState(null)

  async function loadAll({ silent = false } = {}) {
    if (!silent) setLoading(true)
    const [{ data: v }, { data: p }, { data: t }, { data: po }] = await Promise.all([
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*, vehicles(license_plate), assignee:assigned_to(full_name)').order('created_at', { ascending: false }),
      supabase.from('paint_orders').select('*, creator:created_by(full_name), handler:assigned_to(full_name)').order('created_at', { ascending: false }),
    ])
    const applyData = () => {
      setVehicles(v || [])
      setStaff(p || [])
      setTasks(t || [])
      setPaintOrders(po || [])
    }
    // See loadOrders() in PaintTeamDashboard.jsx for why silent updates are
    // wrapped in a view transition (smooth reorder instead of a hard snap).
    if (silent) withViewTransition(applyData); else applyData()
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const channel = supabase.channel('management-live-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => loadAll({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadAll({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paint_orders' }, () => loadAll({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAll({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_updates' }, () => loadAll({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quality_inspections' }, () => loadAll({ silent: true }))
      .subscribe()
    const refreshTimer = window.setInterval(() => loadAll({ silent: true }), 5000)
    return () => {
      window.clearInterval(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [])

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

  async function editVehicle(vehicle) {
    const license_plate = window.prompt('Biển số xe:', vehicle.license_plate || '')
    if (license_plate === null) return
    const customer_name = window.prompt('Khách hàng:', vehicle.customer_name || '')
    if (customer_name === null) return
    const scope_of_repair = window.prompt('Nội dung công việc:', vehicle.scope_of_repair || '')
    if (scope_of_repair === null) return
    setProcessingVehicleId(vehicle.id)
    const { error } = await supabase.from('vehicles').update({ license_plate: license_plate.trim().toUpperCase(), customer_name: customer_name.trim(), scope_of_repair: scope_of_repair.trim() || null }).eq('id', vehicle.id)
    setProcessingVehicleId(null)
    if (error) { alert(`Lỗi cập nhật xe: ${error.message}`); return }
    loadAll()
  }

  async function deleteVehicle(vehicle) {
    if (!window.confirm(`Xóa xe ${vehicle.license_plate || ''} và toàn bộ hạng mục công việc liên quan?`)) return
    setProcessingVehicleId(vehicle.id)
    const { error: taskError } = await supabase.from('tasks').delete().eq('vehicle_id', vehicle.id)
    if (taskError) { setProcessingVehicleId(null); alert(`Lỗi xóa hạng mục: ${taskError.message}`); return }
    const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id)
    setProcessingVehicleId(null)
    if (error) { alert(`Lỗi xóa xe: ${error.message}`); return }
    loadAll()
  }

  async function changeRole(userId, role) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    loadAll()
  }

  async function changeTeamGroup(userId, team_group) {
    await supabase.from('profiles').update({ team_group }).eq('id', userId)
    loadAll()
  }

  async function toggleApproved(userId, approved) {
    await supabase.from('profiles').update({ approved }).eq('id', userId)
    loadAll()
  }

  async function resetPassword(userId, userName) {
    const newPassword = window.prompt(`Nhập mật khẩu mới cho nhân sự ${userName}:`)
    if (!newPassword) return

    if (newPassword.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    const { error } = await supabase.rpc('admin_reset_password', {
      target_user_id: userId,
      new_password: newPassword
    })

    if (error) {
      alert(`Lỗi đổi mật khẩu: ${error.message}`)
    } else {
      alert(`Đã đổi mật khẩu thành công cho ${userName}!`)
    }
  }

  async function deleteUser(userId, userName) {
    if (userId === profile.id) {
      alert('Bạn không thể xóa chính tài khoản của mình!')
      return
    }
    const confirmed = window.confirm(`⚠️ Bạn có chắc muốn XÓA nhân sự "${userName}" không?\nHành động này không thể hoàn tác!`)
    if (!confirmed) return

    setDeletingUserId(userId)
    const { error } = await supabase.rpc('admin_delete_user', {
      target_user_id: userId
    })
    setDeletingUserId(null)

    if (error) {
      alert(`Lỗi xóa tài khoản: ${error.message}`)
    } else {
      alert(`Đã xóa tài khoản ${userName} thành công.`)
      loadAll()
    }
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
            <div style={{ maxWidth: 1120 }}>
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
                      <th>Quản lý</th>
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
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => editVehicle(v)} disabled={processingVehicleId === v.id} style={{ padding: '5px 8px', fontSize: 12 }}>Sửa</button>
                            <button type="button" className="btn" onClick={() => deleteVehicle(v)} disabled={processingVehicleId === v.id} style={{ padding: '5px 8px', fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)', background: 'transparent' }}>{processingVehicleId === v.id ? 'Đang xử lý…' : 'Xóa'}</button>
                          </div>
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
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => editVehicle(v)} disabled={processingVehicleId === v.id} style={{ flex: 1 }}>Sửa</button>
                      <button type="button" className="btn" onClick={() => deleteVehicle(v)} disabled={processingVehicleId === v.id} style={{ flex: 1, color: 'var(--red)', borderColor: 'var(--red)', background: 'transparent' }}>{processingVehicleId === v.id ? 'Đang xử lý…' : 'Xóa'}</button>
                    </div>
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

          {tab === 'paint' && (
            <div>
              <div className="paint-summary-grid">
                {[
                  { label: 'Tổng đơn đã lên', value: paintOrders.length, tone: 'default' },
                  { label: PAINT_STATUS_LABELS.done, value: paintOrders.filter(order => order.status === 'done').length, tone: 'complete' },
                  { label: PAINT_STATUS_LABELS.painting, value: paintOrders.filter(order => order.status === 'painting').length, tone: 'progress' },
                  { label: PAINT_STATUS_LABELS.waiting, value: paintOrders.filter(order => order.status === 'waiting').length, tone: 'pending' },
                ].map(item => (
                  <div className={`card paint-summary-card paint-summary-${item.tone}`} key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>Lên đơn Sơn xe mới</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                Tạo đơn sơn xe mới. Sau khi tạo, đơn sẽ tự động chuyển cho <strong style={{ color: 'var(--accent)' }}>Tổ sơn</strong>.
              </p>
              <div className="card" style={{ marginBottom: 24 }}>
                <PaintOrderForm onCreated={loadAll} />
              </div>

              <h3 style={{ fontSize: 18, marginBottom: 12 }}>Danh sách đơn Sơn xe</h3>
              {/* Filter */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14, width: 'fit-content' }}>
                {[{ k: 'all', l: 'Tất cả' }, ...PAINT_ORDER_STATUSES.map(status => ({ k: status, l: PAINT_STATUS_LABELS[status] }))].map(f => (
                  <button key={f.k} type="button" className="btn" onClick={() => setPaintFilter(f.k)}
                    style={{ fontSize: 12, border: 'none', padding: '5px 12px', background: paintFilter === f.k ? 'var(--surface-raised)' : 'transparent', color: paintFilter === f.k ? 'var(--text)' : 'var(--text-muted)', fontWeight: paintFilter === f.k ? 600 : 400 }}>
                    {f.l}
                  </button>
                ))}
              </div>
              {/* silent: true avoids re-triggering the full-page loading state
                  (and the flicker/scroll-jump that came with it) on every
                  status change inside the table — see PaintTeamDashboard.jsx */}
              <PaintOrdersTable orders={paintFilter === 'all' ? paintOrders : paintOrders.filter(o => o.status === paintFilter)} onRefresh={() => loadAll({ silent: true })} />
            </div>
          )}

          {tab === 'staff' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {staff.map(s => (
                <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{s.full_name}</span>
                      {s.team_group && (
                        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--blue-soft)', color: 'var(--blue)', border: '1px solid var(--blue)', borderRadius: 999, padding: '2px 8px' }}>
                          {s.team_group}
                        </span>
                      )}
                      {!s.approved && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 999, padding: '2px 8px', textTransform: 'uppercase' }}>
                          Chờ duyệt
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.phone || 'Chưa có số điện thoại'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổ đội</span>
                    <input
                      value={s.team_group || ''}
                      onChange={e => changeTeamGroup(s.id, e.target.value || null)}
                      placeholder="VD: Tổ sơn, Tổ gò..."
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)', fontSize: 13, width: 160 }}
                    />
                  </div>
                  <select value={s.role} onChange={e => changeRole(s.id, e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)' }}>
                    {Object.entries(ROLES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                  {s.approved ? (
                    <button className="btn btn-ghost" onClick={() => toggleApproved(s.id, false)}>Thu hồi quyền</button>
                  ) : (
                    <button className="btn btn-accent" onClick={() => toggleApproved(s.id, true)}>Xác nhận</button>
                  )}
                  <button className="btn" onClick={() => resetPassword(s.id, s.full_name)} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    Đổi mật khẩu
                  </button>
                  {s.id !== profile.id && (
                    <button className="btn" onClick={() => deleteUser(s.id, s.full_name)} disabled={deletingUserId === s.id} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', whiteSpace: 'nowrap' }}>
                      {deletingUserId === s.id ? 'Đang xóa…' : '🗑 Xóa'}
                    </button>
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
