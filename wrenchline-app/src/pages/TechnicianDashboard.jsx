import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import StatusBadge from '../components/StatusBadge'
import RepairItemsPreview from '../components/RepairItemsPreview'

const TASK_STATUSES = ['pending', 'in_progress', 'completed']
const TASK_LABELS = { pending: 'Chờ xử lý', in_progress: 'Đang thực hiện', completed: 'Hoàn thành' }

export default function TechnicianDashboard() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, vehicles(license_plate, customer_name, scope_of_repair, status)')
      .eq('assigned_to', profile.id)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [profile.id])

  async function updateTaskStatus(task, status) {
    await supabase.from('tasks').update({ status }).eq('id', task.id)
    await supabase.from('status_updates').insert({
      vehicle_id: task.vehicle_id, task_id: task.id, updated_by: profile.id, new_status: status,
    })
    loadTasks()
  }

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: '32px 0' }}>Đang tải…</p>

  return (
    <div style={{ padding: '32px 0' }}>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Công việc của bạn</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Công việc được quản lý hoặc tổ trưởng giao cho bạn.</p>

      {tasks.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Chưa có công việc nào được giao.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span className="plate">{t.vehicles?.license_plate}</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.description}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>{t.vehicles?.customer_name} — trạng thái xe: <StatusBadge status={t.vehicles?.status} /></div>
                <RepairItemsPreview items={[t]} compact hideDescription />
              </div>
              <select value={t.status} onChange={e => updateTaskStatus(t, e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)' }}>
                {TASK_STATUSES.map(s => <option key={s} value={s}>{TASK_LABELS[s]}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
