import React, { useEffect, useRef } from 'react';
import { useMedha } from '../../context/MedhaContext';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, onClose }) => {
  const { db } = useMedha();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  const domainAvg = (domain: 'memory' | 'attention' | 'speed'): number => {
    const scores = db.scores.slice(-7);
    return Math.round(scores.reduce((a, s) => a + s[domain], 0) / scores.length);
  };

  const memAvg = domainAvg('memory');
  const attAvg = domainAvg('attention');
  const spdAvg = domainAvg('speed');
  const composite = Math.round((memAvg + attAvg + spdAvg) / 3);

  // Dynamically compute Language and Orientation metrics from patient diary and routines
  const langAvg = Math.min(
    95,
    Math.max(
      55,
      Math.round(68 + (db.diary?.length || 0) * 3 + (db.diary?.[0]?.trans ? 6 : 0))
    )
  );

  const doneRatio =
    db.tasks.length > 0 ? db.tasks.filter((t) => t.done).length / db.tasks.length : 0.75;
  const orientationAvg = Math.min(
    98,
    Math.max(55, Math.round(62 + (db.location ? 16 : 6) + doneRatio * 18))
  );

  const riskInfo =
    composite >= 70
      ? {
          badge: 'Low risk · Vitality on track',
          desc: 'Your cognitive scores show consistent recall and attention across the last 14 days.',
          bg: '#EDF6F2',
          color: '#0A5C4C',
        }
      : composite >= 55
      ? {
          badge: 'Mild variance pattern',
          desc: 'Recommended 15 min daily memory games and maintaining steady sleep schedule.',
          bg: '#FFF3DC',
          color: '#8A6210',
        }
      : {
          badge: 'Elevated decline pattern',
          desc: 'Suggest scheduling consultation with Dr. Sharma at GMCH Memory Clinic.',
          bg: '#FBEAE5',
          color: '#C2452D',
        };

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !(window as any).Chart) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const Chart = (window as any).Chart;
    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: {
        labels: ['Memory', 'Attention', 'Speed', 'Language', 'Orientation'],
        datasets: [
          {
            label: 'Current 7-Day Average',
            data: [memAvg, attAvg, spdAvg, langAvg, orientationAvg],
            fill: true,
            backgroundColor: 'rgba(14, 124, 102, 0.2)',
            borderColor: '#0E7C66',
            pointBackgroundColor: '#0E7C66',
          },
          {
            label: 'Age 70-75 Cohort Baseline',
            data: [65, 65, 60, 70, 75],
            borderColor: '#E3A63B',
            borderDash: [5, 4],
            pointRadius: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 30,
            max: 100,
            ticks: { stepSize: 20, font: { size: 9 } },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, memAvg, attAvg, spdAvg, langAvg, orientationAvg]);

  if (!isOpen) return null;

  return (
    <div
      id="analysisModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,14,10,.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg p-6 pop max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-bold ink">📊 Brain Report</h3>
          <button
            id="analysisClose"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F5EFE5] font-bold flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 p-4 rounded-xl" style={{ background: riskInfo.bg }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: riskInfo.color }}>
              Cognitive Index: {composite} / 100
            </span>
            <span
              className="chip px-2.5 py-0.5 text-[11px] font-bold bg-white"
              style={{ color: riskInfo.color }}
            >
              {riskInfo.badge}
            </span>
          </div>
          <p className="text-xs ink mt-2">{riskInfo.desc}</p>
        </div>

        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center" id="domainBars">
          <div className="p-2.5 rounded-xl" style={{ background: '#F8F4EC' }}>
            <p className="text-[10px] font-bold uppercase muted">Memory</p>
            <p className="font-display font-bold text-lg ink mt-0.5">{memAvg}%</p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: '#F8F4EC' }}>
            <p className="text-[10px] font-bold uppercase muted">Attention</p>
            <p className="font-display font-bold text-lg ink mt-0.5">{attAvg}%</p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: '#F8F4EC' }}>
            <p className="text-[10px] font-bold uppercase muted">Speed</p>
            <p className="font-display font-bold text-lg ink mt-0.5">{spdAvg}%</p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: '#F8F4EC' }}>
            <p className="text-[10px] font-bold uppercase muted">Language</p>
            <p className="font-display font-bold text-lg ink mt-0.5">78%</p>
          </div>
          <div className="p-2.5 rounded-xl" style={{ background: '#F8F4EC' }}>
            <p className="text-[10px] font-bold uppercase muted">Orientation</p>
            <p className="font-display font-bold text-lg ink mt-0.5">85%</p>
          </div>
        </div>

        <div className="mt-4 h-52">
          <canvas ref={canvasRef} id="radarCh" />
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-[#FFF6E4] text-xs leading-relaxed" style={{ color: '#7A5A14' }}>
          <b>⚠️ Disclaimer:</b> Demo analytics for engagement tracking only — not a medical diagnosis. Consult a clinician for assessment (e.g., MoCA / MMSE).
        </div>
      </div>
    </div>
  );
};
