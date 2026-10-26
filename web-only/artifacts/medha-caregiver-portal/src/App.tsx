import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, ReactNode } from 'react';
import {
  Activity, Bluetooth, Check, ChevronRight, CircleHelp, Download, FileUp,
  HeartPulse, Home, LogOut, Menu, Mic, MoreHorizontal, RefreshCw, Shield,
  Sparkles, Upload, UserRound, Users, X,
} from 'lucide-react';

type TaskStatus = 'pending' | 'done' | 'snoozed';
type Task = { id: string; title: string; time: string; category: string; status: TaskStatus };
type BluetoothState = { id: string; name: string; connectedAt: string } | null;
type SavedState = { tasks: Task[]; bluetooth: BluetoothState };

const STORAGE_KEY = 'medha-web-state';
const defaultTasks: Task[] = [
  { id: 'medicine', title: 'Morning medicine', time: '8:00 AM', category: 'Medicine', status: 'pending' },
  { id: 'water', title: 'Drink a glass of water', time: '10:30 AM', category: 'Hydration', status: 'pending' },
  { id: 'walk', title: 'Morning walk', time: '11:00 AM', category: 'Routine', status: 'pending' },
  { id: 'doctor', title: 'Family doctor appointment', time: '4:30 PM', category: 'Appointment', status: 'pending' },
];

function loadState(): SavedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as SavedState;
  } catch { /* Use local defaults when storage is unavailable. */ }
  return { tasks: defaultTasks, bluetooth: null };
}

