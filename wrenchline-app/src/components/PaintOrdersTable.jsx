import { useState } from 'react'
import { supabase, formatDateTimeVN } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { notifyPaintCompleted } from '../lib/notifications'

export default function PaintOrdersTable({ orders = [], onRefresh }) {
  const { profile } = useAuth()
  const [processingId, setProcessingId] = useState(null)

  async function handleStart(order) {
    if (order.status !== 'pending') return
    setProcessingId(order.id)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('paint_orders')
        .update({
          status: 'in_progress',
          started_at: now,
          assigned_to: profile?.id || null,
        })
        .eq('id', order.id)

      if (error) {
        alert(`Lỗi khi bắt đầu: ${error.message}`)
      } else {
        onRefresh?.()
      }
    } finally {
      setProcessingId(null)
    }
  }

  async function handleComplete(order) {
    if (order.status === 'completed') return

    // Enforce rule: người bấm bắt đầu và bấm XONG là một người (hoặc Admin)
    const isHandler = order.assigned_to === profile?.id || profile?.role === 'admin'
    if (!isHandler) {
      alert(`Chỉ người đã bấm bắt đầu (${order.handler?.full_name || 'người được giao'}) mới có quyền bấm Xong!`)
      return
    }

    setProcessingId(order.id)
    try {
      const now = new Date().toISOString()
      const updatedOrder = {
        ...order,
        status: 'completed',
        completed_at: now,
      }

      const { error } = await supabase
        .from('paint_orders')
        .update({
          status: 'completed',
          completed_at: now,
        })
        .eq('id', order.id)

      if (error) {
        alert(`Lỗi khi hoàn thành: ${error.message}`)
      } else {
        // Trigger notification event to Management and Service Advisors
        notifyPaintCompleted(updatedOrder)
        onRefresh?.()
      }
    } finally {
      setProcessingId(null)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
        <div>Không có đơn sơn nào trong danh sách.</div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop / Laptop Table */}
      <div className="record-table-wrap">
        <table className="record-table">
          <thead>
            <tr>
              <th>Số thùng</th>
              <th>Model</th>
              <th>Tên thùng</th>
              <th>Số khung</th>
              <th>Số khung gác tạm</th>
              <th>Mô tả</th>
              <th>Người xử lý</th>
              <th>Tạo bởi</th>
              <th style={{ minWidth: 120 }}>Chờ xử lý</th>
              <th style={{ minWidth: 140 }}>Đang sơn</th>
              <th style={{ minWidth: 140 }}>Hoàn thành</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const isPending = order.status === 'pending'
              const isInProgress = order.status === 'in_progress'
              const isCompleted = order.status === 'completed'
              const isStarted = isInProgress || isCompleted
              const isBusy = processingId === order.id

              // Kiểm tra xem user hiện tại có phải người bấm Bắt đầu (hoặc Admin) không
              const isMyOrder = order.assigned_to === profile?.id || profile?.role === 'admin'
              const handlerName = order.handler?.full_name || (order.assigned_to === profile?.id ? profile?.full_name : null)

              return (
                <tr key={order.id}>
                  {/* 1. Số thùng */}
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                      {order.so_thung}
                    </span>
                  </td>

                  {/* 2. Model */}
                  <td style={{ fontWeight: 600 }}>{order.model}</td>

                  {/* 3. Tên thùng */}
                  <td>{order.ten_thung}</td>

                  {/* 4. Số khung */}
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{order.so_khung}</td>

                  {/* 5. Số khung gác tạm */}
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {order.so_khung_gac_tam || '—'}
                  </td>

                  {/* 6. Mô tả */}
                  <td style={{ maxWidth: 200, color: 'var(--text-muted)' }}>{order.mo_ta || '—'}</td>

                  {/* 7. CỘT MỚI: Người xử lý (hiển thị người thuộc Tổ sơn đã bấm Bắt đầu) */}
                  <td>
                    {handlerName ? (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isMyOrder ? 'var(--accent)' : 'var(--blue)',
                        background: isMyOrder ? 'var(--accent-soft)' : 'var(--blue-soft)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                      }}>
                        👤 {handlerName} {isMyOrder && '(Bạn)'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Chưa nhận
                      </span>
                    )}
                  </td>

                  {/* 8. Tạo bởi */}
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {order.creator?.full_name || '—'}
                  </td>

                  {/* 9. Cột CHỜ XỬ LÝ: chứa nút "Bắt đầu". Đổi màu tối lại và bị khóa khi đã kích hoạt */}
                  <td>
                    {isPending ? (
                      <button
                        type="button"
                        className="btn btn-accent"
                        disabled={isBusy}
                        onClick={() => handleStart(order)}
                        style={{
                          fontSize: 12,
                          padding: '6px 14px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(245, 180, 0, 0.25)',
                        }}
                      >
                        {isBusy ? 'Đang xử lý…' : '▶ Bắt đầu'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        style={{
                          fontSize: 12,
                          padding: '6px 14px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          background: 'var(--surface-raised)',
                          color: 'var(--text-dim)',
                          border: '1px solid var(--border-soft)',
                          borderRadius: 8,
                          cursor: 'not-allowed',
                          opacity: 0.7,
                        }}
                      >
                        Bắt đầu
                      </button>
                    )}
                  </td>

                  {/* 10. Cột ĐANG SƠN: hiển thị "Đang chờ" khi chưa bấm Bắt đầu; khi bấm Bắt đầu thì biến mất thay bằng Ngày Giờ */}
                  <td>
                    {!isStarted ? (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: 12 }}>
                        Đang chờ
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{
                          fontSize: 12,
                          color: 'var(--accent)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          ⏱ {formatDateTimeVN(order.started_at)}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* 11. Cột HOÀN THÀNH: chứa nút "Xong". Chỉ người đã bấm Bắt đầu mới bấm được nút Xong! */}
                  <td>
                    {isPending && (
                      <button
                        type="button"
                        disabled
                        style={{
                          fontSize: 12,
                          padding: '6px 14px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          background: 'var(--surface)',
                          color: 'var(--text-dim)',
                          border: '1px solid var(--border-soft)',
                          borderRadius: 8,
                          cursor: 'not-allowed',
                          opacity: 0.4,
                        }}
                      >
                        Xong
                      </button>
                    )}

                    {isInProgress && (
                      isMyOrder ? (
                        <button
                          type="button"
                          className="btn"
                          disabled={isBusy}
                          onClick={() => handleComplete(order)}
                          style={{
                            fontSize: 12,
                            padding: '6px 14px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            background: 'var(--green-soft)',
                            color: 'var(--green)',
                            border: '1px solid var(--green)',
                            cursor: 'pointer',
                          }}
                        >
                          {isBusy ? 'Đang lưu…' : '✓ Xong'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={`Chỉ ${handlerName || 'người nhận'} mới được bấm Xong`}
                          style={{
                            fontSize: 12,
                            padding: '6px 14px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            background: 'var(--surface-raised)',
                            color: 'var(--text-dim)',
                            border: '1px solid var(--border-soft)',
                            borderRadius: 8,
                            cursor: 'not-allowed',
                            opacity: 0.6,
                          }}
                        >
                          Xong ({handlerName || 'Khóa'})
                        </button>
                      )
                    )}

                    {isCompleted && (
                      <span style={{
                        fontSize: 12,
                        color: 'var(--green)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        ✓ {formatDateTimeVN(order.completed_at)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="record-cards">
        {orders.map(order => {
          const isPending = order.status === 'pending'
          const isInProgress = order.status === 'in_progress'
          const isCompleted = order.status === 'completed'
          const isStarted = isInProgress || isCompleted
          const isBusy = processingId === order.id

          const isMyOrder = order.assigned_to === profile?.id || profile?.role === 'admin'
          const handlerName = order.handler?.full_name || (order.assigned_to === profile?.id ? profile?.full_name : null)

          return (
            <div key={order.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>
                    {order.so_thung}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{order.model} — {order.ten_thung}</div>
                </div>

                {handlerName && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isMyOrder ? 'var(--accent)' : 'var(--blue)',
                    background: isMyOrder ? 'var(--accent-soft)' : 'var(--blue-soft)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    whiteSpace: 'nowrap',
                  }}>
                    👤 {handlerName}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                <div>Số khung: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{order.so_khung}</span></div>
                {order.so_khung_gac_tam && (
                  <div>Gác tạm: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{order.so_khung_gac_tam}</span></div>
                )}
                {order.mo_ta && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{order.mo_ta}</div>}
              </div>

              {/* 3 Step Process Bar for Mobile */}
              <div style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                {/* Step 1: Chờ xử lý */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Chờ xử lý:</span>
                  {isPending ? (
                    <button
                      type="button"
                      className="btn btn-accent"
                      disabled={isBusy}
                      onClick={() => handleStart(order)}
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      {isBusy ? 'Đang xử lý…' : '▶ Bắt đầu'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      style={{
                        fontSize: 12,
                        padding: '4px 12px',
                        background: 'var(--surface-raised)',
                        color: 'var(--text-dim)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: 6,
                        cursor: 'not-allowed',
                      }}
                    >
                      Bắt đầu
                    </button>
                  )}
                </div>

                {/* Step 2: Đang sơn */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderTop: '1px border-soft', paddingTop: 6 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Đang sơn:</span>
                  {!isStarted ? (
                    <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Đang chờ</span>
                  ) : (
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      ⏱ {formatDateTimeVN(order.started_at)}
                    </span>
                  )}
                </div>

                {/* Step 3: Hoàn thành */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, borderTop: '1px border-soft', paddingTop: 6 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Hoàn thành:</span>
                  {isPending && (
                    <button
                      type="button"
                      disabled
                      style={{
                        fontSize: 12,
                        padding: '4px 12px',
                        background: 'var(--surface)',
                        color: 'var(--text-dim)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: 6,
                        opacity: 0.4,
                      }}
                    >
                      Xong
                    </button>
                  )}
                  {isInProgress && (
                    isMyOrder ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={isBusy}
                        onClick={() => handleComplete(order)}
                        style={{
                          fontSize: 12,
                          padding: '4px 12px',
                          background: 'var(--green-soft)',
                          color: 'var(--green)',
                          border: '1px solid var(--green)',
                          fontWeight: 700,
                        }}
                      >
                        {isBusy ? 'Đang lưu…' : '✓ Xong'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Bởi {handlerName || 'người khác'}
                      </span>
                    )
                  )}
                  {isCompleted && (
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                      ✓ {formatDateTimeVN(order.completed_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
