import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { smooth } from './motion';
import { BottomNav } from './components/BottomNav';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Mine } from './types';
import { NAV, canAccess, homePath } from './navigation';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SosEmergencyModal } from './components/SosEmergencyModal';
import { SignInGate } from './components/SignInGate';
import { SplashLoader } from './components/SplashLoader';
import { AccountSetup } from './pages/AccountSetup';
import { RoleDashboard } from './pages/RoleDashboards';
import { SafetyReportsPage } from './pages/SafetyReportsPage';
import { GrievancesPage } from './pages/GrievancesPage';
import { SosControlRoomPage } from './pages/SosControlRoomPage';
import { ComplianceDashboard } from './pages/ComplianceDashboard';
import { AuditVerificationPage } from './pages/AuditVerificationPage';
import { RecognitionPage } from './pages/RecognitionPage';
import { InspectionsPage } from './pages/InspectionsPage';
import { CorrectiveActionsPage } from './pages/CorrectiveActionsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { FutureHealthMonitoringPage } from './pages/FutureHealthMonitoringPage';
import { ProfilePage } from './pages/ProfilePage';
import { AttendancePage } from './pages/AttendancePage';
import { EscalationsPage } from './pages/EscalationsPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { ContractsPage } from './pages/ContractsPage';
import { FieldReportsPage } from './pages/FieldReportsPage';
import { AdminMinesPage } from './pages/admin/AdminMinesPage';
import { MineDetailPage } from './pages/admin/MineDetailPage';
import { AdminPeoplePage } from './pages/admin/AdminPeoplePage';
import { MineIntelligencePage } from './pages/admin/MineIntelligencePage';
import { HazardApprovalsPage } from './pages/HazardApprovalsPage';
import { StatutoryCompliancePage } from './pages/admin/StatutoryCompliancePage';

const AppShell: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [mines, setMines] = useState<Mine[]>([]);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    api.getMines().then(setMines).catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const openSos = () => setIsSosOpen(true);

  const pages: Record<string, React.ReactElement> = {
    '/dashboard': <RoleDashboard onOpenSos={openSos} mines={mines} />,
    '/attendance': <AttendancePage mines={mines} />,
    '/shifts': <ShiftsPage mines={mines} />,
    '/contracts': <ContractsPage mines={mines} />,
    '/field-reports': <FieldReportsPage mines={mines} />,
    '/safety-reports': <SafetyReportsPage mines={mines} />,
    '/incidents': <IncidentsPage mines={mines} />,
    '/inspections': <InspectionsPage mines={mines} />,
    '/corrective-actions': <CorrectiveActionsPage />,
    '/hazard-approvals': <HazardApprovalsPage />,
    '/sos-control': <SosControlRoomPage onOpenSos={openSos} />,
    '/escalations': <EscalationsPage />,
    '/grievances': <GrievancesPage mines={mines} />,
    '/recognition': <RecognitionPage />,
    '/future-health': <FutureHealthMonitoringPage />,
    '/compliance': <ComplianceDashboard mines={mines} />,
    '/corporate': <ComplianceDashboard mines={mines} />,
    '/audit-verification': <AuditVerificationPage />,
    '/admin/mines': <AdminMinesPage />,
    '/admin/people': <AdminPeoplePage />,
    '/admin/intelligence': <MineIntelligencePage mines={mines} />,
    '/admin/compliance': <StatutoryCompliancePage mines={mines} />,
  };
  const home = homePath(user);
  const hasTabs = !!user?.role; // phones get a bottom tab bar; admin-only accounts keep the menu button

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <Navbar
        onOpenSos={user?.role ? openSos : undefined}
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        hasBottomNav={hasTabs}
      />

      <div className="flex-1 min-h-0 flex">
        <Sidebar variant="desktop" />

        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto">
          <div className="px-4 py-6 lg:px-10 lg:py-8 max-w-6xl mx-auto w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={smooth}
              >
            <Routes location={location}>
              {NAV.map((item) => (
                <Route
                  key={item.to}
                  path={item.to}
                  element={canAccess(user, item) ? pages[item.to] : <Navigate to={home} replace />}
                />
              ))}
              <Route
                path="/admin/mines/:id"
                element={user?.isAdmin ? <MineDetailPage /> : <Navigate to={home} replace />}
              />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to={home} replace />} />
            </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {hasTabs && <BottomNav onOpenSos={openSos} onOpenMore={() => setIsMobileNavOpen(true)} />}

      <Sidebar variant="mobile" isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      <SosEmergencyModal isOpen={isSosOpen} onClose={() => setIsSosOpen(false)} mines={mines} />
    </div>
  );
};

const AppGate: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SplashLoader />;
  if (!user) return <SignInGate />;
  if (user.status !== 'APPROVED') return <AccountSetup />;
  return <AppShell />;
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';

if (import.meta.env.DEV) {
  console.log('Google Client ID:', GOOGLE_CLIENT_ID || '(not configured)');
}

export const App: React.FC = () => {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6 text-zinc-200">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold">Google sign-in is not configured.</p>
          <p className="mt-2 text-sm text-zinc-400">
            Set VITE_GOOGLE_CLIENT_ID in client/.env to your Google OAuth client ID.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <BrowserRouter>
            <AppGate />
          </BrowserRouter>
        </AuthProvider>
      </MotionConfig>
    </GoogleOAuthProvider>
  );
};

export default App;
