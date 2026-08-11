import { useEffect, useState } from 'react'
import { subscribePaintNotifications } from '../lib/notifications'
import { formatDateTimeVN } from '../lib/supabase'

export default function PaintNotificationToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const unsubscribe = subscribePaintNotifications((payload) => {
      const id = Date.now() + Math.random()
      const newToast = { id, ...payload }
      setToasts(prev => [newToast, ...prev])

      // Auto dismiss after 8 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 8000)
    })

    return unsubscribe
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 380,
      width: 'calc(100vw - 32px)',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          pointerEvents: 'auto',
          background: 'var(--surface-raised)',
          border: '1px solid var(--green)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          borderRadius: 12,
          padding: '14px 16px',
          color: 'var(--text)',
          animation: 'slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          <div style={{
            fontSize: 24,
            lineHeight: 1,
            padding: 6,
            background: 'var(--green-soft)',
            borderRadius: 8,
          }}>🎨</div>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              marginBottom: 4,
            }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--green)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Thông báo Sơn xe
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {formatDateTimeVN(t.timestamp)}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
              {t.message}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Số thùng: <strong>{t.order?.so_thung}</strong> — Model: {t.order?.model}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: 16,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
          >✕</button>
        </div>
      ))}

      <style>{`
        @keyframes slideInToast {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
