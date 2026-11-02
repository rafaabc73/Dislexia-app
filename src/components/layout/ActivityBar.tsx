import React from 'react';
import {
  FolderTree,
  Sparkles,
  Camera,
  CalendarClock,
  Compass,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActivityTab } from '../../types';

interface NavItem {
  id: ActivityTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const ActivityBar: React.FC = () => {
  const { activeTab, setActiveTab, setMobilePane, agendaItems } = useApp();

  const pendingAlerts = agendaItems.filter((a) => !a.completed && a.alertActive).length;

  const topItems: NavItem[] = [
    {
      id: 'pastas',
      label: 'Pastas',
      icon: <FolderTree className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'funcoes',
      label: 'Funções',
      icon: <Sparkles className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'copia',
      label: 'Cópia',
      icon: <Camera className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: <CalendarClock className="w-5 h-5" aria-hidden="true" />,
      badge: pendingAlerts > 0 ? pendingAlerts : undefined,
    },
    {
      id: 'planejamento',
      label: 'Planejamento',
      icon: <Compass className="w-5 h-5" aria-hidden="true" />,
    },
    {
      id: 'correcao',
      label: 'Correção',
      icon: <CheckCircle2 className="w-5 h-5" aria-hidden="true" />,
    },
  ];

  const handleSelect = (tab: ActivityTab) => {
    setActiveTab(tab);
    setMobilePane('sidebar');
  };

  return (
    <nav
      aria-label="Menu Principal de Ferramentas"
      className="w-[72px] shrink-0 flex flex-col justify-between items-center py-3 select-none border-r"
      style={{
        backgroundColor: 'var(--bg-activity)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Topo: Logo + 6 Módulos Principais */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 font-bold text-white shadow-sm"
          style={{ backgroundColor: 'var(--brand-primary)' }}
          aria-hidden="true"
        >
          DA
        </div>

        {topItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-pressed={isActive}
              className={`relative w-full py-2.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive ? 'font-semibold shadow-xs' : 'opacity-75 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-primary)',
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  aria-hidden="true"
                />
              )}
              {item.icon}
              <span className="text-[10px] leading-tight tracking-tight text-center">
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span
                  className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white bg-amber-500"
                  aria-label={`${item.badge} alertas pendentes`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Parte Inferior: Engrenagem de Configurações (Padrão VSCode) */}
      <div className="w-full px-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          type="button"
          onClick={() => handleSelect('configuracoes')}
          aria-pressed={activeTab === 'configuracoes'}
          className={`relative w-full py-2.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'configuracoes'
              ? 'font-semibold shadow-xs'
              : 'opacity-75 hover:opacity-100'
          }`}
          style={{
            backgroundColor:
              activeTab === 'configuracoes' ? 'var(--bg-surface)' : 'transparent',
            color:
              activeTab === 'configuracoes'
                ? 'var(--brand-primary)'
                : 'var(--text-primary)',
          }}
        >
          {activeTab === 'configuracoes' && (
            <span
              className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full"
              style={{ backgroundColor: 'var(--brand-primary)' }}
              aria-hidden="true"
            />
          )}
          <Settings className="w-5 h-5" aria-hidden="true" />
          <span className="text-[10px] leading-tight tracking-tight text-center">
            Ajustes
          </span>
        </button>
      </div>
    </nav>
  );
};

