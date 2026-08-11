// Preset technical team names for the workshop. Stored as free text on
// tasks.team (with a <datalist> combobox) so an advisor/manager can either
// pick a common team or type a custom one without a schema change.
export const REPAIR_TEAMS = [
  'Tổ Gò',
 
  'Tổ Sơn',

  
  
 
]

export function emptyRepairItem() {
  return {
    key: crypto.randomUUID(),
    description: '',
    parts_needed: '',
    parts_complete: true,
    team: '',
    start_time: '',
    end_time: '',
  }
}

export function formatTimeRangeVN(start, end) {
  const fmt = (v) => {
    if (!v) return null
    const d = new Date(v)
    return d.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  }
  const s = fmt(start)
  const e = fmt(end)
  if (s && e) return `${s} → ${e}`
  if (s) return `Từ ${s}`
  if (e) return `Đến ${e}`
  return null
}
