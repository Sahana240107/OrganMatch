import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'

// Pages
import Login             from './pages/Login'
import Dashboard         from './pages/Dashboard'
import MatchingEngine    from './pages/MatchingEngine'
import Donors            from './pages/Donors'
import Recipients        from './pages/Recipients'
import WaitingList       from './pages/WaitingList'
import OfferWorkflow     from './pages/OfferWorkflow'
import LocationMap       from './pages/LocationMap'
import Hospitals         from './pages/Hospitals'
import TransplantHistory from './pages/TransplantHistory'
import Analytics         from './pages/Analytics'
import Notifications     from './pages/Notifications'
import RegisterDonor     from './pages/RegisterDonor'
import RegisterRecipient from './pages/RegisterRecipient'

function AppLayout() {
  const { pathname } = useLocation()

  return (
    <div className="app">
      <Sidebar />
      <div className="main-area">
        <Topbar path={pathname} />
        <div className="content">
          <Routes>
            <Route path="/"                    element={<Dashboard />} />
            <Route path="/matching"            element={<MatchingEngine />} />
            <Route path="/donors"              element={<Donors />} />
            <Route path="/recipients"          element={<Recipients />} />
            <Route path="/waiting"             element={<WaitingList />} />
            <Route path="/offers"              element={<OfferWorkflow />} />
            <Route path="/map"                 element={<LocationMap />} />
            <Route path="/hospitals"           element={<Hospitals />} />
            <Route path="/history"             element={<TransplantHistory />} />
            <Route path="/analytics"           element={<Analytics />} />
            <Route path="/notifications"       element={<Notifications />} />
            <Route path="/register-donor"      element={<RegisterDonor />} />
            <Route path="/register-recipient"  element={<RegisterRecipient />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
