import { useEffect, useState } from 'react'
import { PAINT_STATUS_LABELS, supabase } from '../lib/supabase'
import PaintOrdersTable from '../components/PaintOrdersTable'
import PaintPlanBoard from '../components/PaintPlanBoard'
import { useAuth } from '../lib/AuthContext'
import { withViewTransition } from '../lib/viewTransition'

export default function PaintTeamDashboard({ activeNavigation = 'workshop' }) {
  const { profile } = useAuth()
  const isPaintCustomer = profile?.role === 'paint_customer'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState(isPaintCustomer ? 'all' : 'active') // 'active' | 'completed' | 'all'

  async function loadOrders({ silent = false } = {}) {
    if (!silent) setLoading(true)
    setLoadError('')
    let query = supabase
      .from('paint_orders')
      .select('*, creator:created_by(full_name), handler:assigned_to(full_name)')
      .order('created_at', { ascending: false })
    if (filter === 'active') query = query.in('status', ['waiting', 'polishing', 'painting'])
    if (filter === 'completed') query = query.eq('status', 'done')
    const { data, error } = await query
    if (error) setLoadError(`Không thể tải đơn sơn: ${error.message}`)
    // Silent refreshes (status change, realtime update, polling) can shuffle
    // row order (e.g. a completed order drops to the bottom). Wrapping the
    // update in a view transition animates that move smoothly instead of
    // the list snapping/flickering. The initial, non-silent load still just
    // sets state directly since there's a loading screen either way.
    if (silent) {
      withViewTransition(() => setOrders(data || []))
    } else {
      setOrders(data || [])
    }
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    loadOrders()
    const channel = supabase.channel('paint-team-paint-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paint_orders' }, () => loadOrders({ silent: true }))
      .subscribe()

    // Fallback polling keeps multiple devices in sync when the Supabase
    // realtime publication has not yet been enabled on the project.
    const refreshTimer = window.setInterval(() => loadOrders({ silent: true }), 3000)
    return () => {
      window.clearInterval(refreshTimer)
      supabase.removeChannel(channel)
    }
  }, [filter])

  const waiting = orders.filter(o => o.status === 'waiting').length
  const painting = orders.filter(o => o.status === 'painting').length

  if (activeNavigation === 'plan') {
    return <div style={{ padding: '24px 0' }}><PaintPlanBoard orders={orders} loading={loading} error={loadError} /></div>
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 4 }}>Đơn sơn xe</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            {isPaintCustomer ? 'Theo dõi tiến độ các đơn sơn xe đang được xử lý tại xưởng.' : 'Danh sách đơn sơn xe được phân công cho Tổ sơn. Cập nhật trạng thái theo tiến độ thực tế của từng đơn.'}
          </p>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dim)' }}>{waiting}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{PAINT_STATUS_LABELS.waiting}</div>
          </div>
          <div className="card" style={{ padding: '10px 16px', textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{painting}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{PAINT_STATUS_LABELS.painting}</div>
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
      ) : loadError ? (
        <div className="card" style={{ color: 'var(--red)', padding: '16px 18px' }}>
          {loadError}
        </div>
      ) : (
        // silent: true here is the key fix — without it, every status
        // change / edit / delete inside the table called loadOrders() with
        // its default (non-silent) mode, which flips `loading` back on,
        // unmounts the whole table for the "Đang tải…" placeholder, then
        // remounts it. That unmount/remount is exactly what caused the
        // flicker and the scroll position jumping back to the top.
        <PaintOrdersTable orders={orders} onRefresh={() => loadOrders({ silent: true })} showCurrentUserLabel />
      )}
    </div>
  )
}
