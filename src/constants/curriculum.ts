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
    subtitle: 'Conversa narrada em áudio estilo NotebookLM explicando o conteúdo',
    badge: 'NotebookLM',
    color: '#2563eb',
  },
  {
    id: 'apresentacao',
    title: 'Apresentação',
    subtitle: 'Slides limpos e visuais com ideias principais passo a passo',
    badge: 'NotebookLM',
    color: '#0284c7',
  },
  {
    id: 'resumo_video',
    title: 'Resumo em vídeo',
    subtitle: 'Apresentação visual animada com narração sincronizada',
    badge: 'NotebookLM',
    color: '#7c3aed',
  },
  {
    id: 'mapa_mental',
    title: 'Mapa mental',
    subtitle: 'Diagrama visual conectando os conceitos-chave sem excesso de texto',
    badge: 'NotebookLM',
    color: '#16a34a',
  },
  {
    id: 'relatorio_resumo',
    title: 'Relatório/resumo',
    subtitle: 'Resumo organizado em blocos curtos e palavras-chave destacadas',
    badge: 'NotebookLM',
    color: '#0d9488',
  },
  {
    id: 'cartoes_didaticos',
    title: 'Cartões didáticos',
    subtitle: 'Flashcards interativos de pergunta e resposta para memorização rápida',
    badge: 'NotebookLM',
    color: '#d97706',
  },
  {
    id: 'testes',
    title: 'Testes',
    subtitle: 'Quiz interativo de múltipla escolha com explicação imediata',
    badge: 'NotebookLM',
    color: '#dc2626',
  },
  {
    id: 'infografico',
    title: 'Infográfico',
    subtitle: 'Passo a passo visual com números, destaques e linha lógica',
    badge: 'NotebookLM',
    color: '#db2777',
  },
  {
    id: 'tabela_dados',
    title: 'Tabela dos dados',
    subtitle: 'Comparativo claro em linhas e colunas para consulta sem confusão',
    badge: 'NotebookLM',
    color: '#4f46e5',
  },
  {
    id: 'texto_em_audio',
    title: 'Transformar texto em áudio',
    subtitle: 'Carregue PDFs, livros ou textos e ouça com leitura acompanhada',
    badge: 'Acessibilidade',
    color: '#059669',
  },
  {
    id: 'prova_interativa',
    title: 'Prova interativa',
    subtitle: 'Prova discursiva com perguntas em áudio e resposta por voz/ditado',
    badge: 'Exclusivo',
    color: '#ea580c',
  },
  {
    id: 'demonstracao_pratica',
    title: 'Demonstração prática',
    subtitle: 'Exemplos reais do dia a dia e experimentos práticos do conteúdo',
    badge: 'Exclusivo',
    color: '#9333ea',
  },
];

