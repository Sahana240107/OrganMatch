import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }         from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Login             from './pages/Login';
import Dashboard         from './pages/Dashboard';
import MatchingEngine    from './pages/MatchingEngine';
import LocationMap       from './pages/LocationMap';
import RegisterDonor     from './pages/RegisterDonor';
import RegisterRecipient from './pages/RegisterRecipient';
import WaitingList       from './pages/WaitingList';
import OfferWorkflow     from './pages/OfferWorkflow';
import TransplantHistory from './pages/TransplantHistory';
import Analytics         from './pages/Analytics';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/"                      element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard"             element={<Dashboard />} />
              <Route path="/matching/:organId"     element={<MatchingEngine />} />
              <Route path="/map"                   element={<LocationMap />} />
              <Route path="/donors/register"       element={<RegisterDonor />} />
              <Route path="/recipients/register"   element={<RegisterRecipient />} />
              <Route path="/waiting-list"          element={<WaitingList />} />
              <Route path="/offers/:organId"       element={<OfferWorkflow />} />
              <Route path="/transplants"           element={<TransplantHistory />} />
              <Route path="/analytics"             element={<Analytics />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
