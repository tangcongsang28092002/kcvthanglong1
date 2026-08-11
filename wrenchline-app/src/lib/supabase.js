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
}

export const PAINT_ORDER_STATUSES = ['pending', 'in_progress', 'completed']

export const PAINT_STATUS_LABELS = {
  pending: 'Chờ xử lý',
  in_progress: 'Đang sơn',
  completed: 'Hoàn thành',
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
