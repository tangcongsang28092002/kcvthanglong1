import { PAINT_STATUS_LABELS, PAINT_STATUS_TONES, formatDateTimeVN } from '../lib/supabase'

const legacyStatusMap = { pending: 'waiting', in_progress: 'painting', completed: 'done' }

function PlanProgress({ status }) {
  const normalized = legacyStatusMap[status] || status || 'waiting'
  const tone = PAINT_STATUS_TONES[normalized] || 'received'
  return <span className={`status-badge status-${tone}`}>{PAINT_STATUS_LABELS[normalized] || 'Đang chờ'}</span>
}

// Bảng này dùng dữ liệu của đơn sơn hiện có. Những thông tin chưa được khai báo
// trên đơn được đánh dấu rõ ràng thay vì tự suy đoán dữ liệu.
export default function PaintPlanBoard({ orders = [], loading, error }) {
  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Đang tải…</p>
  if (error) return <div className="card" style={{ color: 'var(--red)' }}>{error}</div>

  return (
    <section>
      <div className="plan-board-heading">
        <div>
          <h2>Bảng kế hoạch sơn xe</h2>
          <p>Theo dõi thời gian, phụ tùng và tiến độ chung của từng đơn sơn.</p>
        </div>
        <span>{orders.length} đơn</span>
      </div>
      <div className="plan-table-wrap">
        <table className="plan-table">
          <thead>
            <tr>
              <th>Biển số xe</th>
              <th>Khách hàng</th>
              <th>Bảo hiểm</th>
              <th>Nội dung công việc</th>
              <th>Thời gian vào</th>
              <th>Thời gian xe ra</th>
              <th>Tình trạng phụ tùng</th>
              <th>Tiến độ chung</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td><strong>{order.so_thung || '—'}</strong><small>{order.model || 'Chưa có biển số'}</small></td>
                <td>Chưa cập nhật</td>
                <td>Chưa cập nhật</td>
                <td className="plan-work-cell">{order.mo_ta || order.ten_thung || '—'}</td>
                <td>{formatDateTimeVN(order.time_in_workshop)}</td>
                <td>{formatDateTimeVN(order.time_out_workshop)}</td>
                <td>Chưa cập nhật</td>
                <td><PlanProgress status={order.status} /></td>
                <td>{order.so_khung_gac_tam ? `Gác tạm: ${order.so_khung_gac_tam}` : '—'}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan="9" className="plan-empty">Chưa có đơn sơn để lập kế hoạch.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
