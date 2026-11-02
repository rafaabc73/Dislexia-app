export type ActivityTab =
  | 'pastas'
  | 'funcoes'
  | 'copia'
  | 'agenda'
  | 'planejamento'
  | 'correcao'
  | 'configuracoes';

export type MobilePane = 'sidebar' | 'workspace' | 'chat';

export type FunctionType =
  | 'resumo_audio'
  | 'apresentacao'
  | 'resumo_video'
  | 'mapa_mental'
  | 'relatorio_resumo'
  | 'cartoes_didaticos'
  | 'testes'
  | 'infografico'
  | 'tabela_dados'
  | 'texto_em_audio'
  | 'prova_interativa'
  | 'demonstracao_pratica';

export interface StudyDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'text';
  mimeType: string;
  dataUrl?: string; // base64 for image or PDF
  extractedText: string;
  year: string; // e.g., "2026 - 7º Ano"
  subjectId: string; // e.g., "portugues", "matematica", "informacoes_gerais"
  month: number; // 1 to 12
  isExam: boolean; // true if placed in "Provas" subfolder
  createdAt: string; // ISO date string
  formattedDate: string; // DD/MM/YYYY
  grade?: string; // Optional score if exam or report card
  studentAnswers?: string; // Optional student answers for Correction module
}

export interface GeneratedArtifact {
  id: string;
  functionType: FunctionType;
  title: string;
  sourceDocIds: string[];
  subjectId: string;
  createdAt: string;
  content: {
    summaryText?: string;
    audioScript?: string;
    dialogueLines?: Array<{ speaker: 'Professor(a) Sofia' | 'Lucas (Monitor)'; text: string }>;
    slides?: Array<{ title: string; bullets: string[]; visualHint: string; narration: string }>;
    mindMap?: {
      centralTopic: string;
      branches: Array<{
        title: string;
        color: string;
        items: string[];
      }>;
    };
    flashcards?: Array<{ front: string; back: string; tip?: string }>;
    quizQuestions?: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>;
    infographic?: {
      subtitle: string;
      steps: Array<{ number: string; title: string; description: string; highlight: string }>;
    };
    dataTable?: {
      headers: string[];
      rows: string[][];
    };
    discursiveExam?: Array<{
      id: string;
      question: string;
      expectedKeyPoints: string[];
      hint: string;
      userAnswer?: string;
      aiFeedback?: string;
      score?: string;
    }>;
    practicalDemos?: Array<{
      title: string;
      everydaySituation: string;
      stepByStepExperiment: string[];
      whyItMatters: string;
    }>;
  };
}

export interface BoardCopyItem {
  id: string;
  title: string;
  subjectId: string;
  createdAt: string;
  formattedDate: string;
  imageUrl?: string;
  transcribedText: string;
  studyCards: Array<{ front: string; back: string }>;
}

export interface AgendaItem {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string; // YYYY-MM-DD
  type: 'tarefa' | 'prova' | 'trabalho' | 'lembrete';
  description: string;
  completed: boolean;
  source: 'manual' | 'foto_quadro' | 'foto_agenda';
  alertActive: boolean;
}

export interface StudyPlan {
  id: string;
  goal: string;
  deadline: string;
  difficultSubjects: string[];
  examTopics: string;
  dailyMinutes: number;
  createdAt: string;
  schedule: Array<{
    id: string;
    dayLabel: string;
    subjectName: string;
    topic: string;
    durationMinutes: number;
    technique: string;
    completed: boolean;
  }>;
}

export interface ExamCorrection {
  id: string;
  subjectId: string;
  examDocId: string;
  examTitle: string;
  createdAt: string;
  mode: 'audio' | 'dialogo';
  overallEncouragement: string;
  items: Array<{
    questionNumber: number;
    questionText: string;
    whatWasWrong: string;
    whatIsCorrect: string;
    stepByStepExplanation: string;
    dialogue: Array<{ speaker: 'Tutor IA' | 'Como Pensar na Hora'; text: string }>;
  }>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  wasRedirected?: boolean;
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  geminiApiKey: string;
  geminiModel: string;
  currentSchoolYear: string;
  fontFamily: 'Lexend' | 'Inter';
  fontSize: number; // 15 to 22
  lineHeight: number; // 1.5 to 2.2
  letterSpacing: number; // 0 to 0.08
  readingRulerEnabled: boolean;
  speechRate: number; // 0.8 to 1.3
}

