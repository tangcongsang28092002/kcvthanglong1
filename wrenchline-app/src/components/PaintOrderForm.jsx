import { useState } from 'react'
import { PAINT_PRIORITY_LABELS, PAINT_PRIORITY_OPTIONS, supabase, todaySaigon } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const emptyOrder = { ngay_len_don: todaySaigon(), priority: 'sequential', so_thung: '', model: '', ten_thung: '', so_khung: '', so_khung_gac_tam: '', mo_ta: '' }
const fields = [
  { field: 'ngay_len_don', label: 'Ngày lên đơn *', type: 'date', required: true },
  { field: 'priority', label: 'Độ ưu tiên', type: 'select', options: PAINT_PRIORITY_OPTIONS },
  { field: 'so_thung', label: 'Số thùng *', placeholder: 'HN0352/26-27', required: true },
  { field: 'model', label: 'Model', placeholder: 'FSR FSR90NE5' },
  { field: 'ten_thung', label: 'Tên thùng', placeholder: 'Thùng mui bạt sàn...' },
  { field: 'so_khung', label: 'Số khung *', placeholder: 'RLEFSR90NT...', required: true },
  { field: 'so_khung_gac_tam', label: 'Số khung gác tạm', placeholder: 'Nếu có...' },
  { field: 'mo_ta', label: 'Mô tả', placeholder: 'Sơn thùng màu xanh' },
]

export default function PaintOrderForm({ onCreated }) {
  const { profile } = useAuth()
  const [rows, setRows] = useState([{ ...emptyOrder, _key: Date.now() }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addRow = () => setRows(prev => [...prev, { ...emptyOrder, _key: Date.now() + Math.random() }])
  const removeRow = (key) => setRows(prev => prev.length === 1 ? prev : prev.filter(row => row._key !== key))
  const updateRow = (key, field, value) => setRows(prev => prev.map(row => row._key === key ? { ...row, [field]: value } : row))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const validRows = rows.filter(row => row.ngay_len_don && row.so_thung.trim() && row.so_khung.trim())
    if (!validRows.length) {
      setError('Nhập ít nhất một dòng có Ngày lên đơn, Số thùng và Số khung.')
      return
    }

    setSaving(true)
    const { error: saveError } = await supabase.from('paint_orders').insert(validRows.map(row => ({
      ...Object.fromEntries(Object.entries(row).filter(([key]) => key !== '_key').map(([key, value]) => [key, value.trim() || null])),
      status: 'waiting',
      assigned_team: 'Tổ sơn',
      created_by: profile.id,
      created_at: new Date(`${row.ngay_len_don}T12:00:00`).toISOString(),
    })))
    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    setRows([{ ...emptyOrder, _key: Date.now() }])
    onCreated?.()
  }

  function renderInput(row, item, prefix) {
    if (item.type === 'select') {
      return (
        <select
          name={`${prefix}_${item.field}_${row._key}`}
          value={row[item.field]}
          onChange={event => updateRow(row._key, item.field, event.target.value)}
        >
          {item.options.map(option => (
            <option key={option} value={option}>{PAINT_PRIORITY_LABELS[option]}</option>
          ))}
        </select>
      )
    }

    return (
      <input
        name={`${prefix}_${item.field}_${row._key}`}
        type={item.type || 'text'}
        aria-required={item.required || undefined}
        value={row[item.field]}
        onChange={event => updateRow(row._key, item.field, event.target.value)}
        placeholder={item.placeholder}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="paint-order-form" noValidate>
      <p className="paint-order-intro">
        Lên đơn sơn xe mới. Sau khi tạo, đơn sẽ tự động chuyển đến <strong>Tổ sơn</strong>.
      </p>

      <div className="paint-order-table-wrap">
        <table className="paint-order-table">
          <thead>
            <tr>{fields.map(item => <th key={item.field}>{item.label}</th>)}<th /></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row._key}>
                {fields.map(item => <td key={item.field}>{renderInput(row, item, 'paint')}</td>)}
                <td>
                  <button type="button" className="btn-remove-item" onClick={() => removeRow(row._key)} disabled={rows.length === 1} aria-label="Xóa dòng">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="paint-order-cards">
        {rows.map((row, index) => (
          <div className="paint-order-card" key={row._key}>
            <div className="paint-order-card-heading">
              <strong>Đơn sơn {index + 1}</strong>
              <button type="button" className="btn-remove-item" onClick={() => removeRow(row._key)} disabled={rows.length === 1} aria-label="Xóa dòng">×</button>
            </div>
            <div className="paint-order-fields">
              {fields.map(item => (
                <label key={item.field}>
                  {item.label}
                  {renderInput(row, item, 'paint_mobile')}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="paint-order-actions">
        <button type="button" className="btn btn-ghost" onClick={addRow}>+ Thêm dòng</button>
        {error && <span className="error-text">{error}</span>}
        <button className="btn btn-accent" disabled={saving}>{saving ? 'Đang lưu…' : '🎨 Tạo đơn sơn'}</button>
      </div>
    </form>
  )
}
