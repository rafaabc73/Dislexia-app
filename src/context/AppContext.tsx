import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ActivityTab,
  MobilePane,
  StudyDocument,
  GeneratedArtifact,
  BoardCopyItem,
  AgendaItem,
  StudyPlan,
  ExamCorrection,
  AppSettings,
  ChatMessage,
} from '../types';
import {
  INITIAL_DOCUMENTS,
  INITIAL_AGENDA,
  INITIAL_BOARD_COPIES,
  FIXED_SUBJECTS,
} from '../constants/curriculum';
import {
  loadFromStorage,
  saveToStorage,
  loadSettings,
  saveSettings,
} from '../services/storageService';

interface AppContextType {
  activeTab: ActivityTab;
  setActiveTab: (tab: ActivityTab) => void;
  mobilePane: MobilePane;
  setMobilePane: (pane: MobilePane) => void;

  // Seleção de Pastas e Documentos
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  selectedMonth: number | null; // null = todos os meses
  setSelectedMonth: (month: number | null) => void;
  selectedSubfolder: 'all' | 'month' | 'provas';
  setSelectedSubfolder: (sub: 'all' | 'month' | 'provas') => void;

  documents: StudyDocument[];
  addDocument: (doc: StudyDocument) => void;
  updateDocument: (doc: StudyDocument) => void;
  deleteDocument: (id: string) => void;
  selectedDocument: StudyDocument | null;
  setSelectedDocument: (doc: StudyDocument | null) => void;

  // Artefatos gerados nas Funções (NotebookLM + Extras)
  artifacts: GeneratedArtifact[];
  addArtifact: (art: GeneratedArtifact) => void;
  updateArtifact: (art: GeneratedArtifact) => void;
  activeArtifact: GeneratedArtifact | null;
  setActiveArtifact: (art: GeneratedArtifact | null) => void;

  // Módulo Cópia (Quadro)
  boardCopies: BoardCopyItem[];
  addBoardCopy: (item: BoardCopyItem) => void;
  activeBoardCopy: BoardCopyItem | null;
  setActiveBoardCopy: (item: BoardCopyItem | null) => void;

  // Módulo Agenda
  agendaItems: AgendaItem[];
  addAgendaItems: (items: AgendaItem[]) => void;
  toggleAgendaItem: (id: string) => void;
  deleteAgendaItem: (id: string) => void;

  // Módulo Planejamento
  studyPlans: StudyPlan[];
  addStudyPlan: (plan: StudyPlan) => void;
  togglePlanStep: (planId: string, stepId: string) => void;
  activeStudyPlan: StudyPlan | null;
  setActiveStudyPlan: (plan: StudyPlan | null) => void;

  // Módulo Correção
  corrections: ExamCorrection[];
  addCorrection: (corr: ExamCorrection) => void;
  updateCorrectionMode: (id: string, mode: 'audio' | 'dialogo') => void;
  activeCorrection: ExamCorrection | null;
  setActiveCorrection: (corr: ExamCorrection | null) => void;

  // Configurações e Tema
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  importBackupJson: (jsonStr: string) => Promise<boolean>;

  // Chat Focado (4ª Coluna)
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // Notificação visual rápida
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [activeTab, setActiveTab] = useState<ActivityTab>('pastas');
  const [mobilePane, setMobilePane] = useState<MobilePane>('workspace');

  const [selectedYear, setSelectedYear] = useState<string>(settings.currentSchoolYear);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ciencias');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(11);
  const [selectedSubfolder, setSelectedSubfolder] = useState<'all' | 'month' | 'provas'>('all');

  const [documents, setDocuments] = useState<StudyDocument[]>(INITIAL_DOCUMENTS);
  const [selectedDocument, setSelectedDocument] = useState<StudyDocument | null>(
    INITIAL_DOCUMENTS[1]
  );

  const [artifacts, setArtifacts] = useState<GeneratedArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState<GeneratedArtifact | null>(null);

  const [boardCopies, setBoardCopies] = useState<BoardCopyItem[]>(INITIAL_BOARD_COPIES);
  const [activeBoardCopy, setActiveBoardCopy] = useState<BoardCopyItem | null>(
    INITIAL_BOARD_COPIES[0]
  );

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(INITIAL_AGENDA);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [activeStudyPlan, setActiveStudyPlan] = useState<StudyPlan | null>(null);

