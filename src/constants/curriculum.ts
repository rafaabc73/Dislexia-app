import {
  StudyDocument,
  AgendaItem,
  BoardCopyItem,
  FunctionType,
} from '../types';

export interface SubjectDefinition {
  id: string;
  name: string;
  shortName: string;
  color: string;
  iconName: string;
  isGeneralInfo?: boolean;
}

export const SCHOOL_YEARS: string[] = [
  '2025 - 6º Ano',
  '2026 - 7º Ano',
  '2027 - 8º Ano',
  '2028 - 9º Ano',
  'Ensino Médio - 1º Ano',
  'Ensino Médio - 2º Ano',
  'Ensino Médio - 3º Ano',
];

export const MONTHS_PT: Array<{ number: number; name: string; short: string }> = [
  { number: 1, name: 'Janeiro', short: 'Jan' },
  { number: 2, name: 'Fevereiro', short: 'Fev' },
  { number: 3, name: 'Março', short: 'Mar' },
  { number: 4, name: 'Abril', short: 'Abr' },
  { number: 5, name: 'Maio', short: 'Mai' },
  { number: 6, name: 'Junho', short: 'Jun' },
  { number: 7, name: 'Julho', short: 'Jul' },
  { number: 8, name: 'Agosto', short: 'Ago' },
  { number: 9, name: 'Setembro', short: 'Set' },
  { number: 10, name: 'Outubro', short: 'Out' },
  { number: 11, name: 'Novembro', short: 'Nov' },
  { number: 12, name: 'Dezembro', short: 'Dez' },
];

export const FIXED_SUBJECTS: SubjectDefinition[] = [
  {
    id: 'informacoes_gerais',
    name: 'Informações Gerais (Boletim e Notas)',
    shortName: 'Boletim / Geral',
    color: '#0284c7',
    iconName: 'Award',
    isGeneralInfo: true,
  },
  {
    id: 'portugues',
    name: 'Língua Portuguesa',
    shortName: 'Português',
    color: '#2563eb',
    iconName: 'BookOpen',
  },
  {
    id: 'matematica',
    name: 'Matemática',
    shortName: 'Matemática',
    color: '#dc2626',
    iconName: 'Calculator',
  },
  {
    id: 'ciencias',
    name: 'Ciências / Biologia',
    shortName: 'Ciências',
    color: '#16a34a',
    iconName: 'Microscope',
  },
  {
    id: 'historia',
    name: 'História',
    shortName: 'História',
    color: '#d97706',
    iconName: 'Landmark',
  },
  {
    id: 'geografia',
    name: 'Geografia',
    shortName: 'Geografia',
    color: '#0d9488',
    iconName: 'Globe',
  },
  {
    id: 'ingles',
    name: 'Língua Inglesa',
    shortName: 'Inglês',
    color: '#7c3aed',
    iconName: 'Languages',
  },
  {
    id: 'fisica',
    name: 'Física',
    shortName: 'Física',
    color: '#4f46e5',
    iconName: 'Atom',
  },
  {
    id: 'quimica',
    name: 'Química',
    shortName: 'Química',
    color: '#db2777',
    iconName: 'FlaskConical',
  },
  {
    id: 'redacao',
    name: 'Redação e Leitura',
    shortName: 'Redação',
    color: '#ea580c',
    iconName: 'PenTool',
  },
  {
    id: 'artes',
    name: 'Artes',
    shortName: 'Artes',
    color: '#9333ea',
    iconName: 'Palette',
  },
];

export interface FunctionCardDefinition {
  id: FunctionType;
  title: string;
  subtitle: string;
  badge?: string;
  color: string;
}

export const NOTEBOOK_FUNCTIONS: FunctionCardDefinition[] = [
  {
    id: 'resumo_audio',
    title: 'Resumo em áudios',
    subtitle: 'Análise detalhada, resumo rápido, crítica construtiva ou debate em áudio',
    badge: 'Áudio',
    color: '#2563eb',
  },
  {
    id: 'apresentacao',
    title: 'Apresentação',
    subtitle: 'Slides detalhados ou resumidos com as ideias principais passo a passo',
    badge: 'Slides',
    color: '#0284c7',
  },
  {
    id: 'resumo_video',
    title: 'Resumo em vídeo',
    subtitle: 'Vídeo demonstrativo ou explicativo com narração sincronizada',
    badge: 'Vídeo',
    color: '#7c3aed',
  },
  {
    id: 'mapa_mental',
    title: 'Mapa mental',
    subtitle: 'Diagrama visual conectando os conceitos-chave sem excesso de texto',
    badge: 'Visual',
    color: '#16a34a',
  },
  {
    id: 'relatorio_resumo',
    title: 'Relatório/resumo',
    subtitle: 'Relatório descritivo em texto ou relatório interativo com imagens',
    badge: 'Resumo',
    color: '#0d9488',
  },
  {
    id: 'cartoes_didaticos',
    title: 'Cartões didáticos',
    subtitle: 'Flashcards personalizados por quantidade, dificuldade e imagens',
    badge: 'Cards',
    color: '#d97706',
  },
  {
    id: 'testes',
    title: 'Testes',
    subtitle: 'Questões personalizadas (múltipla escolha, lacunas, V/F ou múltiplas corretas)',
    badge: 'Quiz',
    color: '#dc2626',
  },
  {
    id: 'infografico',
    title: 'Infográfico',
    subtitle: 'Passo a passo visual com números, destaques e linha lógica',
    badge: 'Visual',
    color: '#db2777',
  },
  {
    id: 'tabela_dados',
    title: 'Tabela dos dados',
    subtitle: 'Comparativo claro em linhas e colunas para consulta sem confusão',
    badge: 'Dados',
    color: '#4f46e5',
  },
  {
    id: 'texto_em_audio',
    title: 'Transformar texto em áudio',
    subtitle: 'Carregue PDFs, livros ou textos e ouça com leitura acompanhada',
    badge: 'Leitura',
    color: '#059669',
  },
  {
    id: 'prova_interativa',
    title: 'Prova interativa',
    subtitle: 'Prova discursiva com perguntas em áudio e resposta por voz/ditado',
    badge: 'Voz',
    color: '#ea580c',
  },
  {
    id: 'demonstracao_pratica',
    title: 'Demonstração prática',
    subtitle: 'Exemplos reais do dia a dia e experimentos práticos do conteúdo',
    badge: 'Prática',
    color: '#9333ea',
  },
];

export const INITIAL_DOCUMENTS: StudyDocument[] = [];

export const INITIAL_AGENDA: AgendaItem[] = [];

export const INITIAL_BOARD_COPIES: BoardCopyItem[] = [];

