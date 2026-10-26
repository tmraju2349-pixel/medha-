import React from 'react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="docsModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,14,10,.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-6 pop max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between sticky top-0 bg-white pb-3">
          <h3 className="font-display text-xl font-bold ink">📋 README — Setup &amp; progress</h3>
          <button
            id="docsClose"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F5EFE5] font-bold flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="text-sm muted leading-relaxed space-y-4">
          <div>
            <p className="font-bold ink">Stack</p>
            <p>
              React + Vite + TypeScript + Tailwind + Chart.js · Leaflet · Web Speech API · MediaRecorder · Geolocation · localStorage Supabase-mock (sync-ready).
            </p>
          </div>
          <div>
            <p className="font-bold ink">Supabase schema</p>
            <pre className="bg-[#F5EFE5] rounded-xl p-3 text-[11px] overflow-auto">
              {`users(id,role,username,password,name,phone);
tasks(id,patient_id,title,time,done,icon);
meds(id,patient_id,name,time,taken);
diary(id,patient_id,ts,text,translated,lang,audio,synced);
scores(day,memory,attention,speed);
game_log(id,game,score,acc,dur,ts);
zones(id,name,x,y,r); alerts(id,type,msg,ts,status);`}
            </pre>
          </div>
          <div>
            <p className="font-bold ink">Progress log</p>
            <ul className="list-disc pl-5">
              <li>Day 1 ✔ Auth shell, design system, routing, seed DB layer</li>
              <li>Day 2 ✔ Home, hydration ring, tasks, notifications</li>
              <li>Day 3 ✔ 4 adaptive games + EMA analytics + risk report</li>
              <li>Day 4 ✔ Voice diary: STT / TTS / audio recording / translation</li>
              <li>Day 5 ✔ Memory Book 3D flips, geo-fence map, SOS pipeline</li>
              <li>Day 6 ✔ Caregiver dashboards, offline sync, README</li>
            </ul>
          </div>
          <p className="text-xs">
            Demo accounts: <b>patient/1234</b> · <b>caregiver/1234</b>
          </p>
        </div>
      </div>
    </div>
  );
};