  const [corrections, setCorrections] = useState<ExamCorrection[]>([]);
  const [activeCorrection, setActiveCorrection] = useState<ExamCorrection | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-chat',
      role: 'assistant',
      text: 'Olá! Eu sou seu assistente de estudo focado. Estou configurado para te ajudar exclusivamente na matéria que você estiver estudando agora, sem distrações. Qual é a sua dúvida?',
      timestamp: 'Agora',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  // Carregar dados salvos localmente do IndexedDB na inicialização
  useEffect(() => {
    (async () => {
      const savedDocs = await loadFromStorage<StudyDocument[]>('documents', INITIAL_DOCUMENTS);
      const savedArts = await loadFromStorage<GeneratedArtifact[]>('artifacts', []);
      const savedCopies = await loadFromStorage<BoardCopyItem[]>(
        'boardCopies',
        INITIAL_BOARD_COPIES
      );
      const savedAgenda = await loadFromStorage<AgendaItem[]>('agenda', INITIAL_AGENDA);
      const savedPlans = await loadFromStorage<StudyPlan[]>('plans', []);
      const savedCorrections = await loadFromStorage<ExamCorrection[]>('corrections', []);

      setDocuments(savedDocs);
      if (savedDocs.length > 0) {
        setSelectedDocument(savedDocs[1] || savedDocs[0]);
      }
      setArtifacts(savedArts);
      if (savedArts.length > 0) setActiveArtifact(savedArts[0]);
      setBoardCopies(savedCopies);
      if (savedCopies.length > 0) setActiveBoardCopy(savedCopies[0]);
      setAgendaItems(savedAgenda);
      setStudyPlans(savedPlans);
      if (savedPlans.length > 0) setActiveStudyPlan(savedPlans[0]);
      setCorrections(savedCorrections);
      if (savedCorrections.length > 0) setActiveCorrection(savedCorrections[0]);
      setHydrated(true);
    })();
  }, []);

