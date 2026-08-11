import { STATUS_LABELS } from '../lib/supabase'

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABELS[status] || status}</span>
}
