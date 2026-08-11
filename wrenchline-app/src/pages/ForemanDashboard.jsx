import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import StatusBadge from '../components/StatusBadge'
import RepairItemsPreview from '../components/RepairItemsPreview'
import { VEHICLE_STATUSES, STATUS_LABELS } from '../lib/supabase'

const TASK_STATUS_LABELS = { pending: 'Chờ xử lý', in_progress: 'Đang thực hiện', completed: 'Hoàn thành' }

export default function ForemanDashboard() {
  const { profile } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [tasksByVehicle, setTasksByVehicle] = useState({})
  const [loading, setLoading] = useState(true)
  const [inspection, setInspection] = useState({}) // vehicleId -> {passed, notes}

  async function loadAll() {
    setLoading(true)
    const { data: v } = await supabase
      .from('vehicles').select('*').eq('foreman_id', profile.id)
      .order('created_at', { ascending: false })
    setVehicles(v || [])

    if (v?.length) {
      const { data: t } = await supabase
        .from('tasks').select('*, assignee:assigned_to(full_name, role)')
        .in('vehicle_id', v.map(x => x.id))
        .order('created_at', { ascending: true })
      const grouped = {}
      for (const task of t || []) {
        grouped[task.vehicle_id] = grouped[task.vehicle_id] || []
        grouped[task.vehicle_id].push(task)
      }
      setTasksByVehicle(grouped)
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [profile.id])

  async function updateStatus(vehicleId, status) {
    await supabase.from('vehicles').update({ status }).eq('id', vehicleId)
    await supabase.from('status_updates').insert({ vehicle_id: vehicleId, updated_by: profile.id, new_status: status })
    loadAll()
  }

  async function submitInspection(vehicleId) {
    const insp = inspection[vehicleId] || { passed: true, notes: '' }
    await supabase.from('quality_inspections').insert({
      vehicle_id: vehicleId, foreman_id: profile.id, passed: insp.passed, notes: insp.notes,
    })
    await updateStatus(vehicleId, insp.passed ? 'completed' : 'in_repair')
    setInspection({ ...inspection, [vehicleId]: { passed: true, notes: '' } })
  }

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: '32px 0' }}>Đang tải…</p>

  return (
    <div style={{ padding: '32px 0' }}>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Xe thuộc phạm vi phụ trách</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Theo dõi tiến độ kỹ thuật viên, cập nhật trạng thái và nghiệm thu chất lượng.</p>

      {vehicles.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Chưa có xe nào được phân công cho bạn.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {vehicles.map(v => {
            const tasks = tasksByVehicle[v.id] || []
            const insp = inspection[v.id] || { passed: true, notes: '' }
            return (
              <div key={v.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="plate">{v.license_plate}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{v.customer_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{v.scope_of_repair}</div>
                    </div>
                  </div>
                  <StatusBadge status={v.status} />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cập nhật trạng thái</span>
                  <select value={v.status} onChange={e => updateStatus(v.id, e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text)' }}>
                    {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>

                {tasks.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Hạng mục sửa chữa &amp; tổ phụ trách</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {tasks.map(t => (
                        <div key={t.id} style={{ fontSize: 13, background: 'var(--surface-raised)', borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span>{t.description} {t.assignee?.full_name && <span style={{ color: 'var(--text-dim)' }}>— {t.assignee.full_name}</span>}</span>
                            <span style={{ color: t.status === 'completed' ? 'var(--green)' : t.status === 'in_progress' ? 'var(--accent)' : 'var(--text-dim)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{TASK_STATUS_LABELS[t.status]}</span>
                          </div>
                          <RepairItemsPreview items={[t]} compact hideDescription />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Nghiệm thu chất lượng sau sửa chữa</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={insp.passed ? 'pass' : 'fail'} onChange={e => setInspection({ ...inspection, [v.id]: { ...insp, passed: e.target.value === 'pass' } })} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)' }}>
                      <option value="pass">Đạt</option>
                      <option value="fail">Cần làm lại</option>
                    </select>
                    <input placeholder="Ghi chú nghiệm thu" value={insp.notes} onChange={e => setInspection({ ...inspection, [v.id]: { ...insp, notes: e.target.value } })} style={{ flex: 1, minWidth: 160, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)' }} />
                    <button className="btn btn-accent" onClick={() => submitInspection(v.id)}>Lưu kết quả</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
