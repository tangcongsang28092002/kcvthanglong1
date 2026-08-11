import { VEHICLE_STATUSES, STATUS_LABELS } from '../lib/supabase'

// Excel-style filter row shown above the vehicle table/cards: free-text
// search plus a status filter. Works the same on desktop (table) and
// mobile (cards) since both read from the same filtered list.
export default function RecordFilterBar({ search, onSearch, status, onStatus, resultCount }) {
  return (
    <div className="filter-bar">
      <input
        className="filter-search"
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Tìm theo biển số, khách hàng, SĐT, nội dung…"
      />
      <select value={status} onChange={e => onStatus(e.target.value)}>
        <option value="">Tất cả trạng thái</option>
        {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
      </select>
      <span className="filter-count">{resultCount} phiếu</span>
    </div>
  )
}
