import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { ROLES } from '../lib/supabase'
import VriPdiChecklist from './VriPdiChecklist'
import PaintNotificationToast from './PaintNotificationToast'

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('workshop') // 'workshop' | 'vri_pdi'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="no-print" style={{
        borderBottom: '1px solid var(--border-soft)',
        background: 'rgba(28,32,36,0.8)',
        backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div className="container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          minHeight: 64, height: 'auto', gap: 12, flexWrap: 'wrap', padding: '8px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                minWidth: 44, height: 34, padding: '0 8px', borderRadius: 8, background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-ink)', fontSize: 15,
                letterSpacing: '0.04em',
              }}>KCV</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>
                  ISUZU Thăng Long
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Quản lý quy trình xưởng
                </div>
              </div>
            </div>

            {profile && (
              <nav style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('workshop')}
                  className="btn"
                  style={{
                    fontSize: 13, border: 'none', padding: '6px 12px',
                    background: activeTab === 'workshop' ? 'var(--surface-raised)' : 'transparent',
                    color: activeTab === 'workshop' ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: activeTab === 'workshop' ? 600 : 400,
                  }}
                >
                  🚘 Theo dõi xưởng
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('vri_pdi')}
                  className="btn"
                  style={{
                    fontSize: 13, border: 'none', padding: '6px 12px',
                    background: activeTab === 'vri_pdi' ? 'var(--surface-raised)' : 'transparent',
                    color: activeTab === 'vri_pdi' ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: activeTab === 'vri_pdi' ? 600 : 400,
                  }}
                >
                  📋 Phiếu VRI / PDI
                </button>
              </nav>
            )}
          </div>

          {profile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{profile.full_name}</div>
                <span className="role-tag">{ROLES[profile.role]}</span>
              </div>
              <button className="btn btn-ghost" onClick={signOut}>Đăng xuất</button>
            </div>
          )}
        </div>
      </header>
      <main style={{ flex: 1, padding: activeTab === 'vri_pdi' ? '16px 0' : 0 }} className="container">
        {activeTab === 'vri_pdi' ? (
          <VriPdiChecklist onClose={() => setActiveTab('workshop')} />
        ) : (
          children
        )}
      </main>
      <PaintNotificationToast />
    </div>
  )
}

