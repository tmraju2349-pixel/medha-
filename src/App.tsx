import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { MedhaProvider, useMedha } from './context/MedhaContext';
import { LoginScreen } from './components/LoginScreen';
import { PatientApp } from './components/PatientApp';
import { CaregiverDashboard } from './components/caregiver/CaregiverDashboard';
import { ToastContainer } from './components/ToastContainer';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { RealNotificationManager } from './components/common/RealNotificationManager';

const MainRouter: React.FC = () => {
  const { currentUser, authLoading } = useMedha();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A5C4C' }}>
        <div className="text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl mx-auto mb-4 animate-pulse">🧠</div>
          <p className="font-bold tracking-widest uppercase text-white/70 text-xs">MEDHA-AI</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  if (currentUser === 'caregiver') {
    return <CaregiverDashboard />;
  }

  return <PatientApp />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <MedhaProvider>
        <MainRouter />
        <ToastContainer />
        <RealNotificationManager />
        <OfflineIndicator />
      </MedhaProvider>
    </ErrorBoundary>
  );
}
