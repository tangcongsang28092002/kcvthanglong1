import { useEffect, useMemo, useState } from 'react'
import { supabase, formatDateVN } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import RepairTicketForm from '../components/RepairTicketForm'
import RecordFilterBar from '../components/RecordFilterBar'
import RepairItemsPreview from '../components/RepairItemsPreview'

export default function AdvisorDashboard() {
  const [vehicles, setVehicles] = useState([])
  const [tasksByVehicle, setTasksByVehicle] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  async function loadVehicles() {
    setLoading(true)
    const { data: v } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
    setVehicles(v || [])

    if (v?.length) {
      const { data: t } = await supabase
        .from('tasks')
        .select('*')
        .in('vehicle_id', v.map(x => x.id))
        .order('created_at', { ascending: true })
      const grouped = {}
      for (const task of t || []) {
        grouped[task.vehicle_id] = grouped[task.vehicle_id] || []
        grouped[task.vehicle_id].push(task)
      }
      setTasksByVehicle(grouped)
    } else {
      setTasksByVehicle({})
    }
    setLoading(false)
  }

  useEffect(() => { loadVehicles() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles.filter(v => {
      if (status && v.status !== status) return false
      if (!q) return true
      return [v.license_plate, v.customer_name, v.customer_phone, v.scope_of_repair]
        .some(f => (f || '').toLowerCase().includes(q))
    })
  }, [vehicles, search, status])

  return (
    <div className="dashboard-grid">
      <div>
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>Tiếp nhận xe mới</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Ghi nhận thông tin khi xe vào xưởng, khai báo hạng mục sửa chữa và phân công tổ kỹ thuật viên.</p>
        <RepairTicketForm onCreated={loadVehicles} />
      </div>

      <div>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Tất cả phiếu theo dõi</h2>
        {loading ? <p style={{ color: 'var(--text-muted)' }}>Đang tải…</p> : vehicles.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Chưa có xe nào được ghi nhận.</p>
        ) : (
          <>
            <RecordFilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} resultCount={filtered.length} />

            {/* Desktop / laptop: Excel-style table */}
            <div className="record-table-wrap">
              <table className="record-table">
                <thead>
                  <tr>
                    <th>Biển số</th>
                    <th>Khách hàng</th>
                    <th>Điện thoại</th>
                    <th>Hạng mục sửa chữa / phụ tùng / tổ phụ trách</th>
                    <th>Ngày vào</th>
                    <th>Dự kiến xong</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id}>
                      <td><span className="plate">{v.license_plate}</span></td>
                      <td>{v.customer_name}</td>
                      <td>{v.customer_phone}</td>
                      <td style={{ minWidth: 320 }}><RepairItemsPreview items={tasksByVehicle[v.id]} /></td>
                      <td>{formatDateVN(v.arrival_date)}</td>
                      <td>{formatDateVN(v.estimated_completion_date)}</td>
                      <td><StatusBadge status={v.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card layout */}
            <div className="record-cards">
              {filtered.map(v => (
                <div key={v.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span className="plate">{v.license_plate}</span>
                    <StatusBadge status={v.status} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{v.customer_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>{v.customer_phone}</div>
                  <RepairItemsPreview items={tasksByVehicle[v.id]} compact />
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-dim)', marginTop: 10 }}>
                    <span>Vào xưởng {formatDateVN(v.arrival_date)}</span>
                    {v.estimated_completion_date && <span>Dự kiến {formatDateVN(v.estimated_completion_date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
