import { formatTimeRangeVN } from '../lib/teams'

// Renders the breakdown of repair-item tasks belonging to one vehicle:
// description, accompanying parts (with đủ/thiếu status), assigned
// technical team, and the scheduled start/end window.
export default function RepairItemsPreview({ items, compact = false, hideDescription = false }) {
  if (!items || items.length === 0) {
    return <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Chưa có hạng mục</span>
  }

  return (
    <div className="repair-items-preview">
      {items.map((t) => {
        const range = formatTimeRangeVN(t.start_time, t.end_time)
        return (
          <div key={t.id} className="repair-item-row-preview">
            {!hideDescription && <div className="repair-item-row-preview-desc">{t.description}</div>}
            <div className="repair-item-row-preview-tags">
              {t.team && <span className="tag tag-team">{t.team}</span>}
              {t.parts_needed && (
                <span className={`tag ${t.parts_complete ? 'tag-parts-ok' : 'tag-parts-missing'}`}>
                  {t.parts_complete ? 'Đủ' : 'Thiếu'}: {t.parts_needed}
                </span>
              )}
              {range && <span className="tag tag-time">{range}</span>}
              {!compact && <span className="tag tag-task-status">{TASK_STATUS_LABELS[t.status] || t.status}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const TASK_STATUS_LABELS = { pending: 'Chờ xử lý', in_progress: 'Đang thực hiện', completed: 'Hoàn thành' }