export const INITIAL_DOCUMENTS: StudyDocument[] = [
  {
    id: 'doc-boletim-2026',
    title: 'Boletim Escolar - 1º e 2º Bimestre (Notas e Observações)',
    fileName: 'Boletim_Escolar_2026.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    year: '2026 - 7º Ano',
    subjectId: 'informacoes_gerais',
    month: 11,
    isExam: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    formattedDate: '01/11/2026',
    grade: 'Média Geral: 8,2',
    extractedText: `BOLETIM ESCOLAR E INFORMAÇÕES GERAIS - 7º ANO (2026)

Resumo de Desempenho por Disciplina:
• Língua Portuguesa: Nota 8,5 (Ótima participação oral; continuar praticando leitura em blocos curtos).
• Matemática: Nota 7,2 (Atenção na interpretação de problemas com frações e porcentagens).
• Ciências: Nota 9,0 (Excelente compreensão prática sobre células e fotossíntese).
• História: Nota 8,0 (Bom domínio sobre Grandes Navegações e Brasil Colonial).
• Geografia: Nota 8,5 (Ótima leitura de mapas e biomas brasileiros).
• Inglês: Nota 8,8 (Destaque nas atividades de listening e vocabulário).

Recomendações Pedagógicas (Apoio Dislexia e TDAH):
1. Tempo adicional de 30 minutos nas avaliações escritas.
2. Uso de enunciados diretos, fontes sem serifa (Sans-Serif) e leitura em voz alta das questões.
3. Dividir o estudo em blocos de 20 minutos com pausas ativas.`,
  },
  {
    id: 'doc-ciencias-fotossintese',
    title: 'Apostila: Como as Plantas Produzem Energia (Fotossíntese e Célula Vegetal)',
    fileName: 'Fotossintese_e_Celulas.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    year: '2026 - 7º Ano',
    subjectId: 'ciencias',
    month: 11,
    isExam: false,
    createdAt: '2026-11-02T09:15:00.000Z',
    formattedDate: '02/11/2026',
    extractedText: `RESUMO DE AULA: FOTOSSÍNTESE E RESPIRAÇÃO CELULAR

1. O que é a Fotossíntese?
A fotossíntese é o processo pelo qual as plantas, algas e algumas bactérias usam a luz do Sol para fabricar seu próprio alimento (glicose) e liberar oxigênio para o ar.

2. Os 4 Ingredientes Principais:
• Água (H2O): Absorvida pelas raízes no solo.
• Gás Carbônico (CO2): Retirado do ar pelas folhas.
• Luz Solar: Capturada pela clorofila (o pigmento verde dentro dos cloroplastos).
• Clorofila: Funciona como uma "placa solar" natural dentro da célula vegetal.

3. O que a planta produz no final?
• Glicose (Açúcar): Energia para a planta crescer, dar flores e frutos.
• Oxigênio (O2): Gás liberado no ar que os seres humanos e animais usam para respirar.

4. Diferença entre Fotossíntese e Respiração:
• Na Fotossíntese (só acontece com luz): entra Gás Carbônico e sai Oxigênio.
• Na Respiração (acontece dia e noite): entra Oxigênio e sai Gás Carbônico.`,
  },
  {
    id: 'doc-prova-matematica-fracoes',
    title: 'Prova Mensal de Matemática — Frações, Porcentagem e Razão',
    fileName: 'Prova_Matematica_Novembro.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    year: '2026 - 7º Ano',
    subjectId: 'matematica',
    month: 11,
    isExam: true,
    createdAt: '2026-11-02T11:30:00.000Z',
    formattedDate: '02/11/2026',
    grade: '7,0 / 10,0',
    extractedText: `PROVA DE MATEMÁTICA - 7º ANO (FRAÇÕES E PORCENTAGEM)

Questão 1: Pedro tinha uma barra de chocolate com 8 pedaços iguais e comeu 2 pedaços. Qual fração simplificada representa a parte que Pedro comeu?
Resposta do aluno na prova: 2/8 (Esqueceu de simplificar dividindo em cima e embaixo por 2, que daria 1/4).

Questão 2: Uma mochila custava R$ 200,00 e entrou em promoção com 15% de desconto. Qual é o valor do desconto em reais e quanto a mochila passou a custar?
Resposta do aluno na prova: Calculou 15% de 200 = R$ 30,00, mas respondeu R$ 30,00 como preço final da mochila em vez de subtrair 200 - 30 = R$ 170,00.

Questão 3: Some as frações 1/3 + 2/6.
Resposta do aluno na prova: Somou direto numerador com numerador e denominador com denominador (3/9), em vez de igualar os denominadores para 6 (2/6 + 2/6 = 4/6 = 2/3).`,
    studentAnswers: `Q1: Marquei 2/8 sem simplificar. Q2: Achei 30 reais mas esqueci de diminuir de 200. Q3: Somei 1+2=3 em cima e 3+6=9 embaixo.`,
  },
  {
    id: 'doc-historia-brasil-colonial',
    title: 'Resumo Ilustrado: O Ciclo da Cana-de-Açúcar no Brasil Colonial',
    fileName: 'Historia_Brasil_Colonial.pdf',
    fileType: 'pdf',
    mimeType: 'application/pdf',
    year: '2026 - 7º Ano',
    subjectId: 'historia',
    month: 10,
    isExam: false,
    createdAt: '2026-10-18T14:20:00.000Z',
    formattedDate: '18/10/2026',
    extractedText: `HISTÓRIA: O ENGENHO E O CICLO DO AÇÚCAR (SÉCULOS XVI E XVII)

1. Por que Portugal escolheu a cana-de-açúcar?
• O açúcar valia muito ouro na Europa (era vendido como artigo de luxo).
• O clima quente e úmido do Nordeste brasileiro e o solo de Massapê eram perfeitos para plantar cana.

2. Como funcionava o Engenho Colonial?
• Casa-Grande: Moradia do senhor de engenho e sua família.
• Senzala: Local onde viviam os trabalhadores escravizados.
• Moenda e Casa das Caldeiras: Onde a cana era moída e o caldo fervido até virar açúcar.
• Capela: Centro religioso da propriedade.`,
  },
];

