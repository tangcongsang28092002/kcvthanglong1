import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { ROLES } from '../lib/supabase'
import VriPdiChecklist from './VriPdiChecklist'
import PaintNotificationToast from './PaintNotificationToast'

const NAV_ITEMS = [
  { key: 'workshop', icon: '▦', label: 'Điều hành xưởng', hint: 'Xe, phiếu & công việc' },
  { key: 'vri_pdi', icon: '✓', label: 'Phiếu VRI / PDI', hint: 'Kiểm tra chất lượng' },
]

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('workshop')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  function navigate(tab) {
    setActiveTab(tab)
    setMobileOpen(false)
  }

  return (
    <div className={`app-shell ${collapsed ? 'app-shell-collapsed' : ''}`}>
      <aside className={`app-sidebar ${mobileOpen ? 'app-sidebar-open' : ''}`}>
        <div className="app-brand">
          <div className="app-brand-mark">KCV</div>
          <div className="app-brand-copy"><strong>ISUZU Thăng Long</strong><span>WORKSHOP CONTROL</span></div>
          <button type="button" className="sidebar-collapse" onClick={() => setCollapsed(value => !value)} aria-label="Ẩn hoặc hiện menu">‹</button>
        </div>

        <nav className="app-nav" aria-label="Điều hướng chính">
          <p className="app-nav-label">Điều hướng</p>
          {NAV_ITEMS.map(item => <button key={item.key} type="button" className={`app-nav-item ${activeTab === item.key ? 'active' : ''}`} onClick={() => navigate(item.key)} title={item.label}>
            <span className="app-nav-icon">{item.icon}</span>
            <span className="app-nav-copy"><strong>{item.label}</strong><small>{item.hint}</small></span>
          </button>)}
        </nav>

        {profile && <div className="app-sidebar-user">
          <div className="avatar">{profile.full_name?.slice(0, 1)?.toUpperCase() || 'U'}</div>
          <div className="app-user-copy"><strong>{profile.full_name}</strong><span>{ROLES[profile.role]}</span></div>
          <button type="button" className="signout-icon" onClick={signOut} title="Đăng xuất" aria-label="Đăng xuất">↪</button>
        </div>}
      </aside>

      {mobileOpen && <button className="app-sidebar-backdrop" type="button" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />}
      <div className="app-content">
        <header className="app-topbar no-print">
          <button type="button" className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Mở menu">☰</button>
          <div><p className="topbar-kicker">{activeTab === 'workshop' ? 'ĐIỀU HÀNH VẬN HÀNH' : 'KIỂM TRA CHẤT LƯỢNG'}</p><h1>{activeTab === 'workshop' ? 'Xưởng dịch vụ' : 'Phiếu VRI / PDI'}</h1></div>
          <div className="topbar-actions"><span className="live-dot">Trực tuyến</span><button type="button" className="btn btn-ghost topbar-signout" onClick={signOut}>Đăng xuất</button></div>
        </header>
        <main className="app-main">
          {activeTab === 'vri_pdi' ? <VriPdiChecklist onClose={() => navigate('workshop')} /> : children}
        </main>
      </div>
      <PaintNotificationToast />
    </div>
  )
}
