import { useState } from 'react'
import {
  PAINT_PRIORITY_LABELS,
  PAINT_PRIORITY_OPTIONS,
  PAINT_STATUS_LABELS,
  PAINT_STATUS_TONES,
  PAINT_ORDER_STATUSES,
  formatDateTimeVN,
  formatDateVN,
  supabase,
} from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { notifyPaintCompleted } from '../lib/notifications'

const legacyStatusMap = {
  pending: 'waiting',
  in_progress: 'painting',
  completed: 'done',
}

const editableFields = [
  { field: 'ngay_len_don', label: 'Ngày lên đơn *', type: 'date', required: true },
  { field: 'priority', label: 'Độ ưu tiên', type: 'select', options: PAINT_PRIORITY_OPTIONS },
  { field: 'time_in_workshop', label: 'Thời gian vào xưởng', type: 'datetime-local' },
  { field: 'time_out_workshop', label: 'Thời gian xuất xưởng', type: 'datetime-local' },
  { field: 'so_thung', label: 'Số thùng *', required: true },
  { field: 'model', label: 'Model' },
  { field: 'ten_thung', label: 'Tên thùng' },
  { field: 'so_khung', label: 'Số khung *', required: true },
  { field: 'so_khung_gac_tam', label: 'Số khung gác tạm' },
  { field: 'mo_ta', label: 'Mô tả' },
]

function normalizePaintStatus(status) {
  return legacyStatusMap[status] || status || 'waiting'
}

function toLocalDateTimeInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function toIsoOrNull(value) {
  return value ? new Date(value).toISOString() : null
}

function getEditValue(order, item) {
  if (item.type === 'datetime-local') return toLocalDateTimeInput(order[item.field])
  return order[item.field] || (item.field === 'priority' ? 'sequential' : '')
}

function PaintStatusBadge({ status }) {
  const normalized = normalizePaintStatus(status)
  const tone = PAINT_STATUS_TONES[normalized] || 'received'
  return <span className={`status-badge status-${tone}`}>{PAINT_STATUS_LABELS[normalized] || status}</span>
}