export const INITIAL_AGENDA: AgendaItem[] = [
  {
    id: 'ag-1',
    title: 'Prova de Ciências: Fotossíntese e Célula Vegetal',
    subjectId: 'ciencias',
    dueDate: '2026-11-05',
    type: 'prova',
    description: 'Estudar os 4 ingredientes da fotossíntese e a diferença para a respiração celular.',
    completed: false,
    source: 'foto_quadro',
    alertActive: true,
  },
  {
    id: 'ag-2',
    title: 'Lista de Exercícios de Matemática (Pág. 42 - Questões 1 a 5)',
    subjectId: 'matematica',
    dueDate: '2026-11-04',
    type: 'tarefa',
    description: 'Exercícios práticos sobre desconto em porcentagem e soma de frações.',
    completed: false,
    source: 'foto_agenda',
    alertActive: true,
  },
  {
    id: 'ag-3',
    title: 'Entrega do Resumo de História (Engenho Colonial)',
    subjectId: 'historia',
    dueDate: '2026-11-09',
    type: 'trabalho',
    description: 'Pode entregar em formato de mapa mental ou cartões ilustrados.',
    completed: false,
    source: 'manual',
    alertActive: true,
  },
];

export const INITIAL_BOARD_COPIES: BoardCopyItem[] = [
  {
    id: 'copia-1',
    title: 'Quadro de Ciências: Esquema da Fotossíntese (Aula de Hoje)',
    subjectId: 'ciencias',
    createdAt: '2026-11-02T10:30:00.000Z',
    formattedDate: '02/11/2026',
    transcribedText: `ANOTAÇÕES DO QUADRO - CIÊNCIAS (PROFª HELENA)

FÓRMULA VISUAL DA FOTOSSÍNTESE:
[Água do solo] + [Gás Carbônico do ar] + [Luz do Sol] ---> [Glicose (energia)] + [Oxigênio]

DICA PARA A PROVA:
• Cloroplasto = parte da célula onde fica a Clorofila (cor verde).
• Estômatos = "portinhas" microscópicas na folha por onde entram e saem os gases.
• A planta respira 24 horas por dia, mas só faz fotossíntese quando tem LUZ!`,
    studyCards: [
      {
        front: 'Quais são os 3 elementos que entram na planta para fazer Fotossíntese?',
        back: 'Água (pelas raízes), Gás Carbônico (pelas folhas) e Luz do Sol (captada pela clorofila).',
      },
      {
        front: 'O que são os Estômatos na folha da planta?',
        back: 'São pequenas "portinhas" microscópicas que abrem e fecham para a entrada de gás carbônico e saída de oxigênio.',
      },
      {
        front: 'A planta faz fotossíntese de noite?',
        back: 'Não! A fotossíntese precisa de luz. À noite, sem luz, a planta apenas respira.',
      },
    ],
  },
];

