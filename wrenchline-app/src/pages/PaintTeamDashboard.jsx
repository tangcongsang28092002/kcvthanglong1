import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import PaintOrdersTable from '../components/PaintOrdersTable'

export default function PaintTeamDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active') // 'active' | 'completed' | 'all'

  async function loadOrders() {
    setLoading(true)
    let query = supabase
      .from('paint_orders')
      .select('*, creator:created_by(full_name), handler:assigned_to(full_name)')
      .order('created_at', { ascending: false })
    if (filter === 'active') query = query.in('status', ['pending', 'in_progress'])
    if (filter === 'completed') query = query.eq('status', 'completed')
    const { data } = await query
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [filter])

  const pending = orders.filter(o => o.status === 'pending').length
  const inProgress = orders.filter(o => o.status === 'in_progress').length

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Đơn sơn xe</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Danh sách đơn sơn xe được phân công cho Tổ sơn. Bấm <strong>▶ Bắt đầu</strong> khi tiến hành sơn, bấm <strong>✓ Xong</strong> khi hoàn thành.
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dim)' }}>{pending}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chờ xử lý</div>
          </div>
          <div className="card" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{inProgress}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đang sơn</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16, width: 'fit-content' }}>
        {[
          { key: 'active', label: '🔧 Đang hoạt động' },
          { key: 'completed', label: '✓ Đã hoàn thành' },
          { key: 'all', label: '📋 Tất cả' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className="btn"
            style={{
              fontSize: 13, border: 'none', padding: '6px 14px',
              background: filter === tab.key ? 'var(--surface-raised)' : 'transparent',
              color: filter === tab.key ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: filter === tab.key ? 600 : 400,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Đang tải…</p>
      ) : (
        <PaintOrdersTable orders={orders} onRefresh={loadOrders} />
      )}
    </div>
  )
}

