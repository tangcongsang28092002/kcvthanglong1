import { useState } from 'react'
import { supabase, todaySaigon } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const emptyOrder = {
  so_thung: '',
  model: '',
  ten_thung: '',
  so_khung: '',
  so_khung_gac_tam: '',
  mo_ta: '',
}

export default function PaintOrderForm({ onCreated }) {
  const { profile } = useAuth()
  const [rows, setRows] = useState([{ ...emptyOrder, _key: Date.now() }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addRow() {
    setRows(prev => [...prev, { ...emptyOrder, _key: Date.now() + Math.random() }])
  }

  function removeRow(key) {
    if (rows.length === 1) return
    setRows(prev => prev.filter(r => r._key !== key))
  }

  function updateRow(key, field, value) {
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const validRows = rows.filter(r => r.so_thung.trim() && r.so_khung.trim())
    if (!validRows.length) { setError('Nhập ít nhất một dòng có Số thùng và Số khung.'); return }
    setSaving(true)
    const { error: err } = await supabase.from('paint_orders').insert(
      validRows.map(r => ({
        so_thung: r.so_thung.trim(),
        model: r.model.trim(),
        ten_thung: r.ten_thung.trim(),
        so_khung: r.so_khung.trim(),
        so_khung_gac_tam: r.so_khung_gac_tam.trim() || null,
        mo_ta: r.mo_ta.trim() || null,
        status: 'pending',
        assigned_team: 'Tổ sơn',
        created_by: profile.id,
        created_at: new Date().toISOString(),
      }))
    )
    setSaving(false)
    if (err) { setError(err.message); return }
    setRows([{ ...emptyOrder, _key: Date.now() }])
    onCreated?.()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 10, fontSize: 13, color: 'var(--text-muted)' }}>
        Lên đơn sơn xe mới. Sau khi tạo, đơn sẽ tự động chuyển đến <strong style={{ color: 'var(--accent)' }}>Tổ sơn</strong>.
      </div>

      {/* Table header */}
      <div style={{ overflowX: 'auto', marginBottom: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-raised)' }}>
              {['Số thùng *', 'Model', 'Tên thùng', 'Số khung *', 'Số khung gác tạm', 'Mô tả', ''].map((h, i) => (
                <th key={i} style={{
                  padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11,
                  textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row._key} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                {[
                  { field: 'so_thung', placeholder: 'HN0352/26-27', required: true },
                  { field: 'model', placeholder: 'FSR FSR90NE5' },
                  { field: 'ten_thung', placeholder: 'Thùng mui bạt sàn...' },
                  { field: 'so_khung', placeholder: 'RLEFSR90NT...' },
                  { field: 'so_khung_gac_tam', placeholder: 'Nếu có...' },
                  { field: 'mo_ta', placeholder: 'Sơn thùng màu XANH' },
                ].map(({ field, placeholder, required }) => (
                  <td key={field} style={{ padding: '4px 6px' }}>
                    <input
                      required={required}
                      value={row[field]}
                      onChange={e => updateRow(row._key, field, e.target.value)}
                      placeholder={placeholder}
                      style={{
                        width: '100%', minWidth: field === 'mo_ta' ? 160 : 110,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13,
                      }}
                    />
                  </td>
                ))}
                <td style={{ padding: '4px 6px' }}>
                  <button
                    type="button"
                    onClick={() => removeRow(row._key)}
                    disabled={rows.length === 1}
                    style={{
                      background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
                      opacity: rows.length === 1 ? 0.3 : 1,
                    }}
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" onClick={addRow} style={{ fontSize: 13, borderStyle: 'dashed' }}>
          + Thêm dòng
        </button>
        <div style={{ flex: 1 }} />
        {error && <span style={{ color: 'var(--red)', fontSize: 13 }}>{error}</span>}
        <button className="btn btn-accent" disabled={saving} style={{ fontSize: 13 }}>
          {saving ? 'Đang lưu…' : '🎨 Tạo đơn sơn'}
        </button>
      </div>
    </form>
  )
}
