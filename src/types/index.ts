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

export type ContentLengthOption = 'curto' | 'medio' | 'longo';
export type QuantityOption = 'menos' | 'padrao' | 'mais';
export type DifficultyOption = 'facil' | 'medio' | 'dificil';
export type ImageInclusionOption = 'com_imagens' | 'sem_imagens';

export type AudioSummaryStyle =
  | 'analise_detalhada'
  | 'resumo'
  | 'critica'
  | 'debate';

export type PresentationStyle = 'muito_detalhado' | 'resumido';
export type VideoSummaryStyle = 'demonstrativo' | 'explicativo';
export type ReportStyle = 'descritivo_texto' | 'interativo_com_imagens';
export type QuizQuestionType =
  | 'multipla_escolha'
  | 'multiplas_corretas'
  | 'preencher_lacuna'
  | 'verdadeiro_falso';

export interface FunctionCustomizationOptions {
  length?: ContentLengthOption;
  customPrompt?: string;
  audioStyle?: AudioSummaryStyle;
  presentationStyle?: PresentationStyle;
  videoStyle?: VideoSummaryStyle;
  reportStyle?: ReportStyle;
  quantity?: QuantityOption;
  difficulty?: DifficultyOption;
  includeImages?: ImageInclusionOption;
  quizQuestionType?: QuizQuestionType;
}

export interface StudyDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'text';
  mimeType: string;
  dataUrl?: string;
  extractedText: string;
  year: string;
  subjectId: string;
  month: number;
  isExam: boolean;
  createdAt: string;
  formattedDate: string;
  grade?: string;
  studentAnswers?: string;
}

export interface GeneratedArtifact {
  id: string;
  functionType: FunctionType;
  title: string;
  sourceDocIds: string[];
  subjectId: string;
  createdAt: string;
  optionsUsed?: FunctionCustomizationOptions;
  content: {
    summaryText?: string;
    reportSections?: Array<{
      heading: string;
      body: string;
      imageCaption?: string;
      visualSvgTopic?: string;
    }>;
    audioScript?: string;
    dialogueLines?: Array<{ speaker: string; text: string }>;
    slides?: Array<{
      title: string;
      bullets: string[];
      visualHint: string;
      narration: string;
    }>;
    mindMap?: {
      centralTopic: string;
      branches: Array<{
        title: string;
        color: string;
        items: string[];
      }>;
    };
    flashcards?: Array<{
      front: string;
      back: string;
      tip?: string;
      imageCaption?: string;
    }>;
    quizQuestions?: Array<{
      questionType?: QuizQuestionType;
      question: string;
      options: string[];
      correctIndex: number;
      correctIndices?: number[];
      blankAnswer?: string;
      booleanAnswer?: boolean;
      explanation: string;
      imageCaption?: string;
    }>;
    infographic?: {
      subtitle: string;
      steps: Array<{
        number: string;
        title: string;
        description: string;
        highlight: string;
      }>;
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
      imageCaption?: string;
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
  imageUrls?: string[];
  transcribedText: string;
  studyCards: Array<{ front: string; back: string }>;
}

export interface AgendaItem {
  id: string;
  title: string;
  subjectId: string;
  dueDate: string;
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
    dialogue: Array<{
      speaker: 'Tutor IA' | 'Como Pensar na Hora';
      text: string;
    }>;
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
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  readingRulerEnabled: boolean;
  speechRate: number;
}
