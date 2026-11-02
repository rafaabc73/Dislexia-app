import React from 'react';
import { PanelLeft, LayoutGrid, MessageSquare } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { ActivityBar } from './components/layout/ActivityBar';
import { SidebarPanel } from './components/layout/SidebarPanel';
import { MainWorkspace } from './components/layout/MainWorkspace';
import { FocusedChatColumn } from './components/layout/FocusedChatColumn';
import { ReadingRuler } from './components/layout/ReadingRuler';

const AppShell: React.FC = () => {
  const { mobilePane, setMobilePane, toastMessage } = useApp();

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Skip link para acessibilidade por teclado */}
      <a href="#main-workspace" className="visually-hidden">
        Pular para o bloco principal de estudos
      </a>

      {/* Régua de Leitura Opcional para Dislexia */}
      <ReadingRuler />

      {/* Notificação Toast de Triagem Automática / Ações */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg text-xs font-bold text-white flex items-center gap-2"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <span>✨ {toastMessage}</span>
        </div>
      )}

      {/* Layout Principal em 4 Colunas no Computador (VSCode + NotebookLM) */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1ª Coluna (Mais à Esquerda): Barra de Atividades estilo VS Code */}
        <ActivityBar />

        {/* Visão Desktop (lg+): 2ª, 3ª e 4ª Colunas Lado a Lado */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* 2ª Coluna: Painel Lateral da Opção Selecionada */}
          <SidebarPanel />

          {/* 3ª Coluna (2ª da direita): Bloco Principal de Arquivos e Resultados */}
          <MainWorkspace />

          {/* 4ª Coluna (Mais à Direita): Chat de IA com Trava de Foco */}
          <FocusedChatColumn />
        </div>

        {/* Visão Mobile / iPhone (iOS): Alternância Limpa sem Poluição Visual */}
        <div className="flex lg:hidden flex-1 overflow-hidden">
          {mobilePane === 'sidebar' && <SidebarPanel />}
          {mobilePane === 'workspace' && <MainWorkspace />}
          {mobilePane === 'chat' && <FocusedChatColumn />}
        </div>
      </div>

      {/* Barra Inferior Exclusiva para Telas de Celular (iOS) */}
      <nav
        aria-label="Alternar Colunas no Celular"
        className="flex lg:hidden border-t h-14 shrink-0 items-center justify-around px-2"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onClick={() => setMobilePane('sidebar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
            mobilePane === 'sidebar' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor:
              mobilePane === 'sidebar' ? 'var(--brand-primary)' : 'transparent',
          }}
        >
          <PanelLeft className="w-4 h-4" aria-hidden="true" />
          <span>Opções</span>
        </button>

        <button
          type="button"
          onClick={() => setMobilePane('workspace')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
            mobilePane === 'workspace' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor:
              mobilePane === 'workspace'
                ? 'var(--brand-primary)'
                : 'transparent',
          }}
        >
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
          <span>Bloco Principal</span>
        </button>

        <button
          type="button"
          onClick={() => setMobilePane('chat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
            mobilePane === 'chat' ? 'text-white' : ''
          }`}
          style={{
            backgroundColor:
              mobilePane === 'chat' ? 'var(--brand-primary)' : 'transparent',
          }}
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          <span>Chat IA</span>
        </button>
      </nav>
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;

