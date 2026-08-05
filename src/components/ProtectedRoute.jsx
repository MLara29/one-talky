import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import TwoFactorModal from '@/components/TwoFactorModal';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth, user } = useAuth();
  // null = not checked yet, otherwise { required, verified } for THIS session only —
  // fetched from the server so two tabs of the same admin/tutor never share state.
  const [otpStatus, setOtpStatus] = useState(null);

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role !== 'admin' && user.role !== 'tutor' && user.role !== 'affiliate') {
      setOtpStatus({ required: false, verified: true });
      return;
    }
    base44.functions.invoke('getOtpStatus', {})
      .then(res => setOtpStatus(res.data))
      .catch(() => setOtpStatus({ required: true, verified: false }));
  }, [isAuthenticated, user?.id, user?.role]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  if (otpStatus === null) {
    return fallback;
  }

  // Complementary client-side guard: admin/tutor sessions that haven't
  // completed 2FA never see protected pages. Server-side requireOtp() (bound
  // to this exact session) is the real enforcement.
  if (otpStatus.required && !otpStatus.verified) {
    return <TwoFactorModal email={user.email} onVerified={() => setOtpStatus({ required: true, verified: true })} />;
  }

  return <Outlet />;
}