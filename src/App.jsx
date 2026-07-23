import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ChooseRole from '@/pages/ChooseRole';
import OnboardingStudent from '@/pages/OnboardingStudent';
import OnboardingTutor from '@/pages/OnboardingTutor';
import Home from '@/pages/Home';
import MyLessons from '@/pages/MyLessons';
import Progress from '@/pages/Progress';
import Plans from '@/pages/Plans';
import TutorProfilePage from '@/pages/TutorProfilePage';
import Classroom from '@/pages/Classroom';
import TutorSchedule from '@/pages/TutorSchedule';
import TutorEarnings from '@/pages/TutorEarnings';
import TutorReviews from '@/pages/TutorReviews';
import TutorBankInfo from '@/pages/TutorBankInfo';
import AdminApprovals from '@/pages/AdminApprovals';
import AdminUsers from '@/pages/AdminUsers';
import AdminCosts from '@/pages/AdminCosts';
import AdminSupport from '@/pages/AdminSupport';
import AdminEarnings from '@/pages/AdminEarnings';
import AdminCoupons from '@/pages/AdminCoupons';
import AdminEmail from '@/pages/AdminEmail';
import AdminAffiliates from '@/pages/AdminAffiliates';
import AffiliateDashboard from '@/pages/AffiliateDashboard';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfUse from '@/pages/TermsOfUse';
import OnboardingAffiliate from '@/pages/OnboardingAffiliate';
import Notifications from '@/pages/Notifications';
import MyMessages from '@/pages/MyMessages';
import Profile from '@/pages/Profile';
import StudentPersonalInfo from '@/pages/StudentPersonalInfo';
import AppLayout from '@/components/AppLayout';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/privacidade" element={<PrivacyPolicy />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/termos" element={<TermsOfUse />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/landing" replace />} />}>
        <Route path="/choose-role" element={<ChooseRole />} />
        <Route path="/onboarding/student" element={<OnboardingStudent />} />
        <Route path="/onboarding/tutor" element={<OnboardingTutor />} />
        <Route path="/onboarding/affiliate" element={<OnboardingAffiliate />} />
        <Route path="/classroom/:id" element={<Classroom />} />

        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/my-lessons" element={<MyLessons />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/tutor/:id" element={<TutorProfilePage />} />
          <Route path="/schedule" element={<TutorSchedule />} />
          <Route path="/earnings" element={<TutorEarnings />} />
          <Route path="/reviews" element={<TutorReviews />} />
          <Route path="/tutor-bank-info" element={<TutorBankInfo />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/costs" element={<AdminCosts />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/earnings" element={<AdminEarnings />} />
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/email" element={<AdminEmail />} />
          <Route path="/admin/affiliates" element={<AdminAffiliates />} />
          <Route path="/affiliate" element={<AffiliateDashboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/my-messages" element={<MyMessages />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/student/personal-info" element={<StudentPersonalInfo />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App