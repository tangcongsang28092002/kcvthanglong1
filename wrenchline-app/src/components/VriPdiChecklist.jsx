import { useState, useId } from 'react'

const CHECKLIST_DATA = {
  noi_that: {
    title: 'NỘI THẤT',
    subtitle: '*Kiểm tra và sửa chữa khi cần thiết',
    items: [
      { id: 'nt_1', text: 'Ghế: tình trạng và hoạt động' },
      { id: 'nt_2', text: 'Dây đai an toàn' },
      { id: 'nt_3', text: 'Còi' },
      { id: 'nt_4', text: 'Vô lăng: hoạt động và cân chỉnh góc' },
      { id: 'nt_5', text: 'Chìa khóa' },
      { id: 'nt_6', text: 'Các đèn cảnh báo trên bảng điều khiển' },
      { id: 'nt_7', text: 'Đèn nội thất' },
      { id: 'nt_8', text: 'Đèn báo rẽ và đèn phanh tay' },
      { id: 'nt_9', text: 'Hệ thống gạt mưa & rửa kính' },
      { id: 'nt_10', text: 'Khởi động - tắt động cơ' },
      { id: 'nt_11', text: 'Cần sang số' },
      { id: 'nt_12', text: 'Ly hợp: hoạt động và hành trình' },
      { id: 'nt_13', text: 'Hệ thống đèn trước: độ cao & góc chiếu sáng' },
      { id: 'nt_14', text: 'Phụ kiện (nếu có trang bị)' },
      { id: 'nt_15', text: 'PTO:' },
      { id: 'nt_16', text: 'Phụ kiện 1:' },
      { id: 'nt_17', text: 'Phụ kiện 2:' },
      { id: 'nt_18', text: 'Phụ kiện 3:' },
    ]
  },
  van_hanh: {
    title: 'VẬN HÀNH',
    subtitle: '*Kiểm tra và sửa chữa khi cần thiết',
    items: [
      { id: 'vh_group_1', isGroupHeader: true, text: 'Hệ thống lái' },
      { id: 'vh_1', text: 'Vô lăng thẳng lái với bánh xe', indented: true },
      { id: 'vh_2', text: 'Trả lái', indented: true },
      { id: 'vh_3', text: 'Lệch lái', indented: true },
      { id: 'vh_4', text: 'Hành trình tự do', indented: true },
      { id: 'vh_5', text: 'Các tiếng kêu bất thường' },
      { id: 'vh_6', text: 'Bàn đạp phanh' },
      { id: 'vh_7', text: 'Hệ thống phanh khí xả' },
      { id: 'vh_group_2', isGroupHeader: true, text: 'Vận hành động cơ:' },
      { id: 'vh_8', text: 'Khi cầm chừng và vận hành ga tay', indented: true },
      { id: 'vh_9', text: 'Tăng tốc', indented: true },
      { id: 'vh_10', text: 'Thay đổi tốc độ động cơ', indented: true },
      { id: 'vh_11', text: 'Giảm tốc', indented: true },
      { id: 'vh_12', text: 'Màu khói', indented: true },
      { id: 'vh_13', text: 'Số A/T: tình trạng hoạt động, chuyển số' },
      { id: 'vh_14', text: 'Khởi động an toàn: Chỉ khởi động ở số N/P' },
    ]
  },
  ngoai_that: {
    title: 'NGOẠI THẤT',
    subtitle: '*Kiểm tra và sửa chữa khi cần thiết',
    items: [
      { id: 'ng_1', text: 'Lốp: áp suất và tình trạng' },
      { id: 'ng_2', text: 'Bánh xe: siết lực các bu-lông & đai ốc' },
      { id: 'ng_3', text: 'Decals, Logo, Thông tin tải trọng' },
      { id: 'ng_4', text: 'Cản & ốp hông: tình trạng lắp đặt' },
      { id: 'ng_group_1', isGroupHeader: true, text: 'Cửa:' },
      { id: 'ng_5', text: 'Tình trạng lắp', indented: true },
      { id: 'ng_6', text: 'Đóng - mở', indented: true },
      { id: 'ng_7', text: 'Kính cửa', indented: true },
      { id: 'ng_8', text: 'Khóa - mở khóa', indented: true },
      { id: 'ng_9', text: 'Gioăng', indented: true },
      { id: 'ng_10', text: 'Lốp dự phòng: tình trạng lắp và áp suất' },
      { id: 'ng_11', text: 'Dụng cụ thay lốp dự phòng: đầy đủ' },
      { id: 'ng_12', text: 'Tình trạng sơn' },
      { id: 'ng_13', text: 'Rò rỉ nước' },
      { id: 'ng_14', text: 'Thùng sau: Tình trạng lắp đặt và ngoại quang' },
      { id: 'ng_15', text: 'Bu-lông thùng: siết chặt' },
    ]
  },
  khoang_dong_co: {
    title: 'KHOANG ĐỘNG CƠ',
    subtitle: '*Kiểm tra và sửa chữa khi cần thiết',
    items: [
      { id: 'kdc_group_1', isGroupHeader: true, text: 'Kiểm tra các mức dung dịch và rò rỉ tại:' },
      { id: 'kdc_1', text: 'Động cơ', indented: true },
      { id: 'kdc_2', text: 'Hộp số', indented: true },
      { id: 'kdc_3', text: 'Hệ thống giải nhiệt', indented: true },
      { id: 'kdc_4', text: 'Hệ thống phanh', indented: true },
      { id: 'kdc_5', text: 'Nước rửa kính', indented: true },
      { id: 'kdc_6', text: 'Dầu trợ lực lái', indented: true },
      { id: 'kdc_7', text: 'Vi sai', indented: true },
      { id: 'kdc_8', text: 'Nhiên liệu', indented: true },
      { id: 'kdc_9', text: 'Hệ thống ống xả: siết chặt và hiệu chỉnh' },
      { id: 'kdc_10', text: 'Dây đai dẫn động: lực căng đai và hư hỏng' },
      { id: 'kdc_11', text: 'Bình acquy: tình trạng, điện áp, cọc bình' },
      { id: 'kdc_12', text: 'Bát và cổ dê cố định các đường dây & ống' },
      { id: 'kdc_13', text: 'Xả nước: bầu hơi và lọc nhiên liệu' },
      { id: 'kdc_14', text: 'Bộ khóa cabin' },
      { id: 'kdc_15', text: 'Bu-lông U lá nhíp: siết chặt' },
    ]
  },
  phan_chung: {
    title: 'PHẦN CHUNG',
    subtitle: null,
    items: [
      { id: 'pc_1', text: 'Hộc chứa đồ: sổ bảo hành và sổ HDSD' },
      { id: 'pc_2', text: 'Bộ chìa khóa' },
      { id: 'pc_3', text: 'Vệ sinh xe và thùng' },
      { id: 'pc_4', text: 'Các phụ kiện và dụng cụ theo xe' },
    ]
  },
  quy_trinh_ban_giao: {
    title: 'QUY TRÌNH BÀN GIAO XE',
    subtitle: null,
    items: [
      { id: 'bg_1', text: 'Điền đầy đủ tất cả thông tin vào sổ bảo hành, HDSD các chức năng và tư vấn chế độ bảo hành với khách hàng' },
      { id: 'bg_2', text: 'Giải thích lịch bảo dưỡng định kỳ' },
      { id: 'bg_3', text: 'Giải thích và HDSD các tùy chọn lắp thêm' },
      { id: 'bg_4', text: 'Tư vấn các thông tin khác (nếu có)' },
      { id: 'bg_5', text: 'Bản sao phiếu kiểm tra xe cho khách hàng' },
    ]
  },
  khac: {
    title: 'KHÁC',
    subtitle: null,
    items: [
      { id: 'kh_1', text: 'Phiếu Customer Care' },
      { id: 'kh_2', text: 'Sổ bảo hành & Sách hướng dẫn sử dụng' },
      { id: 'kh_3', text: 'Khác:' },
    ]
  }
}

