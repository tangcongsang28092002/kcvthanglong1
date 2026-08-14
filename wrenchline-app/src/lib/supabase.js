import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

export const ROLES = {
  admin: 'Quản lý',
  service_advisor: 'Cố vấn dịch vụ',
  foreman: 'Tổ trưởng',
  technician: 'Kỹ thuật viên',
  paint_team: 'Tổ sơn',
  paint_customer: 'Khách hàng Sơn',
}

export const PAINT_ORDER_STATUSES = ['waiting', 'polishing', 'painting', 'done']

export const PAINT_STATUS_LABELS = {
  waiting: 'Đang chờ',
  polishing: 'Đang đánh bóng',
  painting: 'Đang sơn',
  done: 'Xong',
}

export const PAINT_STATUS_TONES = {
  waiting: 'received',
  polishing: 'quality_check',
  painting: 'in_repair',
  done: 'completed',
}

export const PAINT_PRIORITY_OPTIONS = ['do_first', 'do_later', 'sequential']

export const PAINT_PRIORITY_LABELS = {
  do_first: 'Ưu tiên làm trước',
  do_later: 'Làm sau ưu tiên',
  sequential: 'Làm tuần tự',
}

export const VEHICLE_STATUSES = [
  'received',
  'diagnosing',
  'in_repair',
  'quality_check',
  'completed',
  'delivered',
]

export const STATUS_LABELS = {
  received: 'Đã tiếp nhận',
  diagnosing: 'Đang chẩn đoán',
  in_repair: 'Đang sửa chữa',
  quality_check: 'Kiểm tra chất lượng',
  completed: 'Hoàn thành',
  delivered: 'Đã giao xe',
}

export const TIMEZONE = 'Asia/Ho_Chi_Minh'

export function formatDateVN(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('vi-VN', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTimeVN(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString('vi-VN', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function todaySaigon() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day}`
}
