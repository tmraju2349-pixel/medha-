import React, { useState, useMemo } from 'react';
import {
  TreePine,
  Gamepad2,
  Mic,
  Volume2,
  Droplets,
  Pill,
  PhoneCall,
  Sparkles,
  Star,
  ChevronRight,
  Leaf,
  Plus,
  UserCheck,
  Users,
  QrCode,
  Stethoscope,
  Play,
  Activity,
  Zap,
  Check,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { t, hourGreetKey } from '../../services/i18n';
import { PatientCareCircleModal } from './PatientCareCircleModal';

export const HomeView: React.FC = () => {
  const {
    db,
    setPage,
    launchGame,
    toggleTask,
    toggleMed,
    incrementHydration,
    setHydration,
    speakText,
    addToast,
    currentPatient,
    connectedCaregivers,
  } = useMedha();

  const [isCareCircleModalOpen, setIsCareCircleModalOpen] = useState(false);

  const patientName = currentPatient?.name || db.book.profile.name || 'Friend';
  const patientFirstName = patientName.split(' ')[0] || patientName;
  const patientAvatar = currentPatient?.avatar || db.book.profile.avatar || '👴';

  const caregiverName = db.caregivers?.[0]?.name || currentPatient?.emergencyContact?.split('(')[0]?.trim() || 'Caregiver';
  const caregiverFirstName = caregiverName.split(' ')[0] || caregiverName;
  const caregiverRelation = currentPatient?.emergencyContact?.includes('(')
    ? currentPatient.emergencyContact.split('(')[1].replace(')', '').trim()
    : db.caregivers?.[0]?.relationship || 'Care Coordinator';
  const caregiverPhone = currentPatient?.emergencyPhone || db.caregivers?.[0]?.phone || '+919876543210';

  const uncompletedTasks = db.tasks.filter((t) => !t.done).length;
  const completedTasks = db.tasks.filter((t) => t.done).length;
  const waterLeft = Math.max(0, 8 - db.hydration.count);

  const greetingTime = t(hourGreetKey(), db.settings.lang);
  const heroSubtitle = `Small steps every day keep memories strong. You have ${uncompletedTasks} tasks and ${waterLeft} glasses of water to go.`;

  const handleHeroSpeak = () => {
    speakText(`${greetingTime}, ${patientFirstName}. ${heroSubtitle}`);
  };

  // Next upcoming medicine
  const nextMed = db.meds.find((m) => !m.taken) || db.meds[0];

  // Circumference of radius 56 circle is ~351.86
  const totalCircumference = 351.86;
  const progressRatio = Math.min(1, db.hydration.count / 8);
  const strokeDashoffset = totalCircumference * (1 - progressRatio);

  // Dynamic Cognitive Recommendations Engine
  // Tailors game selections dynamically based on the patient's current score biomarkers & training history
  const scores = db.scores || [];
  const latestScore = scores[scores.length - 1];
  const memScore = latestScore?.memory ?? 78;
  const attScore = latestScore?.attention ?? 74;
  const spdScore = latestScore?.speed ?? 68;

  const dynamicRecommendations = useMemo(() => {
    // Determine the cognitive domain with the highest therapeutic priority today
    let focusDomain: 'speed' | 'memory' | 'attention' = 'speed';
    if (spdScore <= memScore && spdScore <= attScore) {
      focusDomain = 'speed';
    } else if (memScore <= spdScore && memScore <= attScore) {
      focusDomain = 'memory';
    } else {
      focusDomain = 'attention';
    }

    if (focusDomain === 'speed') {
      return [
        {
          id: 'focus_spotlight',
          emoji: '⚡',
          name: 'Focus Spotlight (3D)',
          domain: 'Processing Speed',
          priorityTag: `Priority · Speed ${spdScore}/100`,
          desc: 'Track and respond to dynamic visual stimuli to train rapid neural reaction latency and motor stability.',
          difficulty: db.levels?.focus_spotlight || 1,
          is3D: true,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        {
          id: 'bg_reaction_time',
          emoji: '⏱️',
          name: 'Rapid Reflex Orbit',
          domain: 'Reaction Vigilance',
          priorityTag: 'Adaptive Reflexes',
          desc: 'Tap instantly upon color shift to stimulate psychomotor speed and sensorimotor coordination.',
          difficulty: db.levels?.bg_reaction_time || 1,
          is3D: false,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        },
        {
          id: 'day_night_switch',
          emoji: '☀️',
          name: 'Day / Night Stroop (3D)',
          domain: 'Executive Switching',
          priorityTag: 'Inhibitory Control',
          desc: 'Cognitive rule-inversion challenges that maintain mental agility and counter habituation.',
          difficulty: db.levels?.day_night_switch || 1,
          is3D: true,
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        },
      ];
    } else if (focusDomain === 'memory') {
      return [
        {
          id: 'memory_pairs',
          emoji: '🌸',
          name: 'Memory Pairs (3D)',
          domain: 'Working Memory',
          priorityTag: `Priority · Memory ${memScore}/100`,
          desc: 'Flip and pair 3D holographic memory cards to strengthen synaptic recall pathways.',
          difficulty: db.levels?.memory_pairs || 1,
          is3D: true,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        },
        {
          id: 'bg_card_matching',
          emoji: '🃏',
          name: 'Assam Cultural Pairs',
          domain: 'Visual Memory',
          priorityTag: 'Pattern Retention',
          desc: 'Pair familiar cultural symbols, tea garden icons, and household heritage motifs.',
          difficulty: db.levels?.bg_card_matching || 1,
          is3D: false,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        {
          id: 'spatial_cubes',
          emoji: '🧊',
          name: 'Spatial Cubes (3D)',
          domain: 'Visuospatial',
          priorityTag: 'Mental Rotation',
          desc: 'Examine multi-angle geometric configurations to stimulate visual reasoning.',
          difficulty: db.levels?.spatial_cubes || 1,
          is3D: true,
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
        },
      ];
    } else {
      return [
        {
          id: 'day_night_switch',
          emoji: '☀️',
          name: 'Day / Night Switch (3D)',
          domain: 'Sustained Attention',
          priorityTag: `Priority · Attention ${attScore}/100`,
          desc: 'Rule switching and anti-habit inhibition for sharp everyday focus and alertness.',
          difficulty: db.levels?.day_night_switch || 1,
          is3D: true,
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        },
        {
          id: 'bg_dual_task',
          emoji: '🎯',
          name: 'Dual-Task Vigilance',
          domain: 'Divided Attention',
          priorityTag: 'Executive Control',
          desc: 'Monitor central task tracking while catching peripheral visual cues.',
          difficulty: db.levels?.bg_dual_task || 1,
          is3D: false,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        {
          id: 'focus_spotlight',
          emoji: '⚡',
          name: 'Focus Spotlight (3D)',
          domain: 'Processing Speed',
          priorityTag: 'Sensory Vigilance',
          desc: 'Target discrimination amidst ambient visual distractors.',
          difficulty: db.levels?.focus_spotlight || 1,
          is3D: true,
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        },
      ];
    }
  }, [spdScore, memScore, attScore, db.levels]);

  return (
    <section id="page-home" className="page active space-y-5">
      {/* Hero card */}
      <div
        className="card p-6 sm:p-7 relative overflow-hidden text-white shadow-md border-0"
        style={{ background: 'linear-gradient(135deg,#074236,#0E7C66 60%,#12907A)' }}
      >
        <svg
          className="absolute -right-6 -top-6 opacity-20 pointer-events-none"
          width="180"
          height="180"
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 6" />
        </svg>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white/90 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span id="homeGreetTime">{greetingTime}</span>
            </div>
            <h1 id="homeGreetName" className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              {patientFirstName}! 🌤
            </h1>
            <p id="homeGreetSub" className="text-white/85 text-sm sm:text-base mt-2 max-w-lg leading-relaxed">
              Small steps every day keep memories strong. You have{' '}
              <b id="homeTasksLeft" className="text-white underline decoration-white/40">{uncompletedTasks}</b> tasks and{' '}
              <b id="homeWaterLeft" className="text-white underline decoration-white/40">{waterLeft}</b> glasses of water to go.
            </p>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-4xl shrink-0 shadow-inner select-none" id="homeAvatarBig">
            {patientAvatar}
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2.5">
          <button
            onClick={() => setPage('tree')}
            className="px-4 py-2.5 rounded-xl bg-white text-[#0A5C4C] font-bold text-sm hover:-translate-y-0.5 transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <TreePine className="w-4 h-4 text-[#0E7C66]" />
            <span>{t('memory_tree', db.settings.lang)}</span>
          </button>
          <button
            onClick={() => setPage('games')}
            className="px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 font-bold text-sm text-white hover:bg-white/25 transition flex items-center gap-2 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-amber-200" />
            <span>{t('play_today', db.settings.lang)}</span>
          </button>
          <button
            onClick={() => setPage('diary')}
            className="px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 font-bold text-sm text-white hover:bg-white/25 transition flex items-center gap-2 cursor-pointer"
          >
            <Mic className="w-4 h-4 text-emerald-200" />
            <span>Record a memory</span>
          </button>
          <button
            id="homeSpeak"
            onClick={handleHeroSpeak}
            className="px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 font-bold text-sm text-white hover:bg-white/25 transition flex items-center gap-2 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-sky-200" />
            <span>Read to me</span>
          </button>
        </div>
      </div>

      {/* Memory Tree Spotlight Card */}
      <div
        onClick={() => setPage('tree')}
        className="card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:-translate-y-0.5 transition border-[#CFE6DD]"
        style={{ background: 'linear-gradient(120deg, #EDF6F2, #FAF6EF)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0E7C66] text-white flex items-center justify-center shadow-sm shrink-0">
            <TreePine className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold ink text-base">My Memory Tree</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0E7C66]/15 text-[#0A5C4C]">
                Interactive Vault
              </span>
            </div>
            <p className="text-xs muted mt-0.5 max-w-xl">
              Explore your roots, beloved pets (Bruno & Mittens), family, and Jorhat tea estate memories.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPage('tree');
            }}
            className="btn-p px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <span>View Tree</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quote card */}
      <div className="card p-4 flex items-center gap-3 border-[#E5DEC9] bg-[#FAF7F0]/70">
        <div className="w-8 h-8 rounded-lg bg-[#EAE2D2] flex items-center justify-center text-[#8A7E72] shrink-0">
          <Leaf className="w-4 h-4 text-[#0E7C66]" />
        </div>
        <p id="quoteBox" className="proverb italic text-sm text-[#4A3E38] flex-1">
          "Old memories are like Assam tea — they only grow richer with time."
        </p>
      </div>

      {/* Tasks & Hydration Grid */}
      <div className="grid md:grid-cols-5 gap-5">
        {/* Tasks */}
        <div className="card p-5 md:col-span-3 border-[#E5DEC9]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg ink">
              {t('today_tasks', db.settings.lang)}
            </h3>
            <span
              id="taskProg"
              className="chip px-3 py-1 text-xs bg-[#EDF6F2] font-bold"
              style={{ borderColor: '#CFE6DD', color: '#0A5C4C' }}
            >
              {completedTasks} / {db.tasks.length} done
            </span>
          </div>
          <div id="tasksList" className="space-y-2.5">
            {db.tasks.length === 0 ? (
              <div className="text-center py-6 px-4 bg-[#FBF8F2] rounded-xl border border-dashed border-[#ECE3D6]">
                <p className="text-sm font-semibold text-gray-700">No daily tasks scheduled yet</p>
                <p className="text-xs text-gray-500 mt-1">Daily routines and gentle reminders will appear here once added by you or your care partner.</p>
              </div>
            ) : (
              db.tasks.map((task, idx) => (
                <label
                  key={`home-task-${task.id}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition select-none hover:bg-[#F6F9F7] border border-transparent hover:border-[#ECE3D6]"
                  style={{ background: task.done ? '#EDF6F2' : '#FBF8F2' }}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="w-5 h-5 accent-[#0E7C66] rounded cursor-pointer"
                  />
                  <span className="text-lg">{task.icon}</span>
                  <span
                    className={`text-sm font-semibold flex-1 ${
                      task.done ? 'line-through text-[#8A7E72]' : 'ink'
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="text-xs font-bold muted bg-white/70 px-2 py-0.5 rounded-md border border-[#ECE3D6]">
                    {task.time}
                  </span>
                </label>
              ))
            )}
          </div>
          <div
            className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2"
            style={{ borderColor: 'var(--line)' }}
          >
            <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
              <Pill className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Next medicine:{' '}</span>
              <b id="nextMed" className="ink">
                {nextMed ? `${nextMed.name} · ${nextMed.time}` : 'None pending'}
              </b>
              {nextMed && !nextMed.taken && (
                <button
                  onClick={() => toggleMed(nextMed.id)}
                  className="ml-2 px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold cursor-pointer transition inline-flex items-center gap-1 shadow-2xs"
                  title="Mark medicine as taken"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark taken</span>
                </button>
              )}
            </div>
            <button
              onClick={() => setPage('games')}
              className="text-xs font-bold hover:underline cursor-pointer flex items-center gap-1"
              style={{ color: 'var(--brand)' }}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
              <span>Earn a star</span>
            </button>
          </div>
        </div>

        {/* Hydration */}
        <div className="card p-5 md:col-span-2 flex flex-col items-center border-[#E5DEC9]">
          <h3 className="font-display font-bold text-lg ink self-start">
            {t('hydration', db.settings.lang)}
          </h3>
          <div className="relative my-3">
            <svg width="132" height="132" viewBox="0 0 132 132">
              <circle cx="66" cy="66" r="56" fill="none" stroke="#ECE3D6" strokeWidth="12" />
              <circle
                id="hydArc"
                cx="66"
                cy="66"
                r="56"
                fill="none"
                stroke="#3E7CB1"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={totalCircumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 66 66)"
                style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.3,.8,.3,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold ink">
                <span id="hydCount">{db.hydration.count}</span>/8
              </span>
              <span className="text-[11px] font-semibold muted flex items-center gap-1 mt-0.5">
                <Droplets className="w-3 h-3 text-[#3E7CB1]" />
                <span>glasses</span>
              </span>
            </div>
          </div>
          <div id="hydBtns" className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button
                key={num}
                onClick={() => setHydration(num)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition cursor-pointer ${
                  num <= db.hydration.count
                    ? 'bg-[#3E7CB1] text-white shadow-xs'
                    : 'bg-[#ECE3D6] text-[#8A7E72] hover:bg-[#DDD2C2]'
                }`}
                title={`Mark ${num} glasses`}
              >
                <Droplets className={`w-4 h-4 ${num <= db.hydration.count ? 'fill-white' : ''}`} />
              </button>
            ))}
          </div>
          <button id="hydAdd" onClick={incrementHydration} className="btn-p w-full py-2.5 mt-4 text-sm flex items-center justify-center gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Drink a glass</span>
          </button>
        </div>
      </div>

      {/* Recommended games (Dynamic AI / Neuro-Adaptive Engine) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-xl ink flex items-center gap-2">
              <span>{t('reco_games', db.settings.lang)}</span>
              <span className="text-[11px] font-sans font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                Cognitive Precision Active
              </span>
            </h3>
            <p className="text-xs muted mt-0.5">
              Personalized based on recent memory, vigilance, and psychomotor speed scores.
            </p>
          </div>
          <button
            onClick={() => setPage('games')}
            className="text-xs font-bold hover:underline cursor-pointer flex items-center gap-1 shrink-0"
            style={{ color: 'var(--brand)' }}
          >
            <span>View all 25 games</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div id="recoGames" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dynamicRecommendations.map((game) => (
            <div
              key={game.id}
              onClick={() => launchGame(game.id)}
              className="card p-4 flex flex-col justify-between hover:-translate-y-1 transition-all duration-200 cursor-pointer border-[#E5DEC9] hover:border-[#0E7C66] hover:shadow-md group relative overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                  style={{ background: '#F2EEE4' }}
                >
                  {game.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold ink text-sm truncate group-hover:text-[#0E7C66] transition-colors">
                      {game.name}
                    </h4>
                    {game.is3D && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                        3D
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="chip px-1.5 py-0.2 text-[10px] font-bold text-[#0A5C4C] bg-[#EDF6F2]">
                      {game.domain}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${game.badgeColor}`}>
                      {game.priorityTag}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs muted mt-2.5 line-clamp-2 leading-relaxed">
                {game.desc}
              </p>

              <div className="mt-3 pt-2.5 border-t border-[#F2EEE4] flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">
                  Current Level: <strong className="text-slate-800 font-bold">{game.difficulty}</strong>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    launchGame(game.id);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white bg-[#0E7C66] hover:bg-[#074236] transition-colors shadow-sm cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Independent Patient Care Circle Hub */}
      <div
        className="card p-5 border-[#F5DFB5] space-y-4"
        style={{ background: 'linear-gradient(120deg,#FFF6E4,#FFFDF8)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEDDB8]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#F3E7CE] flex items-center justify-center text-2xl shadow-2xs shrink-0">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display font-bold text-base ink">My Care Circle</h4>
                <span className="px-2 py-0.5 rounded-full bg-[#E5F3ED] text-[#0A5C4C] text-[11px] font-bold">
                  {connectedCaregivers.length} Connected
                </span>
              </div>
              <p className="text-xs muted">
                Pairing Code: <b className="font-mono font-bold text-[#0A5C4C]">{currentPatient?.code || 'MED-782'}</b> · Your family & doctors watching over you
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCareCircleModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#D8C7A3] text-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5 text-[#0E7C66]" />
              <span>Connect QR Code</span>
            </button>
            <button
              onClick={() => setIsCareCircleModalOpen(true)}
              className="px-3.5 py-2 bg-[#0E7C66] hover:bg-[#0A5C4C] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>View Circle</span>
            </button>
          </div>
        </div>

        {/* Quick Caregiver List with direct call buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {connectedCaregivers.slice(0, 3).map((cg) => (
            <div
              key={cg.linkId}
              className="p-3 bg-white/90 rounded-xl border border-[#ECE2CB] flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">{cg.avatar}</span>
                <div className="truncate">
                  <p className="text-xs font-bold text-gray-900 truncate leading-tight">{cg.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{cg.relationship}</p>
                </div>
              </div>
              <a
                href={`tel:${cg.phone}`}
                onClick={(e) => {
                  addToast(`Opening dialer for ${cg.name}...`, '📞');
                  window.open(`tel:${cg.phone}`, '_top');
                }}
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer shrink-0"
                title={`Call ${cg.name}`}
              >
                <PhoneCall className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>

        {/* Latest message from Care Circle */}
        {(() => {
          const latestNote = (db.careCircleNotes || []).find((n) => n.patientId === (currentPatient?.id || 'PAT-7201-BIREN'));
          if (!latestNote) return null;
          return (
            <div className="pt-2 border-t border-[#EEDDB8] flex items-center gap-2 text-xs text-gray-700">
              <span className="font-bold text-[#B57F1F] shrink-0">Note from {latestNote.authorName}:</span>
              <span className="italic truncate">"{latestNote.message}"</span>
            </div>
          );
        })()}
      </div>

      {/* Care Circle Modal */}
      <PatientCareCircleModal
        isOpen={isCareCircleModalOpen}
        onClose={() => setIsCareCircleModalOpen(false)}
      />
    </section>
  );
};