function PriorityBadge({ priority }) {
  const normalized = priority || 'sequential'
  const tone = normalized === 'do_first' ? 'var(--red)' : normalized === 'do_later' ? 'var(--blue)' : 'var(--text-muted)'
  const bg = normalized === 'do_first' ? 'var(--red-soft)' : normalized === 'do_later' ? 'var(--blue-soft)' : 'var(--surface-raised)'
  return (
    <span style={{ display: 'inline-flex', padding: '4px 9px', borderRadius: 999, background: bg, color: tone, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {PAINT_PRIORITY_LABELS[normalized] || normalized}
    </span>
  )
}

export default function PaintOrdersTable({ orders = [], onRefresh, showCurrentUserLabel = false }) {
  const { profile } = useAuth()
  const [processingId, setProcessingId] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  function openEdit(order) {
    setEditingOrder(order)
    setEditValues(Object.fromEntries(editableFields.map(item => [item.field, getEditValue(order, item)])))
    setEditError('')
  }

  async function saveEdit(event) {
    event.preventDefault()
    if (!editingOrder || !editValues.so_thung.trim() || !editValues.so_khung.trim() || !editValues.ngay_len_don) {
      setEditError('Ngày lên đơn, Số thùng và Số khung là bắt buộc.')
      return
    }

    const changes = {}
    for (const item of editableFields) {
      const value = editValues[item.field]
      if (item.type === 'datetime-local') {
        changes[item.field] = toIsoOrNull(value)
      } else {
        changes[item.field] = typeof value === 'string' ? value.trim() || null : value || null
      }
    }

    setSavingEdit(true)
    const { error } = await supabase.from('paint_orders').update(changes).eq('id', editingOrder.id)
    setSavingEdit(false)
    if (error) { setEditError(error.message); return }
    setEditingOrder(null)
    onRefresh?.()
  }

  async function deleteOrder(order) {
    if (!window.confirm(`Xóa đơn sơn ${order.so_thung || order.so_khung}? Thao tác này không thể hoàn tác.`)) return
    setProcessingId(order.id)
    const { error } = await supabase.from('paint_orders').delete().eq('id', order.id)
    setProcessingId(null)
    if (error) { alert(`Lỗi khi xóa đơn: ${error.message}`); return }
    onRefresh?.()
  }

  async function updateStatus(order, nextStatus) {
    const currentStatus = normalizePaintStatus(order.status)
    if (nextStatus === currentStatus) return

    const isHandler = order.assigned_to === profile?.id || !order.assigned_to || profile?.role === 'admin'
    if (nextStatus === 'done' && order.assigned_to && !isHandler) {
      alert(`Chỉ ${order.handler?.full_name || 'người đã nhận'} mới được chuyển trạng thái Xong.`)
      return
    }

    setProcessingId(order.id)
    try {
      const now = new Date().toISOString()
      const changes = { status: nextStatus }

      if ((nextStatus === 'polishing' || nextStatus === 'painting') && !order.time_in_workshop) {
        changes.time_in_workshop = now
      }
      if (nextStatus === 'painting' && !order.started_at) {
        changes.started_at = now
        changes.assigned_to = profile?.id || null
      }
      if (nextStatus === 'done') {
        changes.completed_at = order.completed_at || now
        changes.time_out_workshop = order.time_out_workshop || now
        if (!order.time_in_workshop) changes.time_in_workshop = now
        if (!order.assigned_to) changes.assigned_to = profile?.id || null
      }

      const { error } = await supabase.from('paint_orders').update(changes).eq('id', order.id)
      if (error) {
        alert(`Lỗi khi cập nhật trạng thái: ${error.message}`)
        return
      }

      if (nextStatus === 'done') notifyPaintCompleted({ ...order, ...changes })
      onRefresh?.()
    } finally {
      setProcessingId(null)
    }
  }

  function renderEditControl(item) {
    if (item.type === 'select') {
      return (
        <select
          name={`edit_${item.field}`}
          value={editValues[item.field] || 'sequential'}
          onChange={event => setEditValues(values => ({ ...values, [item.field]: event.target.value }))}
        >
          {item.options.map(option => (
            <option key={option} value={option}>{PAINT_PRIORITY_LABELS[option]}</option>
          ))}
        </select>
      )
    }

    return (
      <input
        name={`edit_${item.field}`}
        type={item.type || 'text'}
        aria-required={item.required || undefined}
        value={editValues[item.field] || ''}
        onChange={event => setEditValues(values => ({ ...values, [item.field]: event.target.value }))}
      />
    )
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
      <div className="record-table-wrap">
        <table className="record-table paint-orders-record-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>STT</th>
              <th>Ngày lên đơn</th>
              <th>Số thùng</th>
              <th>Model</th>
              <th>Tên thùng</th>
              <th>Số khung</th>
              <th>Số khung gác tạm</th>
              <th>Mô tả</th>
              <th>Độ ưu tiên</th>
              <th>Trạng thái</th>
              <th>Thời gian vào xưởng</th>
              <th>Thời gian xuất xưởng</th>
              <th>Người xử lý</th>
              <th>Tạo bởi</th>
              {profile?.role === 'admin' && <th style={{ minWidth: 132 }}>Quản lý</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => {
              const normalizedStatus = normalizePaintStatus(order.status)
              const isBusy = processingId === order.id
              const isMyOrder = order.assigned_to === profile?.id || profile?.role === 'admin'
              const handlerName = order.handler?.full_name || (order.assigned_to === profile?.id ? profile?.full_name : null)

              return (
                <tr key={order.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{index + 1}</td>
                  <td>{formatDateVN(order.ngay_len_don || order.created_at)}</td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{order.so_thung}</span></td>
                  <td style={{ fontWeight: 600 }}>{order.model || '—'}</td>
                  <td>{order.ten_thung || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{order.so_khung}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{order.so_khung_gac_tam || '—'}</td>
                  <td style={{ maxWidth: 200, color: 'var(--text-muted)' }}>{order.mo_ta || '—'}</td>
                  <td><PriorityBadge priority={order.priority} /></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
                      <PaintStatusBadge status={normalizedStatus} />
                      <select
                        value={normalizedStatus}
                        disabled={isBusy}
                        onChange={event => updateStatus(order, event.target.value)}
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--text)', fontSize: 12 }}
                      >
                        {PAINT_ORDER_STATUSES.map(status => <option key={status} value={status}>{PAINT_STATUS_LABELS[status]}</option>)}
                      </select>
                    </div>
                  </td>
                  <td>{formatDateTimeVN(order.time_in_workshop)}</td>
                  <td>{formatDateTimeVN(order.time_out_workshop)}</td>
                  <td>
                    {handlerName ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: isMyOrder ? 'var(--accent)' : 'var(--blue)', background: isMyOrder ? 'var(--accent-soft)' : 'var(--blue-soft)', padding: '3px 8px', borderRadius: 6, display: 'inline-block', whiteSpace: 'nowrap' }}>
                        👤 {handlerName} {showCurrentUserLabel && isMyOrder && '(Bạn)'}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>Chưa nhận</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{order.creator?.full_name || '—'}</td>
                  {profile?.role === 'admin' && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-ghost" onClick={() => openEdit(order)} style={{ fontSize: 12, padding: '6px 10px' }}>Sửa</button>
                        <button type="button" className="btn" disabled={isBusy} onClick={() => deleteOrder(order)} style={{ fontSize: 12, padding: '6px 10px', color: 'var(--red)', borderColor: 'var(--red)' }}>Xóa</button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="record-cards">
        {orders.map((order, index) => {
          const normalizedStatus = normalizePaintStatus(order.status)
          const isBusy = processingId === order.id
          const isMyOrder = order.assigned_to === profile?.id || profile?.role === 'admin'
          const handlerName = order.handler?.full_name || (order.assigned_to === profile?.id ? profile?.full_name : null)

          return (
            <div key={order.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>STT {index + 1} · {formatDateVN(order.ngay_len_don || order.created_at)}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{order.so_thung}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{order.model || '—'} — {order.ten_thung || '—'}</div>
                </div>
                <PaintStatusBadge status={normalizedStatus} />
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                <div>Số khung: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{order.so_khung}</span></div>
                {order.so_khung_gac_tam && <div>Gác tạm: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{order.so_khung_gac_tam}</span></div>}
                <div>Độ ưu tiên: <PriorityBadge priority={order.priority} /></div>
                <div>Vào xưởng: <span style={{ color: 'var(--text-muted)' }}>{formatDateTimeVN(order.time_in_workshop)}</span></div>
                <div>Xuất xưởng: <span style={{ color: 'var(--text-muted)' }}>{formatDateTimeVN(order.time_out_workshop)}</span></div>
                {handlerName && <div>Người xử lý: <span style={{ color: isMyOrder ? 'var(--accent)' : 'var(--blue)', fontWeight: 600 }}>{handlerName} {showCurrentUserLabel && isMyOrder && '(Bạn)'}</span></div>}
                {order.mo_ta && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{order.mo_ta}</div>}
              </div>

              <select
                value={normalizedStatus}
                disabled={isBusy}
                onChange={event => updateStatus(order, event.target.value)}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', marginBottom: profile?.role === 'admin' ? 10 : 0 }}
              >
                {PAINT_ORDER_STATUSES.map(status => <option key={status} value={status}>{PAINT_STATUS_LABELS[status]}</option>)}
              </select>

              {profile?.role === 'admin' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(order)} style={{ flex: 1, fontSize: 12 }}>Sửa đơn</button>
                  <button type="button" className="btn" disabled={isBusy} onClick={() => deleteOrder(order)} style={{ flex: 1, fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)' }}>Xóa đơn</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editingOrder && (
        <div className="paint-order-modal-backdrop" role="presentation" onMouseDown={() => setEditingOrder(null)}>
          <form className="card paint-order-edit-modal" onSubmit={saveEdit} onMouseDown={event => event.stopPropagation()} noValidate>
            <h3 style={{ margin: '0 0 16px', fontSize: 20 }}>Sửa đơn sơn</h3>
            <div className="paint-order-edit-fields">
              {editableFields.map(item => (
                <label key={item.field}>{item.label}
                  {renderEditControl(item)}
                </label>
              ))}
            </div>
            {editError && <p className="error-text" style={{ margin: '12px 0 0' }}>{editError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingOrder(null)}>Hủy</button>
              <button className="btn btn-accent" disabled={savingEdit}>{savingEdit ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