export default function VriPdiChecklist({ vehicle, onClose }) {
  const today = new Date().toISOString().split('T')[0]

  // Form Fields State
  const [vehicleInfo, setVehicleInfo] = useState({
    vin: vehicle?.vin || '',
    model: vehicle?.model || vehicle?.brand || '',
    keyCode: '',
    engineNo: '',
    odo: vehicle?.odo || '',
    customerName: vehicle?.customer_name || '',
    customerAddress: '',
    customerPhone: vehicle?.customer_phone || '',
    truckType: '',
    dealerName: 'ISUZU THĂNG LONG',
    dealerAddress: 'Km6 - Bắc Thăng Long - Nội Bài, Phúc Thịnh, Hà Nội',
    deliveryDate: today,
    deliveredBy: '',
  })

  // Ratings State: map item.id -> 'tot' | 'hu_hong' | ''
  const [ratings, setRatings] = useState({})

  // Notes & Signatures State
  const [nonCompliantNotes, setNonCompliantNotes] = useState('')
  const [techSignDate, setTechSignDate] = useState(today)
  const [dealerSignDate, setDealerSignDate] = useState(today)
  const [customerSignDate, setCustomerSignDate] = useState(today)

  // Active tab on mobile
  const [activeTab, setActiveTab] = useState('noi_that')

  // Helper rating setters
  const setItemRating = (id, status) => {
    setRatings(prev => ({
      ...prev,
      [id]: prev[id] === status ? '' : status,
    }))
  }

  const setAllGood = () => {
    const newRatings = {}
    Object.values(CHECKLIST_DATA).forEach(section => {
      section.items.forEach(item => {
        if (!item.isGroupHeader) {
          newRatings[item.id] = 'tot'
        }
      })
    })
    setRatings(newRatings)
  }

  const resetAll = () => {
    setRatings({})
  }

  // Count stats
  let totalItems = 0
  let totCount = 0
  let huHongCount = 0

  Object.values(CHECKLIST_DATA).forEach(sec => {
    sec.items.forEach(item => {
      if (!item.isGroupHeader) {
        totalItems++
        if (ratings[item.id] === 'tot') totCount++
        if (ratings[item.id] === 'hu_hong') huHongCount++
      }
    })
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="vri-pdi-container">
      {/* SCREEN VIEW (Mobile / Tablet / Desktop Interactive Form) */}
      <div className="no-print screen-wrapper">
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '4px 8px', borderRadius: 6, background: 'var(--accent)', color: 'var(--accent-ink)',
                  fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-display)',
                }}>KCV</span>
                <h2 style={{ fontSize: 20, margin: 0 }}>PHIẾU KIỂM TRA VRI / PDI</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                Đại lý: <strong style={{ color: '#0056b3' }}>ISUZU THĂNG LONG</strong> — Km6 - Bắc Thăng Long - Nội Bài, Phúc Thịnh, Hà Nội
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={setAllGood} style={{ fontSize: 13, background: 'rgba(34, 197, 94, 0.15)', color: 'var(--green)' }}>
                ✓ Chọn tất cả Tốt
              </button>
              <button type="button" className="btn btn-ghost" onClick={resetAll} style={{ fontSize: 13 }}>
                🔄 Đặt lại
              </button>
              <button type="button" className="btn btn-accent" onClick={handlePrint} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                🖨️ In phiếu PDF
              </button>
              {onClose && (
                <button type="button" className="btn btn-ghost" onClick={onClose} style={{ fontSize: 13 }}>
                  ✖ Đóng
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="vri-section-tabs" style={{
            display: 'flex', gap: 16, flexWrap: 'wrap', background: 'var(--bg)', padding: '10px 14px',
            borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, marginBottom: 16,
          }}>
            <div>Tổng số hạng mục: <strong>{totalItems}</strong></div>
            <div style={{ color: 'var(--green)' }}>✓ Tốt: <strong>{totCount}</strong></div>
            <div style={{ color: '#ef4444' }}>✗ Hư hỏng: <strong>{huHongCount}</strong></div>
            <div style={{ color: 'var(--text-dim)' }}>Chưa kiểm tra: <strong>{totalItems - totCount - huHongCount}</strong></div>
          </div>

          {/* Vehicle & Customer Info Form */}
          <details open style={{ marginBottom: 16 }}>
            <summary style={{ fontWeight: 600, cursor: 'pointer', fontSize: 15, padding: '6px 0' }}>
              📋 Thông tin Xe, Khách hàng & Đại lý (Nhấp để ẩn/hiện)
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
              <div className="card" style={{ background: 'var(--surface-raised)', padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)' }}>THÔNG TIN XE</div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>VIN:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.vin} onChange={e => setVehicleInfo({ ...vehicleInfo, vin: e.target.value })} placeholder="Số VIN xe..." />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Model:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.model} onChange={e => setVehicleInfo({ ...vehicleInfo, model: e.target.value })} placeholder="Tên model xe..." />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Mã chìa khóa:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.keyCode} onChange={e => setVehicleInfo({ ...vehicleInfo, keyCode: e.target.value })} placeholder="Mã chìa..." />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Số động cơ:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.engineNo} onChange={e => setVehicleInfo({ ...vehicleInfo, engineNo: e.target.value })} placeholder="Số động cơ..." />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Số ODO (km):</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.odo} onChange={e => setVehicleInfo({ ...vehicleInfo, odo: e.target.value })} placeholder="Số km ODO..." />
                </div>
              </div>

              <div className="card" style={{ background: 'var(--surface-raised)', padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)' }}>THÔNG TIN KHÁCH HÀNG</div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Tên khách hàng:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.customerName} onChange={e => setVehicleInfo({ ...vehicleInfo, customerName: e.target.value })} placeholder="Họ và tên KH..." />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Địa chỉ:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.customerAddress} onChange={e => setVehicleInfo({ ...vehicleInfo, customerAddress: e.target.value })} placeholder="Địa chỉ KH..." />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Số điện thoại:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.customerPhone} onChange={e => setVehicleInfo({ ...vehicleInfo, customerPhone: e.target.value })} placeholder="SĐT KH..." />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Loại thùng:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.truckType} onChange={e => setVehicleInfo({ ...vehicleInfo, truckType: e.target.value })} placeholder="Thùng mui bạt, kín..." />
                </div>
              </div>

              <div className="card" style={{ background: 'var(--surface-raised)', padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#0056b3' }}>THÔNG TIN ĐẠI LÝ & BÀN GIAO</div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Đại lý:</label>
                  <input style={{ fontSize: 13, fontWeight: 600, color: '#0056b3' }} value={vehicleInfo.dealerName} readOnly />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12 }}>Ngày bàn giao:</label>
                  <input type="date" style={{ fontSize: 13 }} value={vehicleInfo.deliveryDate} onChange={e => setVehicleInfo({ ...vehicleInfo, deliveryDate: e.target.value })} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>Bàn giao bởi:</label>
                  <input style={{ fontSize: 13 }} value={vehicleInfo.deliveredBy} onChange={e => setVehicleInfo({ ...vehicleInfo, deliveredBy: e.target.value })} placeholder="Tên nhân viên bàn giao..." />
                </div>
              </div>
            </div>
          </details>

          {/* Section Navigation Tabs for Mobile */}
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, borderBottom: '1px solid var(--border)',
          }}>
            {Object.entries(CHECKLIST_DATA).map(([key, sec]) => {
              const secItems = sec.items.filter(i => !i.isGroupHeader)
              const secDone = secItems.filter(i => ratings[i.id]).length
              const isSelected = activeTab === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`btn vri-section-tab ${isSelected ? 'active' : ''}`}
                  style={{
                    fontSize: 12, padding: '6px 12px', borderRadius: 20, whiteSpace: 'nowrap',
                    background: isSelected ? 'var(--accent)' : 'var(--bg)',
                    color: isSelected ? 'var(--accent-ink)' : 'var(--text-main)',
                    border: '1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)'),
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  {sec.title} ({secDone}/{secItems.length})
                </button>
              )
            })}
          </div>

          {/* Active Section Interactive Checklist */}
          {Object.entries(CHECKLIST_DATA).map(([secKey, sec]) => {
            if (activeTab !== secKey) return null
            return (
              <div key={secKey} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, margin: 0, color: 'var(--accent)' }}>{sec.title}</h3>
                  {sec.subtitle && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{sec.subtitle}</span>}
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {sec.items.map(item => {
                    if (item.isGroupHeader) {
                      return (
                        <div key={item.id} style={{
                          fontWeight: 700, fontSize: 13, marginTop: 10, padding: '4px 8px',
                          background: 'var(--surface-raised)', borderRadius: 4, color: 'var(--text-dim)',
                        }}>
                          📌 {item.text}
                        </div>
                      )
                    }

                    const rating = ratings[item.id] || ''

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', background: 'var(--bg)', borderRadius: 8,
                          border: '1px solid ' + (rating === 'tot' ? 'rgba(34, 197, 94, 0.4)' : rating === 'hu_hong' ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'),
                          gap: 10,
                        }}
                      >
                        <span style={{
                          fontSize: 13, flex: '1 1 auto', minWidth: 0,
                          paddingLeft: item.indented ? 16 : 0,
                        }}>
                          {item.indented ? '• ' : ''}{item.text}
                        </span>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setItemRating(item.id, 'tot')}
                            style={{
                              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                              fontWeight: 700, fontSize: 13,
                              background: rating === 'tot' ? '#22c55e' : 'var(--surface-raised)',
                              color: rating === 'tot' ? '#ffffff' : 'var(--text-muted)',
                              boxShadow: rating === 'tot' ? '0 2px 4px rgba(34,197,94,0.3)' : 'none',
                            }}
                          >
                            ✓ Tốt
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemRating(item.id, 'hu_hong')}
                            style={{
                              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                              fontWeight: 700, fontSize: 13,
                              background: rating === 'hu_hong' ? '#ef4444' : 'var(--surface-raised)',
                              color: rating === 'hu_hong' ? '#ffffff' : 'var(--text-muted)',
                              boxShadow: rating === 'hu_hong' ? '0 2px 4px rgba(239,68,68,0.3)' : 'none',
                            }}
                          >
                            ✗ Hư hỏng
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Notes for Non-compliant items */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 6 }}>
              CÁC HẠNG MỤC KHÔNG ĐẠT (Ghi chú khi phát hiện các hư hỏng trong quá trình kiểm tra):
            </label>
            <textarea
              rows={3}
              style={{ width: '100%', fontSize: 13, padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}
              value={nonCompliantNotes}
              onChange={e => setNonCompliantNotes(e.target.value)}
              placeholder="Nhập chi tiết hư hỏng hoặc các hạng mục không đạt nếu có..."
            />
          </div>
        </div>
      </div>

      {/* PRINT VIEW (Exact 1:1 format matching CV - PHIẾU KIỂM TRA VRI & PDI.pdf) */}
      <div className="vri-pdi-print-doc">
        {/* Document Header Table */}
        <table className="pdi-table header-table">
          <tbody>
            <tr>
              <td style={{ width: '15%', textAlign: 'center', verticalAlign: 'middle', padding: '4px' }}>
                <div style={{ color: '#d97706', fontWeight: '900', fontSize: '13pt', lineHeight: 1 }}>ISUZU</div>
                <div style={{ fontWeight: 'bold', fontSize: '13pt', lineHeight: 1, marginTop: '2px' }}>CV</div>
              </td>
              <td style={{ width: '85%', textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
                <h1 style={{ fontSize: '14pt', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PHIẾU KIỂM TRA VRI / PDI
                </h1>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Info Box Table */}
        <table className="pdi-table info-table" style={{ marginTop: '-1px' }}>
          <thead>
            <tr>
              <th style={{ width: '33.33%' }}>THÔNG TIN XE</th>
              <th style={{ width: '33.33%' }}>THÔNG TIN KHÁCH HÀNG</th>
              <th style={{ width: '33.33%' }}>THÔNG TIN ĐẠI LÝ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="info-line"><span>VIN:</span> <strong>{vehicleInfo.vin}</strong></div>
                <div className="info-line"><span>Model:</span> <strong>{vehicleInfo.model}</strong></div>
                <div className="info-line"><span>Mã chìa khóa:</span> <strong>{vehicleInfo.keyCode}</strong></div>
                <div className="info-line"><span>Số động cơ:</span> <strong>{vehicleInfo.engineNo}</strong></div>
                <div className="info-line"><span>Số ODO:</span> <strong>{vehicleInfo.odo}</strong></div>
              </td>
              <td>
                <div className="info-line"><span>Tên:</span> <strong>{vehicleInfo.customerName}</strong></div>
                <div className="info-line"><span>Địa chỉ:</span> <strong>{vehicleInfo.customerAddress}</strong></div>
                <div className="info-line"><span>Số điện thoại:</span> <strong>{vehicleInfo.customerPhone}</strong></div>
                <div className="info-line"><span>Loại thùng:</span> <strong>{vehicleInfo.truckType}</strong></div>
              </td>
              <td>
                <div className="info-line"><span>Tên:</span> <strong style={{ color: '#0056b3' }}>{vehicleInfo.dealerName}</strong></div>
                <div className="info-line"><span>Địa chỉ:</span> <strong style={{ color: '#0056b3', fontSize: '7pt' }}>{vehicleInfo.dealerAddress}</strong></div>
                <div className="info-line"><span>Ngày bàn giao:</span> <strong>{vehicleInfo.deliveryDate}</strong></div>
                <div className="info-line"><span>Bàn giao bởi:</span> <strong>{vehicleInfo.deliveredBy}</strong></div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Legend */}
        <div style={{ fontSize: '8pt', margin: '2px 0 2px 2px', display: 'flex', gap: '15px' }}>
          <span>✓ Tốt</span>
          <span>✗ Hư hỏng</span>
        </div>

        {/* Main 3-Column Checklist Grid */}
        <table className="pdi-table main-grid-table">
          <tbody>
            <tr>
              {/* COLUMN 1 */}
              <td style={{ width: '34%', verticalAlign: 'top', padding: 0 }}>
                {/* NỘI THẤT */}
                <div className="sec-header">NỘI THẤT</div>
                <div className="sec-sub">*Kiểm tra và sửa chữa khi cần thiết</div>
                {CHECKLIST_DATA.noi_that.items.map(item => (
                  <div key={item.id} className="item-row">
                    <span className="item-text">{item.text}</span>
                    <span className="check-box">{ratings[item.id] === 'tot' ? '✓' : ratings[item.id] === 'hu_hong' ? '✗' : ''}</span>
                  </div>
                ))}

                {/* VẬN HÀNH */}
                <div className="sec-header" style={{ marginTop: '3px' }}>VẬN HÀNH</div>
                <div className="sec-sub">*Kiểm tra và sửa chữa khi cần thiết</div>
                {CHECKLIST_DATA.van_hanh.items.map(item => {
                  if (item.isGroupHeader) {
                    return <div key={item.id} className="group-header-row">{item.text}</div>
                  }
                  return (
                    <div key={item.id} className="item-row">
                      <span className={'item-text' + (item.indented ? ' indented' : '')}>{item.text}</span>
                      <span className="check-box">{ratings[item.id] === 'tot' ? '✓' : ratings[item.id] === 'hu_hong' ? '✗' : ''}</span>
                    </div>
                  )
                })}
              </td>

              {/* COLUMN 2 */}
              <td style={{ width: '33%', verticalAlign: 'top', padding: 0 }}>
                {/* NGOẠI THẤT */}
                <div className="sec-header">NGOẠI THẤT</div>
                <div className="sec-sub">*Kiểm tra và sửa chữa khi cần thiết</div>
                {CHECKLIST_DATA.ngoai_that.items.map(item => {
                  if (item.isGroupHeader) {
                    return <div key={item.id} className="group-header-row">{item.text}</div>
                  }
                  return (
                    <div key={item.id} className="item-row">
                      <span className={'item-text' + (item.indented ? ' indented' : '')}>{item.text}</span>
                      <span className="check-box">{ratings[item.id] === 'tot' ? '✓' : ratings[item.id] === 'hu_hong' ? '✗' : ''}</span>
                    </div>
                  )
                })}

                {/* KHOANG ĐỘNG CƠ */}
                <div className="sec-header" style={{ marginTop: '3px' }}>KHOANG ĐỘNG CƠ</div>
                <div className="sec-sub">*Kiểm tra và sửa chữa khi cần thiết</div>
                {CHECKLIST_DATA.khoang_dong_co.items.map(item => {
                  if (item.isGroupHeader) {
                    return <div key={item.id} className="group-header-row">{item.text}</div>
                  }
                  return (
                    <div key={item.id} className="item-row">
                      <span className={'item-text' + (item.indented ? ' indented' : '')}>{item.text}</span>
                      <span className="check-box">{ratings[item.id] === 'tot' ? '✓' : ratings[item.id] === 'hu_hong' ? '✗' : ''}</span>
                    </div>
                  )
                })}
              </td>

              {/* COLUMN 3 */}
              <td style={{ width: '33%', verticalAlign: 'top', padding: 0 }}>
                {/* PHẦN CHUNG */}
                <div className="sec-header">PHẦN CHUNG</div>
                {CHECKLIST_DATA.phan_chung.items.map(item => (
                  <div key={item.id} className="item-row">
                    <span className="item-text">{item.text}</span>
                    <span className="check-box">{ratings[item.id] === 'tot' ? '✓' : ratings[item.id] === 'hu_hong' ? '✗' : ''}</span>
                  </div>
                ))}

                {/* QUY TRÌNH BÀN GIAO XE */}
                <div className="sec-header" style={{ marginTop: '3px' }}>QUY TRÌNH BÀN GIAO XE</div>
                {CHECKLIST_DATA.quy_trinh_ban_giao.items.map(item => (
                  <div key={item.id} className="item-row">
                    <span className="item-text">{item.text}</span>
                    <span className="check-box">{ratings[item.id] === 'tot' ? '✓' : ratings[item.id] === 'hu_hong' ? '✗' : ''}</span>
                  </div>
                ))}

                {/* KHÁC */}
                <div className="sec-header" style={{ marginTop: '3px' }}>KHÁC</div>
                {CHECKLIST_DATA.khac.items.map(item => (
                  <div key={item.id} className="item-row">
                    <span className="item-text">{item.text}</span>
                    <span className="check-box">{ratings[item.id] === 'tot' ? '✓' : ratings[item.id] === 'hu_hong' ? '✗' : ''}</span>
                  </div>
                ))}

                {/* CÁC HẠNG MỤC KHÔNG ĐẠT */}
                <div className="sec-header" style={{ marginTop: '3px' }}>CÁC HẠNG MỤC KHÔNG ĐẠT</div>
                <div className="sec-sub">*Ghi chú khi phát hiện các hư hỏng trong quá trình kiểm tra</div>
                <div className="notes-box">
                  {nonCompliantNotes ? (
                    <div style={{ whiteSpace: 'pre-wrap', padding: '2px 4px', fontSize: '7.5pt' }}>{nonCompliantNotes}</div>
                  ) : (
                    <>
                      <div className="ruled-line" />
                      <div className="ruled-line" />
                      <div className="ruled-line" />
                      <div className="ruled-line" />
                      <div className="ruled-line" />
                      <div className="ruled-line" />
                    </>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom Signatures Table */}
        <table className="pdi-table signature-table" style={{ marginTop: '-1px' }}>
          <thead>
            <tr>
              <th style={{ width: '33.33%' }}>KỸ THUẬT VIÊN / TỔ TRƯỞNG / QUẢN ĐỐC</th>
              <th style={{ width: '33.33%' }}>CHỮ KÝ ĐẠI LÝ</th>
              <th style={{ width: '33.33%' }}>CHỮ KÝ KHÁCH HÀNG</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ height: '60px', verticalAlign: 'bottom', paddingBottom: '3px' }}>
                <div className="info-line"><span>Ngày:</span> <strong>{techSignDate}</strong></div>
              </td>
              <td style={{ height: '60px', verticalAlign: 'bottom', paddingBottom: '3px' }}>
                <div className="info-line"><span>Ngày:</span> <strong>{dealerSignDate}</strong></div>
              </td>
              <td style={{ height: '60px', verticalAlign: 'bottom', paddingBottom: '3px' }}>
                <div className="info-line"><span>Ngày:</span> <strong>{customerSignDate}</strong></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Embedded CSS for Print and Screen Layout */}
      <style>{`
        /* SCREEN HIDE PRINT DOC BY DEFAULT */
        .vri-pdi-print-doc {
          display: none;
        }

        /* PRINT STYLING - EXACT 1:1 A4 FIT MATCHING PDF */
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 5mm 5mm 5mm;
          }

          html, body, #root, main {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
            font-size: 7.5pt !important;
            line-height: 1.1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .container {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* Hide screen UI elements */
          header, nav, .no-print, .screen-wrapper, .btn {
            display: none !important;
          }

          /* Show Print Doc */
          .vri-pdi-print-doc {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            margin: 0 auto !important;
          }

          .pdi-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .pdi-table th, .pdi-table td {
            border: 1px solid #000000;
            padding: 1px 3px;
            font-size: 7.5pt;
            box-sizing: border-box;
          }

          .pdi-table th {
            background-color: #ffffff;
            font-weight: bold;
            text-align: center;
            font-size: 8pt;
          }

          .sec-header {
            font-weight: bold;
            font-size: 8pt;
            text-align: center;
            background-color: #f3f4f6 !important;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 1px 0;
            margin-top: 0;
          }

          .sec-sub {
            font-size: 6.5pt;
            font-style: italic;
            padding: 1px 2px;
          }

          .group-header-row {
            font-weight: bold;
            font-size: 7.5pt;
            padding: 1px 2px;
            margin-top: 1px;
          }

          .item-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5px 2px;
            border-bottom: 0.5px solid #d1d5db;
            font-size: 7pt;
            min-height: 11px;
          }

          .item-text {
            flex: 1;
            padding-right: 2px;
          }

          .item-text.indented {
            padding-left: 6px;
          }

          .check-box {
            display: inline-block;
            width: 9px;
            height: 9px;
            border: 1px solid #000;
            text-align: center;
            line-height: 8px;
            font-weight: bold;
            font-size: 6.5pt;
            flex-shrink: 0;
          }

          .info-line {
            display: flex;
            justify-content: space-between;
            font-size: 7.5pt;
            margin-bottom: 0px;
            border-bottom: 1px dotted #ccc;
          }

          .info-line span {
            color: #111;
          }

          .notes-box {
            min-height: 80px;
            border-top: 1px solid #000;
          }

          .ruled-line {
            height: 13px;
            border-bottom: 1px dotted #999;
          }
        }
      `}</style>
    </div>
  )
}
