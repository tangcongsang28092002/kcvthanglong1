import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import { formatTimeRangeVN } from '../lib/teams'
import { useAuth } from '../lib/AuthContext'
import { notifyPaintCompleted } from '../lib/notifications'
import { withViewTransition } from '../lib/viewTransition'

const legacyStatusMap = {
  pending: 'waiting',
  in_progress: 'painting',
  completed: 'done',
}

const prioritySortOrder = {
  do_first: 0,
  sequential: 1,
  do_later: 2,
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

// Excel-style column filter: a small funnel button in the header that opens
// a checklist of the distinct values present in that column. Unchecking a
// value hides matching rows, same mental model as an Excel AutoFilter.
function ColumnFilterMenu({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const boxRef = useRef(null)
  const isActive = selected && selected.size > 0 && selected.size < options.length

  useEffect(() => {
    if (!open) return
    function onDocClick(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const shown = options.filter(o => o.toLowerCase().includes(search.trim().toLowerCase()))
  const allShownChecked = shown.length > 0 && shown.every(o => !selected || selected.size === 0 || selected.has(o))

  function toggleValue(value) {
    const next = new Set(selected && selected.size > 0 ? selected : options)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next.size === options.length ? new Set() : next)
  }

  function toggleAllShown() {
    const base = new Set(selected && selected.size > 0 ? selected : options)
    if (allShownChecked) shown.forEach(o => base.delete(o))
    else shown.forEach(o => base.add(o))
    onChange(base.size === options.length ? new Set() : base)
  }

  return (
    <span className="col-filter" ref={boxRef}>
      <button
        type="button"
        className={`col-filter-btn ${isActive ? 'col-filter-btn-active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label={`Lọc ${label}`}
        title={`Lọc ${label}`}
      >▾</button>
      {open && (
        <div className="col-filter-menu" onMouseDown={event => event.stopPropagation()}>
          <input
            className="col-filter-search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm giá trị…"
            autoFocus
          />
          <label className="col-filter-option col-filter-option-all">
            <input type="checkbox" checked={allShownChecked} onChange={toggleAllShown} />
            <span>Chọn tất cả</span>
          </label>
          <div className="col-filter-list">
            {shown.length === 0 && <div className="col-filter-empty">Không có giá trị</div>}
            {shown.map(option => (
              <label key={option} className="col-filter-option">
                <input
                  type="checkbox"
                  checked={!selected || selected.size === 0 || selected.has(option)}
                  onChange={() => toggleValue(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {isActive && (
            <button type="button" className="col-filter-clear" onClick={() => { onChange(new Set()); setSearch('') }}>
              Xóa lọc cột này
            </button>
          )}
        </div>
      )}
    </span>
  )
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

// The small grip icon that starts a drag. Only this element gets the
// dnd-kit listeners/attributes — not the whole row — so clicking the status
// dropdown, the edit button, etc. inside a row never gets mistaken for a
// drag gesture.
function DragHandle({ listeners, attributes, disabledReason }) {
  if (disabledReason) {
    return (
      <span className="paint-order-drag-handle paint-order-drag-handle-disabled" title={disabledReason} aria-hidden="true">
        ⠿
      </span>
    )
  }
  return (
    <button
      type="button"
      className="paint-order-drag-handle"
      title="Kéo để sắp xếp thứ tự"
      aria-label="Kéo để sắp xếp thứ tự"
      {...attributes}
      {...listeners}
    >⠿</button>
  )
}

// Wraps a <tr> with dnd-kit's sortable behavior. Rendered as a normal,
// non-sortable row when reordering isn't available right now (read-only
// role, a filter/search active, or the order is already Done) so the row
// still displays correctly, just without drag affordance.
function SortableTableRow({ id, disabled, disabledReason, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 1, background: 'var(--surface-raised)', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' } : null),
  }
  return (
    <tr ref={setNodeRef} style={style}>
      <td style={{ width: 28, textAlign: 'center' }}>
        <DragHandle listeners={listeners} attributes={attributes} disabledReason={disabled ? disabledReason : null} />
      </td>
      {children}
    </tr>
  )
}

// Card equivalent for the mobile layout.
function SortableCard({ id, disabled, disabledReason, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 1, boxShadow: '0 6px 20px rgba(0,0,0,0.22)' } : null),
  }
  return (
    <div ref={setNodeRef} style={style} className="card paint-order-sortable-card">
      <div className="paint-order-card-drag-row">
        <DragHandle listeners={listeners} attributes={attributes} disabledReason={disabled ? disabledReason : null} />
      </div>
      {children}
    </div>
  )
}

export default function PaintOrdersTable({ orders = [], onRefresh, showCurrentUserLabel = false }) {
  const { profile } = useAuth()
  const readOnly = profile?.role === 'paint_customer'
  const [processingId, setProcessingId] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  // Optimistic local override for sort_index while a drag is being saved to
  // the database, keyed by order id. Cleared once a fresh `orders` prop
  // arrives (see effect below), at which point the server's own sort_index
  // takes over — this just avoids the row snapping back and then forward
  // again while the update round-trips.
  const [pendingSortIndex, setPendingSortIndex] = useState({})
  const [reorderError, setReorderError] = useState('')
  useEffect(() => {
    setPendingSortIndex({})
  }, [orders])
  // Each entry is a Set of the exact display values that remain checked for
  // that column. An empty Set means "no filter applied" (everything shown),
  // matching the default state of an Excel AutoFilter.
  const [columnFilters, setColumnFilters] = useState({
    ngay: new Set(),
    so_thung: new Set(),
    xe: new Set(),
    so_khung: new Set(),
    priority: new Set(),
    status: new Set(),
    thoi_gian: new Set(),
    phu_trach: new Set(),
  })

  const rows = useMemo(() => orders.map(order => {
    const normalizedStatus = normalizePaintStatus(order.status)
    const handlerName = order.handler?.full_name || ''
    const creatorName = order.creator?.full_name || ''
    return {
      order,
      normalizedStatus,
      display: {
        ngay: formatDateVN(order.ngay_len_don || order.created_at),
        so_thung: order.so_thung || '—',
        xe: [order.model, order.ten_thung].filter(Boolean).join(' — ') || '—',
        so_khung: [order.so_khung, order.so_khung_gac_tam].filter(Boolean).join(' / ') || '—',
        mo_ta: order.mo_ta || '',
        priority: PAINT_PRIORITY_LABELS[order.priority || 'sequential'] || '',
        status: PAINT_STATUS_LABELS[normalizedStatus] || '',
        thoi_gian: formatTimeRangeVN(order.time_in_workshop, order.time_out_workshop) || '—',
        phu_trach: [handlerName, creatorName].filter(Boolean).join(' / ') || 'Chưa nhận',
      },
    }
  }), [orders])

  const filterOptions = useMemo(() => {
    const collect = key => Array.from(new Set(rows.map(r => r.display[key]))).sort((a, b) => a.localeCompare(b, 'vi'))
    return {
      ngay: collect('ngay'),
      so_thung: collect('so_thung'),
      xe: collect('xe'),
      so_khung: collect('so_khung'),
      priority: collect('priority'),
      status: collect('status'),
      thoi_gian: collect('thoi_gian'),
      phu_trach: collect('phu_trach'),
    }
  }, [rows])

  const visibleOrders = useMemo(() => {
    const q = quickSearch.trim().toLowerCase()
    return rows.filter(row => {
      if (q && !Object.values(row.display).some(value => String(value).toLowerCase().includes(q))) return false
      for (const key of Object.keys(columnFilters)) {
        const selected = columnFilters[key]
        if (selected.size > 0 && !selected.has(row.display[key])) return false
      }
      return true
    }).sort((a, b) => {
      // Completed orders are always kept below work that still needs attention.
      const aDone = a.normalizedStatus === 'done'
      const bDone = b.normalizedStatus === 'done'
      if (aDone !== bDone) return aDone ? 1 : -1

      // Manual drag-and-drop order wins whenever it's been set — dragging a
      // row is a deliberate choice and should take priority over the
      // automatic priority-tier ordering below. `pendingSortIndex` reflects
      // an in-flight drag that hasn't finished saving yet.
      const aIndex = pendingSortIndex[a.order.id] ?? a.order.sort_index
      const bIndex = pendingSortIndex[b.order.id] ?? b.order.sort_index
      if (aIndex != null && bIndex != null && aIndex !== bIndex) return aIndex - bIndex
      if (aIndex != null && bIndex == null) return -1
      if (aIndex == null && bIndex != null) return 1

      // Fallback for orders that have never been manually reordered:
      // "Ưu tiên làm trước" first, then newest first.
      const priorityDifference = (prioritySortOrder[a.order.priority || 'sequential'] ?? 1)
        - (prioritySortOrder[b.order.priority || 'sequential'] ?? 1)
      if (priorityDifference) return priorityDifference

      return new Date(b.order.created_at || 0) - new Date(a.order.created_at || 0)
    }).map(row => row.order)
  }, [rows, quickSearch, columnFilters, pendingSortIndex])

  // Drag-and-drop only reorders the active (not-done) queue — completed
  // orders are always pinned below it, so including them in the draggable
  // set would be confusing (dropping something "after" a Done order
  // wouldn't visibly do anything).
  const draggableOrders = useMemo(() => visibleOrders.filter(order => normalizePaintStatus(order.status) !== 'done'), [visibleOrders])
  const draggableIds = useMemo(() => draggableOrders.map(order => order.id), [draggableOrders])

  const hasActiveFilters = quickSearch || Object.values(columnFilters).some(set => set.size > 0)

  // Reordering is only well-defined against the full, unfiltered active
  // queue — if a search or column filter is hiding some rows, "drop above
  // this row" would silently reorder the hidden ones too. Simplest and
  // safest is to require filters cleared first, with an explanation on the
  // (still visible but disabled) drag handle.
  const dragDisabledReason = readOnly
    ? null // handles aren't rendered at all for read-only viewers, see below
    : hasActiveFilters
      ? 'Xóa bộ lọc / tìm kiếm để sắp xếp bằng kéo-thả'
      : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = draggableOrders.findIndex(o => o.id === active.id)
    const toIndex = draggableOrders.findIndex(o => o.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = arrayMove(draggableOrders, fromIndex, toIndex)
    const nextSortIndex = Object.fromEntries(reordered.map((order, index) => [order.id, (index + 1) * 10]))

    // Show the new order immediately (view transition smooths the slide);
    // don't wait on the network round-trip to feel responsive.
    withViewTransition(() => setPendingSortIndex(current => ({ ...current, ...nextSortIndex })))

    setReorderError('')
    const changed = reordered.filter(order => order.sort_index !== nextSortIndex[order.id])
    const { error } = await Promise.all(
      changed.map(order => supabase.from('paint_orders').update({ sort_index: nextSortIndex[order.id] }).eq('id', order.id))
    ).then(results => ({ error: results.find(r => r.error)?.error }))

    if (error) {
      setReorderError(`Không thể lưu thứ tự mới: ${error.message}`)
      setPendingSortIndex(current => {
        const next = { ...current }
        reordered.forEach(order => delete next[order.id])
        return next
      })
      return
    }

    onRefresh?.()
  }

  function updateColumnFilter(key, nextSet) {
    setColumnFilters(current => ({ ...current, [key]: nextSet }))
  }

  function clearFilters() {
    setQuickSearch('')
    setColumnFilters(current => Object.fromEntries(Object.keys(current).map(key => [key, new Set()])))
  }

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
    if (readOnly) return
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
        // An order no longer occupies a priority slot once it has been completed.
        changes.priority = 'sequential'
        if (!order.time_in_workshop) changes.time_in_workshop = now
        if (!order.assigned_to) changes.assigned_to = profile?.id || null
      }

      const { error } = await supabase.from('paint_orders').update(changes).eq('id', order.id)
      if (error) {
        alert(`Lỗi khi cập nhật trạng thái: ${error.message}`)
        return
      }

      // When the current high-priority work is finished, promote postponed
      // active orders so they move into the next work queue automatically.
      if (nextStatus === 'done') {
        const { error: promoteError } = await supabase
          .from('paint_orders')
          .update({ priority: 'do_first' })
          .eq('priority', 'do_later')
          .neq('status', 'done')
        if (promoteError) {
          alert(`Đơn đã chuyển sang Xong, nhưng chưa thể nâng ưu tiên các đơn chờ: ${promoteError.message}`)
        }
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
      <div className="paint-order-list-tools">
        <input
          value={quickSearch}
          onChange={event => setQuickSearch(event.target.value)}
          placeholder="Tìm nhanh theo số khung, số thùng, model, trạng thái..."
          aria-label="Tìm nhanh đơn sơn"
        />
        <span>{visibleOrders.length}/{orders.length} đơn</span>
        {hasActiveFilters && (
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>Xóa lọc</button>
        )}
        {!readOnly && !hasActiveFilters && (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Kéo ⠿ để sắp xếp thứ tự thủ công</span>
        )}
      </div>

      <div className="record-table-wrap">
        <table className="record-table paint-orders-record-table">
          <colgroup>
            {!readOnly && <col style={{ width: 28 }} />}
            {(profile?.role === 'admin'
              ? ['3%', '7%', '8%', '12%', '12%', '15%', '8%', '11%', '10%', '9%', '5%']
              : ['4%', '8%', '9%', '13%', '13%', '16%', '9%', '12%', '9%', '7%']
            ).map((width, index) => <col key={index} style={{ width }} />)}
          </colgroup>
          <thead>
            <tr>
              {!readOnly && <th aria-label="Kéo để sắp xếp thứ tự" />}
              <th>STT</th>
              <th>Ngày <ColumnFilterMenu label="Ngày" options={filterOptions.ngay} selected={columnFilters.ngay} onChange={next => updateColumnFilter('ngay', next)} /></th>
              <th>Số thùng <ColumnFilterMenu label="Số thùng" options={filterOptions.so_thung} selected={columnFilters.so_thung} onChange={next => updateColumnFilter('so_thung', next)} /></th>
              <th>Xe <ColumnFilterMenu label="Xe" options={filterOptions.xe} selected={columnFilters.xe} onChange={next => updateColumnFilter('xe', next)} /></th>
              <th>Số khung <ColumnFilterMenu label="Số khung" options={filterOptions.so_khung} selected={columnFilters.so_khung} onChange={next => updateColumnFilter('so_khung', next)} /></th>
              <th>Mô tả</th>
              <th>Ưu tiên <ColumnFilterMenu label="Ưu tiên" options={filterOptions.priority} selected={columnFilters.priority} onChange={next => updateColumnFilter('priority', next)} /></th>
              <th>Trạng thái <ColumnFilterMenu label="Trạng thái" options={filterOptions.status} selected={columnFilters.status} onChange={next => updateColumnFilter('status', next)} /></th>
              <th>Thời gian xưởng <ColumnFilterMenu label="Thời gian xưởng" options={filterOptions.thoi_gian} selected={columnFilters.thoi_gian} onChange={next => updateColumnFilter('thoi_gian', next)} /></th>
              <th>Phụ trách <ColumnFilterMenu label="Phụ trách" options={filterOptions.phu_trach} selected={columnFilters.phu_trach} onChange={next => updateColumnFilter('phu_trach', next)} /></th>
              {profile?.role === 'admin' && <th>Quản lý</th>}
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
              <tbody>
                {visibleOrders.map((order, index) => {
                  const normalizedStatus = normalizePaintStatus(order.status)
                  const isBusy = processingId === order.id
                  const isMyOrder = order.assigned_to === profile?.id || profile?.role === 'admin'
                  const handlerName = order.handler?.full_name || (order.assigned_to === profile?.id ? profile?.full_name : null)
                  const isDone = normalizedStatus === 'done'
                  const rowContent = (
                    <>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{index + 1}</td>
                      <td><span className="paint-date-highlight">{formatDateVN(order.ngay_len_don || order.created_at)}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{order.so_thung}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.model || '—'}</div>
                        {order.ten_thung && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.ten_thung}</div>}
                      </td>
                      <td>
                        <span className="paint-frame-highlight">{order.so_khung}</span>
                        {order.so_khung_gac_tam && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Gác tạm: {order.so_khung_gac_tam}</div>}
                      </td>
                      <td className="paint-desc-cell" title={order.mo_ta || ''}>{order.mo_ta || '—'}</td>
                      <td><PriorityBadge priority={order.priority} /></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <PaintStatusBadge status={normalizedStatus} />
                          {!readOnly && (
                            <select
                              value={normalizedStatus}
                              disabled={isBusy}
                              onChange={event => updateStatus(order, event.target.value)}
                              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--text)', fontSize: 12 }}
                            >
                              {PAINT_ORDER_STATUSES.map(status => <option key={status} value={status}>{PAINT_STATUS_LABELS[status]}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text)' }}>
                        <div>Vào: {formatDateTimeVN(order.time_in_workshop)}</div>
                        <div style={{ marginTop: 3 }}>Ra: {formatDateTimeVN(order.time_out_workshop)}</div>
                      </td>
                      <td>
                        {handlerName ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: isMyOrder ? 'var(--accent)' : 'var(--blue)', background: isMyOrder ? 'var(--accent-soft)' : 'var(--blue-soft)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                            👤 {handlerName} {showCurrentUserLabel && isMyOrder && '(Bạn)'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa nhận</span>
                        )}
                        {order.creator?.full_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Tạo bởi: {order.creator.full_name}</div>}
                      </td>
                      {profile?.role === 'admin' && (
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button type="button" className="btn btn-ghost" onClick={() => openEdit(order)} style={{ fontSize: 12, padding: '6px 10px' }}>Sửa</button>
                            <button type="button" className="btn" disabled={isBusy} onClick={() => deleteOrder(order)} style={{ fontSize: 12, padding: '6px 10px', color: 'var(--red)', borderColor: 'var(--red)' }}>Xóa</button>
                          </div>
                        </td>
                      )}
                    </>
                  )

                  if (readOnly) {
                    return <tr key={order.id} style={{ viewTransitionName: `paint-order-row-${order.id}` }}>{rowContent}</tr>
                  }
                  if (isDone) {
                    return (
                      <tr key={order.id} style={{ viewTransitionName: `paint-order-row-${order.id}` }}>
                        <td />
                        {rowContent}
                      </tr>
                    )
                  }
                  return (
                    <SortableTableRow key={order.id} id={order.id} disabled={!!dragDisabledReason} disabledReason={dragDisabledReason}>
                      {rowContent}
                    </SortableTableRow>
                  )
                })}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>
      {!readOnly && reorderError && <p className="error-text" style={{ marginTop: 8 }}>{reorderError}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
          <div className="record-cards">
            {visibleOrders.map((order, index) => {
              const normalizedStatus = normalizePaintStatus(order.status)
              const isBusy = processingId === order.id
              const isMyOrder = order.assigned_to === profile?.id || profile?.role === 'admin'
              const handlerName = order.handler?.full_name || (order.assigned_to === profile?.id ? profile?.full_name : null)
              const isDone = normalizedStatus === 'done'

              const cardBody = (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>STT {index + 1} · <span className="paint-date-highlight">{formatDateVN(order.ngay_len_don || order.created_at)}</span></div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{order.so_thung}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{order.model || '—'} — {order.ten_thung || '—'}</div>
                    </div>
                    <PaintStatusBadge status={normalizedStatus} />
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Số khung:</span> <span className="paint-frame-highlight">{order.so_khung}</span></div>
                    {order.so_khung_gac_tam && <div><span style={{ color: 'var(--text-muted)' }}>Gác tạm:</span> <span style={{ fontFamily: 'var(--font-mono)' }}>{order.so_khung_gac_tam}</span></div>}
                    <div><span style={{ color: 'var(--text-muted)' }}>Độ ưu tiên:</span> <PriorityBadge priority={order.priority} /></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Vào xưởng:</span> {formatDateTimeVN(order.time_in_workshop)}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Xuất xưởng:</span> {formatDateTimeVN(order.time_out_workshop)}</div>
                    {handlerName && <div><span style={{ color: 'var(--text-muted)' }}>Người xử lý:</span> <span style={{ color: isMyOrder ? 'var(--accent)' : 'var(--blue)', fontWeight: 600 }}>{handlerName} {showCurrentUserLabel && isMyOrder && '(Bạn)'}</span></div>}
                    {order.creator?.full_name && <div><span style={{ color: 'var(--text-muted)' }}>Tạo bởi:</span> {order.creator.full_name}</div>}
                    {order.mo_ta && <div style={{ paddingTop: 4, borderTop: '1px dashed var(--border-soft)' }}>{order.mo_ta}</div>}
                  </div>

                  {!readOnly && (
                    <select
                      value={normalizedStatus}
                      disabled={isBusy}
                      onChange={event => updateStatus(order, event.target.value)}
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', marginBottom: profile?.role === 'admin' ? 10 : 0 }}
                    >
                      {PAINT_ORDER_STATUSES.map(status => <option key={status} value={status}>{PAINT_STATUS_LABELS[status]}</option>)}
                    </select>
                  )}

                  {profile?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => openEdit(order)} style={{ flex: 1, fontSize: 12 }}>Sửa đơn</button>
                      <button type="button" className="btn" disabled={isBusy} onClick={() => deleteOrder(order)} style={{ flex: 1, fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)' }}>Xóa đơn</button>
                    </div>
                  )}
                </>
              )

              if (readOnly || isDone) {
                return (
                  <div key={order.id} className="card" style={{ padding: 14, viewTransitionName: `paint-order-card-${order.id}` }}>
                    {cardBody}
                  </div>
                )
              }

              return (
                <SortableCard key={order.id} id={order.id} disabled={!!dragDisabledReason} disabledReason={dragDisabledReason}>
                  {cardBody}
                </SortableCard>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {visibleOrders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', marginTop: 12 }}>
          Không tìm thấy đơn sơn phù hợp với bộ lọc hiện tại.
        </div>
      )}

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
