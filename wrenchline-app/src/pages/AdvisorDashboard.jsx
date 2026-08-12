import { useEffect, useMemo, useState } from 'react'
import { supabase, formatDateVN } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import RepairTicketForm from '../components/RepairTicketForm'
import RecordFilterBar from '../components/RecordFilterBar'
import RepairItemsPreview from '../components/RepairItemsPreview'
import PaintOrderForm from '../components/PaintOrderForm'
import PaintOrdersTable from '../components/PaintOrdersTable'

const MAIN_TABS = [
  { key: 'vehicles', label: 'Tiếp nhận & Phiếu xe' },
  { key: 'paint', label: '🎨 Sơn xe mới' },
]

export default function AdvisorDashboard() {
  const [mainTab, setMainTab] = useState('vehicles')
  const [vehicles, setVehicles] = useState([])
  const [tasksByVehicle, setTasksByVehicle] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  async function loadVehicles({ silent = false } = {}) {
    if (!silent) setLoading(true)
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
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    loadVehicles()
    const channel = supabase.channel('advisor-live-vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, () => loadVehicles({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadVehicles({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_updates' }, () => loadVehicles({ silent: true }))
      .subscribe()
    const refreshTimer = window.setInterval(() => loadVehicles({ silent: true }), 5000)
    return () => {
      window.clearInterval(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles.filter(v => {
      if (status && v.status !== status) return false
      if (!q) return true
      return [v.license_plate, v.customer_name, v.customer_phone, v.scope_of_repair]
        .some(f => (f || '').toLowerCase().includes(q))
    })
  }, [vehicles, search, status])

  const [paintOrders, setPaintOrders] = useState([])
  const [paintFilter, setPaintFilter] = useState('all')

  async function loadPaintOrders() {
    const { data } = await supabase
      .from('paint_orders')
      .select('*, creator:created_by(full_name), handler:assigned_to(full_name)')
      .order('created_at', { ascending: false })
    setPaintOrders(data || [])
  }

  useEffect(() => {
    loadPaintOrders()
    const channel = supabase.channel('advisor-live-paint-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paint_orders' }, loadPaintOrders)
      .subscribe()
    const refreshTimer = window.setInterval(loadPaintOrders, 5000)
    return () => {
      window.clearInterval(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredPaint = paintFilter === 'all' ? paintOrders : paintOrders.filter(o => o.status === paintFilter)

  return (
    <div>
      {/* Main tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {MAIN_TABS.map(t => (
          <button key={t.key} type="button" className="btn" onClick={() => setMainTab(t.key)}
            style={{ fontSize: 14, border: 'none', padding: '8px 18px', borderRadius: 8, background: mainTab === t.key ? 'var(--surface-raised)' : 'transparent', color: mainTab === t.key ? 'var(--text)' : 'var(--text-muted)', fontWeight: mainTab === t.key ? 700 : 400 }}>
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'vehicles' && (
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
      )}

      {mainTab === 'paint' && (
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Sơn xe mới</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Tạo đơn sơn xe. Sau khi tạo, đơn sẽ tự động chuyển đến <strong style={{ color: 'var(--accent)' }}>Tổ sơn</strong>.</p>

          <div className="card" style={{ marginBottom: 28 }}>
            <PaintOrderForm onCreated={loadPaintOrders} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 18, margin: 0 }}>Danh sách đơn Sơn xe</h3>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
              {[{ k: 'all', l: 'Tất cả' }, { k: 'pending', l: 'Chờ xử lý' }, { k: 'in_progress', l: 'Đang sơn' }, { k: 'completed', l: 'Hoàn thành' }].map(f => (
                <button key={f.k} type="button" className="btn" onClick={() => setPaintFilter(f.k)}
                  style={{ fontSize: 12, border: 'none', padding: '4px 10px', background: paintFilter === f.k ? 'var(--surface-raised)' : 'transparent', color: paintFilter === f.k ? 'var(--text)' : 'var(--text-muted)', fontWeight: paintFilter === f.k ? 600 : 400 }}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <PaintOrdersTable orders={filteredPaint} onRefresh={loadPaintOrders} />
        </div>
      )}
    </div>
  )
}
