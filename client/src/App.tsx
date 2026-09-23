import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';
import { Mine } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SosEmergencyModal } from './components/SosEmergencyModal';
import { LandingPage } from './pages/LandingPage';
import { WorkerDashboard } from './pages/WorkerDashboard';
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

const AppLayout: React.FC = () => {
  const location = useLocation();
  const [mines, setMines] = useState<Mine[]>([]);
  const [isSosOpen, setIsSosOpen] = useState(false);

  useEffect(() => {
    api.getMines().then(setMines).catch(console.error);
  }, []);

  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar onOpenSos={() => setIsSosOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        {!isLandingPage && <Sidebar />}

        <main className={`flex-1 overflow-y-auto ${isLandingPage ? '' : 'p-4 lg:p-8 max-w-7xl mx-auto w-full'}`}>
          <Routes>
            <Route path="/" element={<LandingPage onOpenSos={() => setIsSosOpen(true)} />} />
            <Route path="/dashboard" element={<WorkerDashboard onOpenSos={() => setIsSosOpen(true)} mines={mines} />} />
            <Route path="/safety-reports" element={<SafetyReportsPage mines={mines} />} />
            <Route path="/grievances" element={<GrievancesPage mines={mines} />} />
            <Route path="/sos-control" element={<SosControlRoomPage onOpenSos={() => setIsSosOpen(true)} />} />
            <Route path="/compliance" element={<ComplianceDashboard mines={mines} />} />
            <Route path="/corporate" element={<ComplianceDashboard mines={mines} />} />
            <Route path="/audit-verification" element={<AuditVerificationPage />} />
            <Route path="/recognition" element={<RecognitionPage />} />
            <Route path="/inspections" element={<InspectionsPage mines={mines} />} />
            <Route path="/corrective-actions" element={<CorrectiveActionsPage />} />
            <Route path="/incidents" element={<IncidentsPage mines={mines} />} />
            <Route path="/future-health" element={<FutureHealthMonitoringPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <SosEmergencyModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        mines={mines}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
