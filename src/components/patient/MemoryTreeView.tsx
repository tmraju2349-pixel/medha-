import React from 'react';
import { useMedha } from '../../context/MedhaContext';
import MemoryAssistant from '../../modules/memory/MemoryAssistant';
import { t } from '../../services/i18n';
import { Trees, Mic, Search } from 'lucide-react';

export const MemoryTreeView: React.FC = () => {
  const {
    db,
    activePatientId,
    treeSearchQuery,
    setTreeSearchQuery,
    speakText,
    setIsVoiceAssistantOpen,
    patientName,
  } = useMedha();

  const handleSpeakMemory = (memory: any) => {
    if (!memory) return;
    const textToSpeak = `${memory.title || ''}. ${memory.description || ''}`;
    speakText(textToSpeak);
  };

  return (
    <div className="space-y-6 pb-12" id="memoryTreeView">
      {/* Top Banner & Patient Switcher */}
      <div
        className="card p-6 relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #074236 0%, #0E7C66 60%, #12907A 100%)' }}
      >
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold mb-2">
              <Trees className="w-3.5 h-3.5" />
              <span>Hierarchical Memory Vault</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              {t('memory_tree', db.settings.lang)}
            </h1>
            <p className="text-white/80 text-sm mt-1 max-w-xl">
              A living visual tree of your family, pets, home, and dearest life stories.
              Branches grow and connect as you record new moments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsVoiceAssistantOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0A5C4C] font-bold text-sm shadow-md hover:bg-[#F2EEE4] transition cursor-pointer"
            >
              <Mic className="w-4 h-4 text-[#0E7C66]" />
              <span>Voice Assistant</span>
            </button>
          </div>
        </div>

        {/* Patient Switcher Tabs */}
        <div className="mt-5 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/75 font-semibold">Active Tree:</span>
            <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl">
              <span className="px-3 py-1 rounded-lg text-xs font-bold text-[#074236] bg-white shadow">{patientName}</span>
            </div>
          </div>
          {treeSearchQuery && (
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg text-xs font-semibold text-white">
              <Search className="w-3.5 h-3.5" />
              <span>Filtered by voice: "{treeSearchQuery}"</span>
              <button
                onClick={() => setTreeSearchQuery('')}
                className="ml-1 text-white/80 hover:text-white underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Dynamic Memory Tree Assistant */}
      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-sm overflow-hidden min-h-[680px]">
        <MemoryAssistant
          patientId={activePatientId}
          patientName={patientName}
          onSpeak={handleSpeakMemory}
          initialSearchQuery={treeSearchQuery}
        />
      </div>
    </div>
  );
};
