import { useState } from 'react'
import { supabase } from '../lib/supabase'

const SIGNUP_ROLES = [
  { value: 'service_advisor', label: 'Cố vấn dịch vụ' },
  { value: 'foreman', label: 'Tổ trưởng' },
  { value: 'technician', label: 'Kỹ thuật viên' },
  { value: 'paint_customer', label: 'Khách hàng Sơn' },
  { value: 'admin', label: 'Quản lý' },
]

export default function LoginPage() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('service_advisor')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmMsg, setConfirmMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setConfirmMsg('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        })
        if (error) throw error
        if (!data.session) {
          setConfirmMsg('Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.')
          setMode('signin')
        } else {
          setConfirmMsg('Đã tạo tài khoản. Tài khoản cần được quản lý xác nhận trước khi sử dụng.')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            minWidth: 56, height: 48, padding: '0 12px', borderRadius: 10, background: 'var(--accent)', margin: '0 auto 14px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-ink)', fontSize: 20,
            letterSpacing: '0.04em',
          }}>KCV</div>
          <h1 style={{ fontSize: 30 }}>ISUZU Thăng Long</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Quản lý quy trình sửa chữa xưởng ô tô, theo dõi từ A đến Z.</p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: 'var(--bg)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="btn"
              style={{
                flex: 1, border: 'none',
                background: mode === 'signin' ? 'var(--surface-raised)' : 'transparent',
              }}
            >Đăng nhập</button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="btn"
              style={{
                flex: 1, border: 'none',
                background: mode === 'signup' ? 'var(--surface-raised)' : 'transparent',
              }}
            >Tạo tài khoản</button>
          </div>

          {confirmMsg && <p style={{ color: 'var(--green)', fontSize: 13, marginBottom: 12 }}>{confirmMsg}</p>}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="full_name">Họ và tên</label>
                <input id="full_name" name="full_name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Nguyễn Văn A" />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ban@xuong.com" />
            </div>
            <div className="field">
              <label htmlFor="password">Mật khẩu</label>
              <input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="role">Vị trí công việc</label>
                <select id="role" name="role" value={role} onChange={e => setRole(e.target.value)}>
                  {SIGNUP_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}
            {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
            <button className="btn btn-accent" style={{ width: '100%', marginTop: 4 }} disabled={loading}>
              {loading ? 'Đang xử lý…' : mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12, marginTop: 16 }}>
          Sau khi đăng ký, tài khoản cần được quản lý xác nhận trước khi có thể sử dụng hệ thống.
        </p>
      </div>
    </div>
  )
}