  // Aplicar tema claro/escuro no <meta name="color-scheme"> e variáveis de tipografia de dislexia
  useEffect(() => {
    saveSettings(settings);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      if (settings.theme === 'system') {
        meta.setAttribute('content', 'light dark');
        try {
          localStorage.removeItem('color-scheme');
        } catch {}
      } else {
        meta.setAttribute('content', settings.theme);
        try {
          localStorage.setItem('color-scheme', settings.theme);
        } catch {}
      }
    }

    const root = document.documentElement;
    root.style.setProperty(
      '--font-sans-family',
      `'${settings.fontFamily}', 'Inter', system-ui, -apple-system, sans-serif`
    );
    root.style.setProperty('--reading-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--reading-line-height', `${settings.lineHeight}`);
    root.style.setProperty('--reading-letter-spacing', `${settings.letterSpacing}em`);
  }, [settings]);

  // Persistir alterações após hidratação
  useEffect(() => {
    if (hydrated) saveToStorage('documents', documents);
  }, [documents, hydrated]);

  useEffect(() => {
    if (hydrated) saveToStorage('artifacts', artifacts);
  }, [artifacts, hydrated]);

  useEffect(() => {
    if (hydrated) saveToStorage('boardCopies', boardCopies);
  }, [boardCopies, hydrated]);

  useEffect(() => {
    if (hydrated) saveToStorage('agenda', agendaItems);
  }, [agendaItems, hydrated]);

  useEffect(() => {
    if (hydrated) saveToStorage('plans', studyPlans);
  }, [studyPlans, hydrated]);

  useEffect(() => {
    if (hydrated) saveToStorage('corrections', corrections);
  }, [corrections, hydrated]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const addDocument = (doc: StudyDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    setSelectedYear(doc.year);
    setSelectedSubjectId(doc.subjectId);
    setSelectedMonth(doc.month);
    setSelectedSubfolder(doc.isExam ? 'provas' : 'month');
    setSelectedDocument(doc);

    const subjName =
      FIXED_SUBJECTS.find((s) => s.id === doc.subjectId)?.shortName || doc.subjectId;
    showToast(
      `Enviado automaticamente para: ${doc.year} ➔ ${subjName} ➔ ${
        doc.isExam ? 'Subpasta Provas' : `Mês ${doc.month}`
      } (${doc.formattedDate})`
    );
  };

  const updateDocument = (doc: StudyDocument) => {
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    if (selectedDocument?.id === doc.id) {
      setSelectedDocument(doc);
    }
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (selectedDocument?.id === id) {
        setSelectedDocument(next[0] || null);
      }
      return next;
    });
  };

  const addArtifact = (art: GeneratedArtifact) => {
    setArtifacts((prev) => [art, ...prev]);
    setActiveArtifact(art);
  };

  const updateArtifact = (art: GeneratedArtifact) => {
    setArtifacts((prev) => prev.map((a) => (a.id === art.id ? art : a)));
    if (activeArtifact?.id === art.id) {
      setActiveArtifact(art);
    }
  };

  const addBoardCopy = (item: BoardCopyItem) => {
    setBoardCopies((prev) => [item, ...prev]);
    setActiveBoardCopy(item);
  };

  const addAgendaItems = (items: AgendaItem[]) => {
    setAgendaItems((prev) => [...items, ...prev]);
  };

  const toggleAgendaItem = (id: string) => {
    setAgendaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const deleteAgendaItem = (id: string) => {
    setAgendaItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addStudyPlan = (plan: StudyPlan) => {
    setStudyPlans((prev) => [plan, ...prev]);
    setActiveStudyPlan(plan);
  };

  const togglePlanStep = (planId: string, stepId: string) => {
    setStudyPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== planId) return plan;
        const updated = {
          ...plan,
          schedule: plan.schedule.map((s) =>
            s.id === stepId ? { ...s, completed: !s.completed } : s
          ),
        };
        if (activeStudyPlan?.id === planId) {
          setActiveStudyPlan(updated);
        }
        return updated;
      })
    );
  };

  const addCorrection = (corr: ExamCorrection) => {
    setCorrections((prev) => [corr, ...prev]);
    setActiveCorrection(corr);
  };

  const updateCorrectionMode = (id: string, mode: 'audio' | 'dialogo') => {
    setCorrections((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, mode };
        if (activeCorrection?.id === id) setActiveCorrection(updated);
        return updated;
      })
    );
  };

  const addChatMessage = (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: 'Conversa limpa! Continuamos focados na matéria atual. Qual é a sua dúvida?',
        timestamp: 'Agora',
      },
    ]);
  };

  const importBackupJson = async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.documents)) setDocuments(parsed.documents);
      if (Array.isArray(parsed.artifacts)) setArtifacts(parsed.artifacts);
      if (Array.isArray(parsed.boardCopies)) setBoardCopies(parsed.boardCopies);
      if (Array.isArray(parsed.agenda)) setAgendaItems(parsed.agenda);
      if (Array.isArray(parsed.plans)) setStudyPlans(parsed.plans);
      if (Array.isArray(parsed.corrections)) setCorrections(parsed.corrections);
      if (parsed.settings) {
        updateSettings({
          ...parsed.settings,
          geminiApiKey: settings.geminiApiKey || parsed.settings.geminiApiKey || '',
        });
      }
      showToast('Backup importado com sucesso!');
      return true;
    } catch {
      showToast('Erro ao importar arquivo de backup.');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        mobilePane,
        setMobilePane,
        selectedYear,
        setSelectedYear,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedMonth,
        setSelectedMonth,
        selectedSubfolder,
        setSelectedSubfolder,
        documents,
        addDocument,
        updateDocument,
        deleteDocument,
        selectedDocument,
        setSelectedDocument,
        artifacts,
        addArtifact,
        updateArtifact,
        activeArtifact,
        setActiveArtifact,
        boardCopies,
        addBoardCopy,
        activeBoardCopy,
        setActiveBoardCopy,
        agendaItems,
        addAgendaItems,
        toggleAgendaItem,
        deleteAgendaItem,
        studyPlans,
        addStudyPlan,
        togglePlanStep,
        activeStudyPlan,
        setActiveStudyPlan,
        corrections,
        addCorrection,
        updateCorrectionMode,
        activeCorrection,
        setActiveCorrection,
        settings,
        updateSettings,
        importBackupJson,
        chatMessages,
        addChatMessage,
        clearChat,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

