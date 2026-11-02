import React from 'react';
import { useApp } from '../../context/AppContext';
import { FoldersSidebar } from '../modules/FoldersModule';
import { FunctionsSidebar } from '../modules/FunctionsModule';
import { BoardCopySidebar } from '../modules/BoardCopyModule';
import { AgendaSidebar } from '../modules/AgendaModule';
import { PlanningSidebar } from '../modules/PlanningModule';
import { CorrectionSidebar } from '../modules/CorrectionModule';
import { SettingsSidebar } from '../modules/SettingsModule';

export const SidebarPanel: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <aside
      aria-label="Painel Lateral da Funcionalidade Selecionada"
      className="w-full lg:w-[290px] xl:w-[310px] shrink-0 h-full border-r flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {activeTab === 'pastas' && <FoldersSidebar />}
      {activeTab === 'funcoes' && <FunctionsSidebar />}
      {activeTab === 'copia' && <BoardCopySidebar />}
      {activeTab === 'agenda' && <AgendaSidebar />}
      {activeTab === 'planejamento' && <PlanningSidebar />}
      {activeTab === 'correcao' && <CorrectionSidebar />}
      {activeTab === 'configuracoes' && <SettingsSidebar />}
    </aside>
  );
};

