import React from 'react';
import {
  Home,
  Gamepad2,
  Mic,
  TreePine,
  ShieldCheck,
  Settings,
  Brain,
  User,
  LogOut,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { t } from '../../services/i18n';
import { MedhaLogo } from '../common/MedhaLogo';

export const PatientSidebar: React.FC = () => {
  const { currentPage, setPage, logout, db, currentPatient } = useMedha();

  const navItems = [
    { key: 'home', Icon: Home, labelKey: 'nav_home' },
    { key: 'games', Icon: Gamepad2, labelKey: 'nav_games' },
    { key: 'diary', Icon: Mic, labelKey: 'nav_diary' },
    { key: 'tree', Icon: TreePine, labelKey: 'nav_tree' },
    { key: 'geo', Icon: ShieldCheck, labelKey: 'nav_guard' },
    { key: 'settings', Icon: Settings, labelKey: 'nav_settings' },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r z-40"
      style={{ borderColor: 'var(--line)' }}
    >
      <div className="p-4 flex items-center">
        <MedhaLogo variant="compact" size="sm" theme="light" />
      </div>
      <div className="weave h-1.5 mx-5 rounded-full"></div>
      <nav className="mt-5 px-3 space-y-1.5 flex-1" id="sideNav">
        {navItems.map((item) => {
          const isActive = currentPage === item.key;
          const Icon = item.Icon;
          return (
            <button
              key={item.key}
              data-page={item.key}
              onClick={() => setPage(item.key)}
              className={`nav-item w-full !flex-row !gap-3 px-3.5 py-3 text-sm font-bold transition-all rounded-xl cursor-pointer ${
                isActive ? 'active shadow-xs' : 'hover:bg-[#FAF6EF]'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isActive ? 'bg-[var(--brand)] text-white' : 'bg-[#FAF6EF] text-[#0A5C4C]'
              }`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="flex-1 text-left">{t(item.labelKey, db.settings.lang)}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4">
        <div className="card p-3 flex items-center gap-3 border-[#E5DEC9] bg-[#FAF7F0]/60">
          <div className="w-10 h-10 rounded-full bg-[#E8DEC8] flex items-center justify-center text-[#0A5C4C] shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p id="sideName" className="font-bold text-sm ink truncate">
              {currentPatient?.name || db.book.profile.name || 'Loved One'}
            </p>
            <button
              id="logoutBtn1"
              onClick={logout}
              className="text-xs font-semibold flex items-center gap-1 mt-0.5 hover:underline cursor-pointer"
              style={{ color: 'var(--danger)' }}
            >
              <LogOut className="w-3 h-3" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
