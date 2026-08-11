import { useState } from 'react'
import { supabase, todaySaigon } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { REPAIR_TEAMS, emptyRepairItem } from '../lib/teams'

const emptyVehicle = {
  license_plate: '', customer_name: '', customer_phone: '',
  arrival_date: todaySaigon(),
  estimated_completion_date: '',
}

// Shared "lên phiếu sửa chữa" form. Used by both cố vấn dịch vụ and quản lý.
// Nội dung sửa chữa is a dynamic list of hạng mục (repair-item rows) the
// user can freely add/remove. Each row also carries its own phụ tùng đi kèm
// (with đủ/thiếu status) and its own tổ kỹ thuật viên + thời gian bắt đầu/kết thúc.
export default function RepairTicketForm({ onCreated }) {
  const { profile } = useAuth()
  const [vehicle, setVehicle] = useState(emptyVehicle)
  const [items, setItems] = useState([emptyRepairItem()])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function updateItem(key, patch) {
    setItems(items.map(it => (it.key === key ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems([...items, emptyRepairItem()])
  }

  function removeItem(key) {
    setItems(items.length === 1 ? items : items.filter(it => it.key !== key))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    const activeItems = items.filter(it => it.description.trim())
    if (activeItems.length === 0) {
      setError('Nhập ít nhất một hạng mục sửa chữa.')
      return
    }

    setSaving(true)
    const { data: createdVehicle, error: vErr } = await supabase.from('vehicles').insert({
      ...vehicle,
      estimated_completion_date: vehicle.estimated_completion_date || null,
      scope_of_repair: activeItems.map(it => it.description.trim()).join('; '),
      created_by: profile.id,
    }).select().single()

    if (vErr) { setSaving(false); setError(vErr.message); return }

    const { error: tErr } = await supabase.from('tasks').insert(activeItems.map(it => ({
      vehicle_id: createdVehicle.id,
      description: it.description.trim(),
      parts_needed: it.parts_needed.trim() || null,
      parts_complete: it.parts_complete,
      team: it.team.trim() || null,
      start_time: it.start_time || null,
      end_time: it.end_time || null,
      assigned_by: profile.id,
    })))

    setSaving(false)
    if (tErr) { setError(tErr.message); return }

    setVehicle(emptyVehicle)
    setItems([emptyRepairItem()])
    onCreated?.()
  }

  return (
    <form onSubmit={handleCreate} className="card">
      <div className="field">
        <label>Biển số xe</label>
        <input required value={vehicle.license_plate} onChange={e => setVehicle({ ...vehicle, license_plate: e.target.value.toUpperCase() })} placeholder="51F-123.45" />
      </div>
      <div className="field">
        <label>Tên khách hàng</label>
        <input required value={vehicle.customer_name} onChange={e => setVehicle({ ...vehicle, customer_name: e.target.value })} />
      </div>
      <div className="field">
        <label>Số điện thoại</label>
        <input required value={vehicle.customer_phone} onChange={e => setVehicle({ ...vehicle, customer_phone: e.target.value })} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label>Ngày vào xưởng</label>
          <input required type="date" value={vehicle.arrival_date} onChange={e => setVehicle({ ...vehicle, arrival_date: e.target.value })} />
        </div>
        <div className="field">
          <label>Dự kiến hoàn thành</label>
          <input type="date" value={vehicle.estimated_completion_date} onChange={e => setVehicle({ ...vehicle, estimated_completion_date: e.target.value })} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 8 }}>
        <label>Nội dung sửa chữa &amp; phân công tổ kỹ thuật viên</label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {items.map((it, idx) => (
          <div key={it.key} className="repair-item-card">
            <div className="repair-item-card-head">
              <span className="repair-item-index">Hạng mục {idx + 1}</span>
              <button type="button" className="btn-remove-item" onClick={() => removeItem(it.key)} disabled={items.length === 1} title="Xóa hạng mục">✕</button>
            </div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label>Nội dung công việc</label>
              <input value={it.description} onChange={e => updateItem(it.key, { description: e.target.value })} placeholder="Thay đèn pha, gò nắn nắp cabo…" />
            </div>

            <div className="repair-item-grid-2">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Phụ tùng đi kèm</label>
                <input value={it.parts_needed} onChange={e => updateItem(it.key, { parts_needed: e.target.value })} placeholder="Bóng đèn, keo dán…" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Tình trạng phụ tùng</label>
                <select value={it.parts_complete ? 'ok' : 'missing'} onChange={e => updateItem(it.key, { parts_complete: e.target.value === 'ok' })}>
                  <option value="ok">Đã đủ</option>
                  <option value="missing">Còn thiếu</option>
                </select>
              </div>
            </div>

            <div className="repair-item-grid-3">
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Tổ kỹ thuật viên</label>
                <input list="repair-teams" value={it.team} onChange={e => updateItem(it.key, { team: e.target.value })} placeholder="Chọn hoặc nhập tổ…" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Bắt đầu</label>
                <input type="datetime-local" value={it.start_time} onChange={e => updateItem(it.key, { start_time: e.target.value })} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Kết thúc</label>
                <input type="datetime-local" value={it.end_time} onChange={e => updateItem(it.key, { end_time: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <datalist id="repair-teams">
        {REPAIR_TEAMS.map(t => <option key={t} value={t} />)}
      </datalist>

      <button type="button" className="btn btn-ghost btn-add-item" onClick={addItem}>+ Thêm hạng mục sửa chữa</button>

      {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
      <button className="btn btn-accent" style={{ width: '100%', marginTop: 14 }} disabled={saving}>
        {saving ? 'Đang lưu…' : 'Tạo phiếu theo dõi'}
      </button>
    </form>
  )
}