function App() {
  const [state, setState] = useState<SavedState>(loadState);
  const [activeTab, setActiveTab] = useState('Home');
  const [notice, setNotice] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), [state]);

  const completedTasks = state.tasks.filter((task) => task.status === 'done').length;
  const updateTask = (id: string, status: TaskStatus) => setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, status } : task) }));

  async function connectBluetooth() {
    type BluetoothNavigator = Navigator & { bluetooth?: { requestDevice: (options: { acceptAllDevices: boolean }) => Promise<{ id: string; name?: string; gatt?: { connect: () => Promise<unknown> } }> } };
    const bluetooth = (navigator as BluetoothNavigator).bluetooth;
    if (!bluetooth) { setNotice('Bluetooth is not available in this browser. Use Chrome or Edge over HTTPS or localhost.'); return; }
    setIsScanning(true); setNotice('Choose a nearby care device in the browser dialog.');
    try {
      const device = await bluetooth.requestDevice({ acceptAllDevices: true });
      if (device.gatt) await device.gatt.connect();
      const name = device.name || 'Unnamed Bluetooth device';
      setState((current) => ({ ...current, bluetooth: { id: device.id, name, connectedAt: new Date().toISOString() } }));
      setNotice(`${name} is connected.`);
    } catch (error) {
      if (error instanceof Error && error.name !== 'NotFoundError') setNotice(error.message || 'Bluetooth connection was not completed.');
    } finally { setIsScanning(false); }
  }
  function disconnectBluetooth() { setState((current) => ({ ...current, bluetooth: null })); setNotice('Bluetooth device disconnected from this browser session.'); }
  function exportCareData() {
    const payload = { format: 'medha-care-data', version: 1, exportedAt: new Date().toISOString(), ...state };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `medha-care-data-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
    setNotice('Care data exported. Move the downloaded JSON file to another computer to import it.');
  }
  function importCareData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try {
      const imported = JSON.parse(String(reader.result)) as { format?: string; tasks?: Task[]; bluetooth?: BluetoothState };
      if (imported.format !== 'medha-care-data' || !Array.isArray(imported.tasks)) throw new Error('This is not a Medha care data file.');
      setState({ tasks: imported.tasks, bluetooth: imported.bluetooth ?? null }); setNotice('Care data imported successfully on this device.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'The selected file could not be imported.'); } };
    reader.readAsText(file); event.target.value = '';
  }

  const navItems = [{ label: 'Home', icon: Home }, { label: 'Care plan', icon: HeartPulse }, { label: 'Memory', icon: Sparkles }, { label: 'Devices', icon: Bluetooth }, { label: 'More', icon: MoreHorizontal }];
  return <div className="app-shell">
    <aside className={`sidebar ${showMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><HeartPulse size={20} /></div><div><strong>Medha</strong><span>Cognitive care</span></div></div>
      <div className="profile-card"><div className="avatar">RB</div><div><strong>Ramesh Barua</strong><span>Patient profile</span></div><button aria-label="Close menu" className="icon-button mobile-close" onClick={() => setShowMenu(false)}><X size={18} /></button></div>
      <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeTab === label ? 'active' : ''}`} onClick={() => { setActiveTab(label); setShowMenu(false); }}><Icon size={19} /><span>{label}</span>{label === 'Devices' && state.bluetooth && <i className="online-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><CircleHelp size={19} /><span>Help & support</span></button><button className="nav-item"><LogOut size={19} /><span>Sign out</span></button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><button aria-label="Open navigation" className="icon-button menu-button" onClick={() => setShowMenu(true)}><Menu size={21} /></button><div className="topbar-title"><span>Thursday, September 3, 2026</span><h1>{activeTab === 'Home' ? 'Good morning, Ramesh' : activeTab}</h1></div><div className="topbar-actions"><button className="icon-button"><Activity size={19} /></button><div className="caregiver"><div className="avatar small">AB</div><span>Ananya</span></div></div></header>
      <div className="page-content">
        {notice && <div className="notice"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice('')}><X size={15} /></button></div>}
        {activeTab === 'Home' && <>
          <section className="hero-grid"><div className="hero-card"><div><span className="eyebrow">TODAY'S RHYTHM</span><h2>Small moments of care add up.</h2><p>{completedTasks} of {state.tasks.length} care moments completed today.</p></div><div className="progress-ring" style={{ '--progress': `${(completedTasks / state.tasks.length) * 360}deg` } as CSSProperties}><strong>{Math.round((completedTasks / state.tasks.length) * 100)}%</strong><span>complete</span></div></div><div className="safety-card"><div className="safety-icon"><Shield size={22} /></div><div><span className="eyebrow">SAFETY CHECK</span><h3>Everything looks calm</h3><p>Last check-in was 12 minutes ago.</p></div><ChevronRight size={20} /></div></section>
          <div className="section-heading"><div><span className="eyebrow">FOR RAMESH</span><h2>Today's care plan</h2></div><button className="text-button" onClick={() => setActiveTab('Care plan')}>View full plan <ChevronRight size={16} /></button></div>
          <div className="task-list">{state.tasks.map((task) => <TaskRow key={task.id} task={task} onStatus={updateTask} />)}</div>
          <section className="lower-grid"><div className="insight-card"><div className="card-heading"><div className="round-icon peach"><Mic size={18} /></div><div><h3>Gentle note</h3><span>From voice diary</span></div></div><p>“You are doing well. Take your time, breathe slowly, and stay close to your routine.”</p></div><div className="insight-card"><div className="card-heading"><div className="round-icon blue"><Users size={18} /></div><div><h3>Family circle</h3><span>1 caregiver connected</span></div></div><div className="family-row"><div className="avatar small">AB</div><div><strong>Ananya Barua</strong><span>Daughter · Primary caregiver</span></div><span className="status-pill">Online</span></div></div></section>
        </>}
        {activeTab === 'Care plan' && <CarePlan tasks={state.tasks} onStatus={updateTask} />}
        {activeTab === 'Memory' && <EmptyPanel icon={<Sparkles />} title="Memory assistant" text="A familiar place for people, places, and everyday routines will appear here." />}
        {activeTab === 'Devices' && <Devices bluetooth={state.bluetooth} isScanning={isScanning} onConnect={connectBluetooth} onDisconnect={disconnectBluetooth} />}
        {activeTab === 'More' && <More exportCareData={exportCareData} onImport={() => importInput.current?.click()} />}
      </div>
    </main>
    <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={importCareData} />
  </div>;
}

function TaskRow({ task, onStatus }: { task: Task; onStatus: (id: string, status: TaskStatus) => void }) { const done = task.status === 'done'; return <div className={`task-row ${done ? 'done' : ''}`}><div className={`task-symbol ${task.category.toLowerCase()}`}>{task.category === 'Medicine' ? <HeartPulse size={18} /> : task.category === 'Hydration' ? <Activity size={18} /> : <Sparkles size={18} />}</div><div className="task-info"><strong>{task.title}</strong><span>{task.time} · {task.category}</span></div>{done ? <span className="completed"><Check size={15} /> Done</span> : <><button className="complete-button" onClick={() => onStatus(task.id, 'done')}>Mark done</button><button className="icon-button subtle" onClick={() => onStatus(task.id, 'snoozed')} aria-label={`Snooze ${task.title}`}><RefreshCw size={16} /></button></>}</div>; }
function CarePlan({ tasks, onStatus }: { tasks: Task[]; onStatus: (id: string, status: TaskStatus) => void }) { return <><div className="page-intro"><span className="eyebrow">ROUTINE SUPPORT</span><h2>Care plan</h2><p>Keep daily moments simple, visible, and gentle.</p></div><div className="task-list wide">{tasks.map((task) => <TaskRow key={task.id} task={task} onStatus={onStatus} />)}</div></>; }
function Devices({ bluetooth, isScanning, onConnect, onDisconnect }: { bluetooth: BluetoothState; isScanning: boolean; onConnect: () => void; onDisconnect: () => void }) { return <><div className="page-intro"><span className="eyebrow">DEVICE CONNECTIVITY</span><h2>Connected devices</h2><p>Connect a trusted Bluetooth care device from this browser.</p></div><div className="device-panel"><div className="device-illustration"><Bluetooth size={38} /></div><div className="device-copy"><h3>{bluetooth ? bluetooth.name : 'No device connected'}</h3><p>{bluetooth ? 'Connected in this browser session. Device access stays local to this computer.' : 'Bluetooth scanning works in Chrome or Edge on localhost or HTTPS.'}</p>{bluetooth ? <button className="secondary-button" onClick={onDisconnect}>Disconnect device</button> : <button className="primary-button" onClick={onConnect} disabled={isScanning}>{isScanning ? 'Scanning nearby…' : 'Scan for Bluetooth devices'}</button>}</div></div><div className="info-box"><Shield size={18} /><span>Only connect devices you recognize. The browser will ask you to choose the device and grant access.</span></div></>; }
function More({ exportCareData, onImport }: { exportCareData: () => void; onImport: () => void }) { return <><div className="page-intro"><span className="eyebrow">SETTINGS</span><h2>More</h2><p>Manage local data and the way Medha works on this computer.</p></div><div className="settings-grid"><div className="setting-card"><div className="round-icon blue"><FileUp size={19} /></div><div><h3>Transfer care data</h3><p>Move routines and local device settings between computers with a JSON file.</p><div className="button-row"><button className="primary-button" onClick={exportCareData}><Download size={16} /> Export data</button><button className="secondary-button" onClick={onImport}><Upload size={16} /> Import data</button></div></div></div><div className="setting-card"><div className="round-icon peach"><UserRound size={19} /></div><div><h3>Patient profile</h3><p>Ramesh Barua · Guwahati, Assam<br />Caregiver: Ananya Barua</p></div></div></div></>; }
function EmptyPanel({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="empty-panel"><div className="empty-icon">{icon}</div><h2>{title}</h2><p>{text}</p></div>; }

export default App;
