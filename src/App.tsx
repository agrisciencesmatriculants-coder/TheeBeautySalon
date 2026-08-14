import { Routes, Route } from 'react-router';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Salons from '@/pages/Salons';
import SalonDetail from '@/pages/SalonDetail';
import Booking from '@/pages/Booking';
import BookingStatus from '@/pages/BookingStatus';
import Signup from '@/pages/Signup';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Account from '@/pages/Account';
import Dashboard from '@/pages/Dashboard';
import Graduation from '@/pages/Graduation';
import AdminLogin from '@/pages/AdminLogin';
import Admin from '@/pages/Admin';
import StubPage from '@/pages/StubPage';

/**
 * Routing — nested-route pattern (Layout renders <Outlet/>).
 * All public pages nest inside <Route element={<Layout/>}>.
 * Admin routes render without the public chrome.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="salons" element={<Salons />} />
        <Route path="salon/:slug" element={<SalonDetail />} />
        <Route path="book/:salonId/:serviceId" element={<Booking />} />
        <Route path="booking/:id/status" element={<BookingStatus />} />
        <Route path="signup" element={<Signup />} />
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="account" element={<Account />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="graduation" element={<Graduation />} />
        <Route path="*" element={<StubPage title="Page not found" note="That page doesn't exist — yet." />} />
      </Route>
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<Admin />} />
    </Routes>
  );
}
