export const REPAIR_TEAMS = [
  'Tổ kỹ thuật viên',
  'Tổ sơn',
  'Tổ gò',
  'Gia công',
]

export function teamFromWorkCode(workCode) {
  const prefix = String(workCode || '').trim().slice(0, 2)
  if (prefix === '01' || prefix === '02') return 'Tổ kỹ thuật viên'
  if (prefix === '03') return 'Tổ sơn'
  if (prefix === '04') return 'Tổ gò'
  if (prefix === '05') return 'Gia công'
  return ''
}

export function emptyRepairItem() {
  return {
    key: crypto.randomUUID(),
    work_code: '',
    description: '',
    parts_needed: '',
    parts_complete: true,
    team: '',
    start_time: '',
    end_time: '',
  }
}

export function formatTimeRangeVN(start, end) {
  const fmt = (value) => {
    if (!value) return null
    return new Date(value).toLocaleString('vi-VN', {
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
