import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import AdvisorDashboard from './pages/AdvisorDashboard'
import ManagementDashboard from './pages/ManagementDashboard'
import ForemanDashboard from './pages/ForemanDashboard'
import TechnicianDashboard from './pages/TechnicianDashboard'
import PaintTeamDashboard from './pages/PaintTeamDashboard'

function isPaintTeamMember(profile) {
  if (!profile) return false
  if (profile.role === 'paint_team') return true

  // Nhân sự cũ có thể được lưu dưới vai trò kỹ thuật viên/tổ trưởng,
  // vì vậy dùng cả tên tổ và hỗ trợ dữ liệu nhập không dấu.
  const team = (profile.team_group || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()

  return team.includes('son')
}

function Gate() {
  const { session, profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Đang tải…
      </div>
    )
  }

  if (!session) return <LoginPage />

  if (profile && !profile.approved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: 'var(--accent-soft)', margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>⏳</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Tài khoản đang chờ xác nhận</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>
            Xin chào {profile.full_name}, tài khoản của bạn cần được quản lý xác nhận trước khi truy cập hệ thống. Vui lòng liên hệ quản lý xưởng.
          </p>
          <button className="btn btn-ghost" onClick={signOut}>Đăng xuất</button>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      {profile?.role === 'admin' && <ManagementDashboard />}
      {profile?.role === 'service_advisor' && <AdvisorDashboard />}
      {isPaintTeamMember(profile) && profile?.role !== 'admin' && profile?.role !== 'service_advisor' && <PaintTeamDashboard />}
      {profile?.role === 'foreman' && profile?.team_group && !isPaintTeamMember(profile) && <ForemanDashboard />}
      {profile?.role === 'technician' && profile?.team_group && !isPaintTeamMember(profile) && <TechnicianDashboard />}
      {profile?.role === 'foreman' && !profile?.team_group && <ForemanDashboard />}
      {profile?.role === 'technician' && !profile?.team_group && <TechnicianDashboard />}
      {!profile && (
        <p style={{ color: 'var(--text-muted)', padding: '32px 0' }}>Đang khởi tạo hồ sơ của bạn…</p>
      )}
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
