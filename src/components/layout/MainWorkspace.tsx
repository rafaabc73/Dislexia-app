import React from 'react';
import { useApp } from '../../context/AppContext';
import { FoldersWorkspace } from '../modules/FoldersModule';
import { FunctionsWorkspace } from '../modules/FunctionsModule';
import { BoardCopyWorkspace } from '../modules/BoardCopyModule';
import { AgendaWorkspace } from '../modules/AgendaModule';
import { PlanningWorkspace } from '../modules/PlanningModule';
import { CorrectionWorkspace } from '../modules/CorrectionModule';
import { MathWorkspace } from '../modules/MathModule';
import { EssayWorkspace } from '../modules/EssayModule';
import { SettingsWorkspace } from '../modules/SettingsModule';

export const MainWorkspace: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main
      id="main-workspace"
      tabIndex={-1}
      className="flex-1 h-full overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {activeTab === 'pastas' && <FoldersWorkspace />}
      {activeTab === 'funcoes' && <FunctionsWorkspace />}
      {activeTab === 'copia' && <BoardCopyWorkspace />}
      {activeTab === 'agenda' && <AgendaWorkspace />}
      {activeTab === 'planejamento' && <PlanningWorkspace />}
      {activeTab === 'correcao' && <CorrectionWorkspace />}
      {activeTab === 'matematica' && <MathWorkspace />}
      {activeTab === 'redacao' && <EssayWorkspace />}
      {activeTab === 'configuracoes' && <SettingsWorkspace />}
    </main>
  );
};

