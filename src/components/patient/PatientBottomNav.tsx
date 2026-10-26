import React from 'react';
import {
  Home,
  Gamepad2,
  Mic,
  TreePine,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { useMedha } from '../../context/MedhaContext';
import { t } from '../../services/i18n';

export const PatientBottomNav: React.FC = () => {
  const { currentPage, setPage, db } = useMedha();

  const navItems = [
    { key: 'home', Icon: Home, labelKey: 'nav_home' },
    { key: 'games', Icon: Gamepad2, labelKey: 'nav_games' },
    { key: 'diary', Icon: Mic, labelKey: 'nav_diary' },
    { key: 'tree', Icon: TreePine, labelKey: 'nav_tree' },
    { key: 'geo', Icon: ShieldCheck, labelKey: 'nav_guard' },
    { key: 'settings', Icon: Settings, labelKey: 'nav_settings' },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t px-2 pb-[env(safe-area-inset-bottom)] shadow-lg"
      style={{ borderColor: 'var(--line)' }}
    >
      <div id="botNav" className="max-w-lg mx-auto grid grid-cols-6 gap-1 py-1.5">
        {navItems.map((item) => {
          const isActive = currentPage === item.key;
          const Icon = item.Icon;
          return (
            <button
              key={item.key}
              data-page={item.key}
              onClick={() => setPage(item.key)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[var(--brand)] font-bold bg-[#FAF6EF]'
                  : 'text-[#8A7E72] hover:text-[#2B2320]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] truncate max-w-full leading-tight font-medium">
                {t(item.labelKey, db.settings.lang)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
