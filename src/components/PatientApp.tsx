import React from 'react';
import { useMedha } from '../context/MedhaContext';
import { PatientSidebar } from './patient/PatientSidebar';
import { PatientHeader } from './patient/PatientHeader';
import { PatientBottomNav } from './patient/PatientBottomNav';
import { HomeView } from './patient/HomeView';
import { BrainGamesView } from './patient/BrainGamesView';
import { VoiceDiaryView } from './patient/VoiceDiaryView';
import { MemoryTreeView } from './patient/MemoryTreeView';
import { GeofencingView } from './patient/GeofencingView';
import { SettingsView } from './patient/SettingsView';
import { SOSModal } from './modals/SOSModal';
import { FloatingMicButton } from './assistant/FloatingMicButton';
import { MedhaVoiceAssistant } from './assistant/MedhaVoiceAssistant';

export const PatientApp: React.FC = () => {
  const { currentPage } = useMedha();

  return (
    <div id="patientApp" className="min-h-screen">
      <PatientSidebar />

      <div className="lg:pl-64">
        <PatientHeader />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-28 lg:pb-10">
          {currentPage === 'home' && <HomeView />}
          {currentPage === 'games' && <BrainGamesView />}
          {currentPage === 'diary' && <VoiceDiaryView />}
          {(currentPage === 'tree' || currentPage === 'book') && <MemoryTreeView />}
          {currentPage === 'geo' && <GeofencingView />}
          {currentPage === 'settings' && <SettingsView />}
        </main>

        <PatientBottomNav />
      </div>

      {/* Persistent Movable Mic Button & Assistant Modal */}
      <FloatingMicButton />
      <MedhaVoiceAssistant />

      <SOSModal />
    </div>
  );
};
