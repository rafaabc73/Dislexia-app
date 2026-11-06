import React, { useState, useRef } from 'react';
import {
  Headphones,
  Presentation,
  Video,
  Network,
  FileText,
  Layers,
  CheckSquare,
  BarChart3,
  Table,
  Volume2,
  Mic,
  MicOff,
  FlaskConical,
  Play,
  Square,
  Upload,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  FolderSearch,
  X,
  Check,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  NOTEBOOK_FUNCTIONS,
  FIXED_SUBJECTS,
  MONTHS_PT,
} from '../../constants/curriculum';
import {
  FunctionType,
  FunctionCustomizationOptions,
  ContentLengthOption,
  QuantityOption,
  DifficultyOption,
  ImageInclusionOption,
  AudioSummaryStyle,
  PresentationStyle,
  VideoSummaryStyle,
  ReportStyle,
  QuizQuestionType,
  GeneratedArtifact,
  StudyDocument,
} from '../../types';
import {
  generateStudyFunction,
  evaluateDiscursiveAnswer,
  classifyAndExtractDocument,
} from '../../services/geminiService';
import {
  readFileAsDataUrl,
  extractBasicTextFromFile,
} from '../../services/pdfService';
import { speechService } from '../../services/speechService';

function getFunctionIcon(id: FunctionType) {
  switch (id) {
    case 'resumo_audio':
      return <Headphones className="w-4 h-4" aria-hidden="true" />;
    case 'apresentacao':
      return <Presentation className="w-4 h-4" aria-hidden="true" />;
    case 'resumo_video':
      return <Video className="w-4 h-4" aria-hidden="true" />;
    case 'mapa_mental':
      return <Network className="w-4 h-4" aria-hidden="true" />;
    case 'relatorio_resumo':
      return <FileText className="w-4 h-4" aria-hidden="true" />;
    case 'cartoes_didaticos':
      return <Layers className="w-4 h-4" aria-hidden="true" />;
    case 'testes':
      return <CheckSquare className="w-4 h-4" aria-hidden="true" />;
    case 'infografico':
      return <BarChart3 className="w-4 h-4" aria-hidden="true" />;
    case 'tabela_dados':
      return <Table className="w-4 h-4" aria-hidden="true" />;
    case 'texto_em_audio':
      return <Volume2 className="w-4 h-4" aria-hidden="true" />;
    case 'prova_interativa':
      return <Mic className="w-4 h-4" aria-hidden="true" />;
    case 'demonstracao_pratica':
      return <FlaskConical className="w-4 h-4" aria-hidden="true" />;
  }
}

// Ilustração vetorial dinâmica para opções "Com imagens" ou "Relatório interativo com imagens"
const VisualConceptDiagram: React.FC<{ caption: string; index?: number }> = ({
  caption,
  index = 0,
}) => {
  const colors = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];
  const accent = colors[index % colors.length];
  return (
    <figure
      className="my-3 p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center gap-3.5"
      style={{
        backgroundColor: 'var(--bg-subtle)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <svg
        viewBox="0 0 180 100"
        className="w-36 h-20 shrink-0 rounded-xl border bg-white/80 dark:bg-slate-900/80 p-1"
        style={{ borderColor: accent }}
        aria-hidden="true"
      >
        <rect
          x="10"
          y="22"
          width="46"
          height="56"
          rx="10"
          fill={accent}
          opacity="0.18"
          stroke={accent}
          strokeWidth="2"
        />
        <circle cx="33" cy="50" r="12" fill={accent} />
        <path
          d="M64 50 H108"
          stroke={accent}
          strokeWidth="3"
          strokeDasharray="4 3"
        />
        <polygon points="108,44 118,50 108,56" fill={accent} />
        <rect
          x="124"
          y="22"
          width="46"
          height="56"
          rx="10"
          fill={accent}
          opacity="0.9"
        />
        <circle cx="147" cy="50" r="10" fill="#ffffff" opacity="0.9" />
      </svg>
      <figcaption className="text-xs leading-snug">
        <span
          className="font-bold block mb-0.5 flex items-center gap-1"
          style={{ color: accent }}
        >
          <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Representação Visual Ilustrada
        </span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
};

export const FunctionsSidebar: React.FC = () => {
  const {
    documents,
    addDocument,
    selectedFunctionDocIds,
    setSelectedFunctionDocIds,
    selectedFunctionType,
    setSelectedFunctionType,
    artifacts,
    addArtifact,
    activeArtifact,
    setActiveArtifact,
    settings,
    selectedYear,
    setMobilePane,
  } = useApp();

  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);
  const [pickerSubjectId, setPickerSubjectId] = useState<string>('portugues');
  const [pickerMonth, setPickerMonth] = useState<number | 'all'>('all');
  const [isUploadingAudioPdf, setIsUploadingAudioPdf] = useState(false);

  const pdfAudioInputRef = useRef<HTMLInputElement | null>(null);

  const selectedDocsList = documents.filter((d) =>
    selectedFunctionDocIds.includes(d.id)
  );

  const toggleDocSelection = (docId: string) => {
    setSelectedFunctionDocIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectFunctionCard = (funcId: FunctionType) => {
    setSelectedFunctionType(funcId);
    // Se já houver um artefato recente dessa mesma função, exibe junto ou permite configurar novo
    const matchingArt = artifacts.find((a) => a.functionType === funcId);
    setActiveArtifact(matchingArt || null);
    setMobilePane('workspace');
  };

  // Carregar PDF/Livro direto para Transformar Texto em Áudio
  const handleDirectPdfToAudio = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAudioPdf(true);
    setSelectedFunctionType('texto_em_audio');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const basicText = await extractBasicTextFromFile(file);
      const classified = await classifyAndExtractDocument(
        file.name,
        file.type || 'application/pdf',
        dataUrl,
        basicText,
        settings.geminiApiKey,
        settings.geminiModel
      );
      const now = new Date();
      const newDoc: StudyDocument = {
        id: `doc-audio-${Date.now()}`,
        title: classified.suggestedTitle,
        fileName: file.name,
        fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
        mimeType: file.type || 'application/pdf',
        dataUrl,
        extractedText: classified.extractedText,
        year: selectedYear,
        subjectId: classified.subjectId,
        month: classified.month,
        isExam: classified.isExam,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('pt-BR'),
      };
      addDocument(newDoc);

      const content = await generateStudyFunction(
        'texto_em_audio',
        [newDoc],
        settings.geminiApiKey,
        settings.geminiModel
      );
      const newArt: GeneratedArtifact = {
        id: `art-${Date.now()}`,
        functionType: 'texto_em_audio',
        title: `Texto em Áudio — ${newDoc.title}`,
        sourceDocIds: [newDoc.id],
        subjectId: newDoc.subjectId,
        createdAt: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        content,
      };
      addArtifact(newArt);
      setMobilePane('workspace');
    } finally {
      setIsUploadingAudioPdf(false);
      if (pdfAudioInputRef.current) pdfAudioInputRef.current.value = '';
    }
  };

  const pickerSubjectDocs = documents.filter(
    (d) =>
      d.subjectId === pickerSubjectId &&
      (pickerMonth === 'all' || d.month === pickerMonth)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Seleção do Material Base */}
      <div
        className="p-3.5 border-b space-y-2.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Estúdio de Funções
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Ferramentas visuais e auditivas para estudo focado
          </p>
        </div>

        {/* Campo Material Selecionado */}
        <div>
          <span
            className="block text-xs font-semibold mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Material Selecionado:
          </span>
          <button
            type="button"
            onClick={() => setIsSelectorModalOpen(true)}
            className="w-full rounded-xl px-3 py-2.5 text-xs font-semibold border flex items-center justify-between gap-2 cursor-pointer transition hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--brand-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="flex items-center gap-2 truncate">
              <FolderSearch
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--brand-primary)' }}
                aria-hidden="true"
              />
              <span className="truncate">
                {selectedDocsList.length === 0
                  ? 'Clique para selecionar matéria e arquivos...'
                  : selectedDocsList.length === 1
                    ? selectedDocsList[0].title
                    : `${selectedDocsList.length} arquivos selecionados`}
              </span>
            </span>
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Selecionar
            </span>
          </button>
        </div>

        {/* Atalho Rápido: Carregar PDF/Livro direto para Áudio */}
        <input
          ref={pdfAudioInputRef}
          type="file"
          accept=".pdf,.txt,image/*"
          onChange={handleDirectPdfToAudio}
          className="hidden"
        />
        <button
          type="button"
          disabled={isUploadingAudioPdf}
          onClick={() => pdfAudioInputRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--brand-primary)',
          }}
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {isUploadingAudioPdf
              ? 'Transformando em Áudio...'
              : 'Enviar PDF/Livro p/ Transformar em Áudio'}
          </span>
        </button>
      </div>

      {/* Grade de Retângulos das 12 Funções */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="grid grid-cols-1 gap-2">
          {NOTEBOOK_FUNCTIONS.map((fn) => {
            const isCurrentType = selectedFunctionType === fn.id;
            return (
              <button
                key={fn.id}
                type="button"
                onClick={() => handleSelectFunctionCard(fn.id)}
                className={`w-full p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  isCurrentType ? 'ring-2' : 'hover:opacity-95'
                }`}
                style={{
                  backgroundColor: isCurrentType
                    ? 'var(--bg-subtle)'
                    : 'var(--bg-surface)',
                  borderColor: isCurrentType
                    ? fn.color
                    : 'var(--border-subtle)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: fn.color }}
                >
                  {getFunctionIcon(fn.id)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate">
                      {fn.title}
                    </span>
                    {fn.badge && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          color: fn.color,
                        }}
                      >
                        {fn.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[11px] leading-snug mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {fn.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Histórico de Criações Recentes */}
        {artifacts.length > 0 && (
          <div
            className="pt-3 border-t space-y-1.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="text-[11px] font-bold uppercase px-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Gerados Recentemente
            </div>
            {artifacts.slice(0, 6).map((art) => (
              <button
                key={art.id}
                type="button"
                onClick={() => {
                  setSelectedFunctionType(art.functionType);
                  setActiveArtifact(art);
                  setMobilePane('workspace');
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate cursor-pointer border ${
                  activeArtifact?.id === art.id ? 'font-bold' : ''
                }`}
                style={{
                  backgroundColor:
                    activeArtifact?.id === art.id
                      ? 'var(--bg-subtle)'
                      : 'transparent',
                  borderColor:
                    activeArtifact?.id === art.id
                      ? 'var(--brand-primary)'
                      : 'transparent',
                }}
              >
                ✨ {art.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TELA / MODAL PARA SELECIONAR MATÉRIA, MÊS E MÚLTIPLOS ARQUIVOS (DE MESES DIFERENTES) */}
      {isSelectorModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="material-picker-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div
            className="w-full max-w-2xl rounded-2xl border shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div
              className="p-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <h2 id="material-picker-title" className="text-base font-bold">
                  Selecionar Material de Estudo
                </h2>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Escolha a matéria, filtre pelo mês e marque os arquivos que
                  deseja utilizar (você pode marcar arquivos de meses
                  diferentes!)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectorModalOpen(false)}
                aria-label="Fechar janela de seleção"
                className="p-1.5 rounded-xl border cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  1. Selecione a Matéria (Disciplina):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FIXED_SUBJECTS.map((subj) => {
                    const active = pickerSubjectId === subj.id;
                    const countInSubj = documents.filter(
                      (d) => d.subjectId === subj.id
                    ).length;
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => setPickerSubjectId(subj.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer flex items-center gap-1.5 ${
                          active ? 'text-white' : ''
                        }`}
                        style={{
                          backgroundColor: active
                            ? subj.color
                            : 'var(--bg-subtle)',
                          borderColor: active
                            ? subj.color
                            : 'var(--border-subtle)',
                        }}
                      >
                        <span>{subj.shortName}</span>
                        {countInSubj > 0 && (
                          <span className="text-[10px] opacity-90">
                            ({countInSubj})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5">
                  2. Filtrar por Mês (marque arquivos de um ou vários meses):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPickerMonth('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                      pickerMonth === 'all' ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor:
                        pickerMonth === 'all'
                          ? 'var(--brand-primary)'
                          : 'var(--bg-subtle)',
                      borderColor:
                        pickerMonth === 'all'
                          ? 'var(--brand-primary)'
                          : 'var(--border-subtle)',
                    }}
                  >
                    Todos os Meses
                  </button>
                  {MONTHS_PT.map((m) => {
                    const activeM = pickerMonth === m.number;
                    const countM = documents.filter(
                      (d) =>
                        d.subjectId === pickerSubjectId && d.month === m.number
                    ).length;
                    return (
                      <button
                        key={m.number}
                        type="button"
                        onClick={() => setPickerMonth(m.number)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer ${
                          activeM ? 'text-white font-bold' : ''
                        }`}
                        style={{
                          backgroundColor: activeM
                            ? 'var(--brand-primary)'
                            : 'var(--bg-subtle)',
                          borderColor: activeM
                            ? 'var(--brand-primary)'
                            : 'var(--border-subtle)',
                        }}
                      >
                        {m.short} {countM > 0 ? `(${countM})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">
                    3. Marque os Arquivos que Deseja Utilizar:
                  </span>
                  {pickerSubjectDocs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ids = pickerSubjectDocs.map((d) => d.id);
                        setSelectedFunctionDocIds((prev) =>
                          Array.from(new Set([...prev, ...ids]))
                        );
                      }}
                      className="text-xs font-semibold underline cursor-pointer"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      Marcar todos desta lista
                    </button>
                  )}
                </div>

                {pickerSubjectDocs.length === 0 ? (
                  <div
                    className="p-6 rounded-xl border border-dashed text-center text-xs"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Nenhum arquivo encontrado nesta matéria/mês. Carregue seus
                    PDFs ou fotos na aba <strong>Pastas</strong>!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pickerSubjectDocs.map((doc) => {
                      const isChecked = selectedFunctionDocIds.includes(doc.id);
                      const mName = MONTHS_PT.find(
                        (m) => m.number === doc.month
                      )?.name;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleDocSelection(doc.id)}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              toggleDocSelection(doc.id);
                            }
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                            isChecked ? 'ring-2 font-semibold' : ''
                          }`}
                          style={{
                            backgroundColor: isChecked
                              ? 'var(--bg-subtle)'
                              : 'var(--bg-canvas)',
                            borderColor: isChecked
                              ? 'var(--brand-primary)'
                              : 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                isChecked ? 'text-white' : ''
                              }`}
                              style={{
                                backgroundColor: isChecked
                                  ? 'var(--brand-primary)'
                                  : 'transparent',
                                borderColor: isChecked
                                  ? 'var(--brand-primary)'
                                  : 'var(--border-subtle)',
                              }}
                            >
                              {isChecked && (
                                <Check
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">
                                {doc.title}
                              </div>
                              <div
                                className="text-[11px]"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                Mês: <strong>{mName}</strong> • Registrado em:{' '}
                                {doc.formattedDate}
                                {doc.isExam ? ' • Subpasta Provas' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div
              className="p-4 border-t flex flex-wrap items-center justify-between gap-3"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="text-xs">
                <strong>{selectedDocsList.length}</strong> arquivo(s)
                selecionado(s) no total
                {selectedDocsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFunctionDocIds([])}
                    className="ml-2 text-red-500 underline cursor-pointer"
                  >
                    Limpar seleção
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsSelectorModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Confirmar Seleção ({selectedDocsList.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FunctionsWorkspace: React.FC = () => {
  const {
    selectedFunctionType,
    activeArtifact,
    addArtifact,
    updateArtifact,
    documents,
    selectedDocument,
    selectedFunctionDocIds,
    settings,
    showToast,
  } = useApp();

  // Estados de personalização das Funções
  const [lengthOpt, setLengthOpt] = useState<ContentLengthOption>('medio');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [audioStyle, setAudioStyle] =
    useState<AudioSummaryStyle>('analise_detalhada');
  const [presentationStyle, setPresentationStyle] =
    useState<PresentationStyle>('resumido');
  const [videoStyle, setVideoStyle] =
    useState<VideoSummaryStyle>('explicativo');
  const [reportStyle, setReportStyle] =
    useState<ReportStyle>('descritivo_texto');
  const [quantity, setQuantity] = useState<QuantityOption>('padrao');
  const [difficulty, setDifficulty] = useState<DifficultyOption>('medio');
  const [includeImages, setIncludeImages] =
    useState<ImageInclusionOption>('sem_imagens');
  const [quizQuestionType, setQuizQuestionType] =
    useState<QuizQuestionType>('multipla_escolha');

  const [isGenerating, setIsGenerating] = useState(false);

  // Estados de interação no resultado gerado
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [multiQuizAnswers, setMultiQuizAnswers] = useState<
    Record<number, number[]>
  >({});
  const [multiQuizChecked, setMultiQuizChecked] = useState<
    Record<number, boolean>
  >({});
  const [blankInputs, setBlankInputs] = useState<Record<number, string>>({});
  const [blankChecked, setBlankChecked] = useState<Record<number, boolean>>({});
  const [dictatingQuestionId, setDictatingQuestionId] = useState<string | null>(
    null
  );
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState<
    string | null
  >(null);

  const currentFuncType =
    selectedFunctionType || activeArtifact?.functionType || null;

  // REGRA OBRIGATÓRIA: Quando o usuário clicar em Funções, a segunda tela mais à direita
  // fica VAZIA, só aparecendo informações ao clicar em uma função específica!
  if (!currentFuncType) {
    return <div className="h-full w-full" />;
  }

  const funcMeta = NOTEBOOK_FUNCTIONS.find((f) => f.id === currentFuncType);

  const selectedDocsList = documents.filter((d) =>
    selectedFunctionDocIds.includes(d.id)
  );
  const effectiveDocs =
    selectedDocsList.length > 0
      ? selectedDocsList
      : selectedDocument
        ? [selectedDocument]
        : documents.length > 0
          ? [documents[0]]
          : [];

  const handleGenerateCustomized = async (e: React.FormEvent) => {
    e.preventDefault();

    const docsToUse: StudyDocument[] =
      effectiveDocs.length > 0
        ? effectiveDocs
        : [
            {
              id: 'custom-topic-doc',
              title: customPrompt.trim() || funcMeta?.title || 'Estudo Personalizado',
              fileName: 'estudo.txt',
              fileType: 'text',
              mimeType: 'text/plain',
              extractedText:
                customPrompt.trim() ||
                'Conteúdo base solicitado diretamente pelo estudante.',
              year: settings.currentSchoolYear,
              subjectId: 'portugues',
              month: new Date().getMonth() + 1,
              isExam: false,
              createdAt: new Date().toISOString(),
              formattedDate: new Date().toLocaleDateString('pt-BR'),
            },
          ];

    setIsGenerating(true);
    try {
      const options: FunctionCustomizationOptions = {
        length: lengthOpt,
        customPrompt: customPrompt.trim(),
        audioStyle,
        presentationStyle,
        videoStyle,
        reportStyle,
        quantity,
        difficulty,
        includeImages,
        quizQuestionType,
      };

      const content = await generateStudyFunction(
        currentFuncType,
        docsToUse,
        settings.geminiApiKey,
        settings.geminiModel,
        options
      );

      const titleSuffix =
        docsToUse.length === 1
          ? docsToUse[0].title
          : `${docsToUse.length} arquivos selecionados`;

      const newArt: GeneratedArtifact = {
        id: `art-${Date.now()}`,
        functionType: currentFuncType,
        title: `${funcMeta?.title || currentFuncType} — ${titleSuffix}`,
        sourceDocIds: docsToUse.map((d) => d.id),
        subjectId: docsToUse[0].subjectId,
        createdAt: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        optionsUsed: options,
        content,
      };

      setSlideIdx(0);
      setFlippedCards({});
      setQuizAnswers({});
      setMultiQuizAnswers({});
      setMultiQuizChecked({});
      setBlankInputs({});
      setBlankChecked({});
      addArtifact(newArt);
      showToast(`${funcMeta?.title} gerado com suas configurações!`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayAudio = (textToSpeak: string) => {
    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    setActiveSentenceIdx(0);
    speechService.speak(
      textToSpeak,
      settings.speechRate,
      () => setIsSpeaking(false),
      (charIndex) => {
        const approxSentence = Math.floor(charIndex / 95);
        setActiveSentenceIdx(approxSentence);
      }
    );
  };

  const matchingArtifact =
    activeArtifact && activeArtifact.functionType === currentFuncType
      ? activeArtifact
      : null;

  const content = matchingArtifact?.content;

  const handleUpdateExamAnswer = (qId: string, newText: string) => {
    if (!matchingArtifact || !content?.discursiveExam) return;
    const updatedExam = content.discursiveExam.map((q) =>
      q.id === qId ? { ...q, userAnswer: newText } : q
    );
    updateArtifact({
      ...matchingArtifact,
      content: { ...content, discursiveExam: updatedExam },
    });
  };

  const handleToggleQuestionDictation = (
    qId: string,
    currentAnswer: string = ''
  ) => {
    if (dictatingQuestionId === qId) {
      speechService.stopDictation();
      setDictatingQuestionId(null);
      return;
    }
    setDictatingQuestionId(qId);
    speechService.startDictation(
      (transcript) => {
        const merged = currentAnswer
          ? `${currentAnswer.trim()} ${transcript}`
          : transcript;
        handleUpdateExamAnswer(qId, merged);
      },
      () => setDictatingQuestionId(null),
      (err) => {
        alert(err);
        setDictatingQuestionId(null);
      }
    );
  };

  const handleEvaluateDiscursive = async (qId: string) => {
    if (!matchingArtifact || !content?.discursiveExam) return;
    const qObj = content.discursiveExam.find((q) => q.id === qId);
    if (!qObj) return;
    setEvaluatingQuestionId(qId);
    try {
      const result = await evaluateDiscursiveAnswer(
        qObj.question,
        qObj.expectedKeyPoints,
        qObj.userAnswer || '',
        settings.geminiApiKey,
        settings.geminiModel
      );
      const updatedExam = content.discursiveExam.map((q) =>
        q.id === qId
          ? { ...q, aiFeedback: result.feedback, score: result.score }
          : q
      );
      updateArtifact({
        ...matchingArtifact,
        content: { ...content, discursiveExam: updatedExam },
      });
    } finally {
      setEvaluatingQuestionId(null);
    }
  };

  const needsLengthSelector = [
    'resumo_audio',
    'apresentacao',
    'resumo_video',
    'relatorio_resumo',
  ].includes(currentFuncType);

  const needsQuantityDifficultyImages = [
    'cartoes_didaticos',
    'testes',
    'prova_interativa',
  ].includes(currentFuncType);

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-6">
      {/* PAINEL DE OPÇÕES DE PERSONALIZAÇÃO DA FUNÇÃO SELECIONADA */}
      <section
        aria-labelledby="function-config-heading"
        className="rounded-2xl p-5 border shadow-2xs space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: funcMeta?.color || 'var(--brand-primary)' }}
          >
            {getFunctionIcon(currentFuncType)}
          </div>
          <div>
            <h1 id="function-config-heading" className="text-lg font-bold">
              {funcMeta?.title}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Personalize as opções abaixo e clique em Gerar
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerateCustomized} className="space-y-4">
          {/* OPÇÕES ESPECÍFICAS: RESUMO EM ÁUDIO */}
          {currentFuncType === 'resumo_audio' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold">
                Formato do Resumo em Áudio:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'analise_detalhada',
                    title: 'Análise detalhada',
                    desc: 'Uma conversa animada entre dois apresentadores, que explicam e conectam temas nas suas fontes',
                  },
                  {
                    id: 'resumo',
                    title: 'Resumo',
                    desc: 'Uma breve visão geral para ajudar você a entender as ideias principais das suas fontes com rapidez',
                  },
                  {
                    id: 'critica',
                    title: 'Crítica',
                    desc: 'Uma análise especializada das suas fontes, com feedback construtivo para ajudar você a aperfeiçoar seu material',
                  },
                  {
                    id: 'debate',
                    title: 'Debate',
                    desc: 'Um debate inteligente entre dois apresentadores, que trazem diferentes perspectivas sobre suas fontes',
                  },
                ].map((opt) => {
                  const active = audioStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAudioStyle(opt.id as AudioSummaryStyle)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        active ? 'ring-2 font-semibold' : ''
                      }`}
                      style={{
                        backgroundColor: active
                          ? 'var(--bg-subtle)'
                          : 'var(--bg-canvas)',
                        borderColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      <div
                        className="text-xs font-bold mb-0.5"
                        style={{
                          color: active
                            ? 'var(--brand-primary)'
                            : 'var(--text-primary)',
                        }}
                      >
                        {opt.title}
                      </div>
                      <p
                        className="text-[11px] leading-snug"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* OPÇÕES ESPECÍFICAS: APRESENTAÇÃO */}
          {currentFuncType === 'apresentacao' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold">
                Nível de Detalhe dos Slides:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'muito_detalhado', label: 'Slide muito detalhado' },
                  { id: 'resumido', label: 'Slide resumido' },
                ].map((opt) => {
                  const active = presentationStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setPresentationStyle(opt.id as PresentationStyle)
                      }
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                        active ? 'text-white' : ''
                      }`}
                      style={{
                        backgroundColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--bg-subtle)',
                        borderColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* OPÇÕES ESPECÍFICAS: RESUMO EM VÍDEO */}
          {currentFuncType === 'resumo_video' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold">Tipo de Vídeo:</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'demonstrativo', label: 'Vídeo demonstrativo' },
                  { id: 'explicativo', label: 'Vídeo explicativo' },
                ].map((opt) => {
                  const active = videoStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setVideoStyle(opt.id as VideoSummaryStyle)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                        active ? 'text-white' : ''
                      }`}
                      style={{
                        backgroundColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--bg-subtle)',
                        borderColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* OPÇÕES ESPECÍFICAS: RELATÓRIO / RESUMO */}
          {currentFuncType === 'relatorio_resumo' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold">
                Formato do Relatório:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'descritivo_texto',
                    label: 'Relatório descritivo apenas com texto',
                  },
                  {
                    id: 'interativo_com_imagens',
                    label: 'Relatório interativo com imagens',
                  },
                ].map((opt) => {
                  const active = reportStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReportStyle(opt.id as ReportStyle)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                        active ? 'text-white' : ''
                      }`}
                      style={{
                        backgroundColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--bg-subtle)',
                        borderColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SELETOR DE TAMANHO: CURTO | MÉDIO | LONGO */}
          {needsLengthSelector && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold">
                Tamanho / Extensão:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'curto', label: 'Curto' },
                  { id: 'medio', label: 'Médio' },
                  { id: 'longo', label: 'Longo' },
                ].map((opt) => {
                  const active = lengthOpt === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setLengthOpt(opt.id as ContentLengthOption)
                      }
                      className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                        active ? 'text-white' : ''
                      }`}
                      style={{
                        backgroundColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--bg-subtle)',
                        borderColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* OPÇÕES DE QUANTIDADE, DIFICULDADE E IMAGENS (Cartões didáticos, Testes, Prova interativa) */}
          {needsQuantityDifficultyImages && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Quantidade */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold">
                  {currentFuncType === 'cartoes_didaticos'
                    ? 'Número de cards:'
                    : 'Número de perguntas:'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'menos', label: 'Menos' },
                    { id: 'padrao', label: 'Padrão' },
                    { id: 'mais', label: 'Mais' },
                  ].map((opt) => {
                    const active = quantity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setQuantity(opt.id as QuantityOption)}
                        className={`py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer ${
                          active ? 'text-white' : ''
                        }`}
                        style={{
                          backgroundColor: active
                            ? 'var(--brand-primary)'
                            : 'var(--bg-subtle)',
                          borderColor: active
                            ? 'var(--brand-primary)'
                            : 'var(--border-subtle)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nível de dificuldade */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold">
                  Nível de dificuldade:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'facil', label: 'Fácil' },
                    { id: 'medio', label: 'Médio (padrão)' },
                    { id: 'dificil', label: 'Difícil' },
                  ].map((opt) => {
                    const active = difficulty === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setDifficulty(opt.id as DifficultyOption)
                        }
                        className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold cursor-pointer ${
                          active ? 'text-white' : ''
                        }`}
                        style={{
                          backgroundColor: active
                            ? 'var(--brand-primary)'
                            : 'var(--bg-subtle)',
                          borderColor: active
                            ? 'var(--brand-primary)'
                            : 'var(--border-subtle)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Incluir imagens */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold">
                  Incluir imagens:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'com_imagens', label: 'Com imagens' },
                    { id: 'sem_imagens', label: 'Sem imagens' },
                  ].map((opt) => {
                    const active = includeImages === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setIncludeImages(opt.id as ImageInclusionOption)
                        }
                        className={`py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer ${
                          active ? 'text-white' : ''
                        }`}
                        style={{
                          backgroundColor: active
                            ? 'var(--brand-primary)'
                            : 'var(--bg-subtle)',
                          borderColor: active
                            ? 'var(--brand-primary)'
                            : 'var(--border-subtle)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TIPO DE PERGUNTA (Exclusivo para Testes) */}
          {currentFuncType === 'testes' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold">
                Tipo de pergunta:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'multipla_escolha', label: 'Múltipla escolha' },
                  {
                    id: 'multiplas_corretas',
                    label: 'Mais de uma resposta certa',
                  },
                  { id: 'preencher_lacuna', label: 'Preencher lacuna' },
                  { id: 'verdadeiro_falso', label: 'Verdadeiro ou falso' },
                ].map((opt) => {
                  const active = quizQuestionType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setQuizQuestionType(opt.id as QuizQuestionType)
                      }
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                        active ? 'text-white' : ''
                      }`}
                      style={{
                        backgroundColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--bg-subtle)',
                        borderColor: active
                          ? 'var(--brand-primary)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CAMPO DE TEXTO PARA EXPLICAR O QUE QUER E PEDIR MAIS FOCO EM ALGO ESPECÍFICO (Em todas as funções!) */}
          <div className="space-y-1.5">
            <label
              htmlFor="custom-focus-prompt"
              className="block text-xs font-bold"
            >
              O que você quer priorizar? (Explique e peça mais foco em algo
              específico):
            </label>
            <textarea
              id="custom-focus-prompt"
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ex: Quero que foque mais nas fórmulas práticas, use exemplos do cotidiano e destaque o que mais cai na prova..."
              className="w-full rounded-xl p-3 text-xs border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Fontes ativas:{' '}
              <strong>
                {effectiveDocs.length > 0
                  ? `${effectiveDocs.length} arquivo(s)`
                  : 'Instrução personalizada'}
              </strong>
            </span>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              style={{ backgroundColor: funcMeta?.color || 'var(--brand-primary)' }}
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>
                {isGenerating
                  ? 'Gerando conteúdo personalizado...'
                  : `Gerar ${funcMeta?.title}`}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* EXIBIÇÃO DO CONTEÚDO GERADO PARA A FUNÇÃO SELECIONADA */}
      {matchingArtifact && content && (
        <div className="space-y-5">
          {/* Barra Superior do Resultado */}
          <div
            className="rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div>
              <span
                className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--brand-primary)',
                }}
              >
                Resultado Gerado • {matchingArtifact.createdAt}
              </span>
              <h2 className="text-base font-bold mt-1">
                {matchingArtifact.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                handlePlayAudio(
                  content.audioScript ||
                    content.summaryText ||
                    selectedDocument?.extractedText ||
                    matchingArtifact.title
                )
              }
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-xs"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-4 h-4" aria-hidden="true" />
                  <span>Parar Áudio</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>Ouvir em Voz Alta</span>
                </>
              )}
            </button>
          </div>

          {/* 1 & 10: RESUMO EM ÁUDIO / TRANSFORMAR TEXTO EM ÁUDIO */}
          {(currentFuncType === 'resumo_audio' ||
            currentFuncType === 'texto_em_audio') && (
            <div
              className="rounded-2xl p-5 border space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <h3 className="text-sm font-bold">
                🎧 Leitura Acompanhada com Pausas Naturais
              </h3>

              <div className="space-y-2">
                {(
                  content.audioScript ||
                  content.summaryText ||
                  selectedDocument?.extractedText ||
                  ''
                )
                  .split(/(?<=[.!?])\s+/)
                  .filter((s) => s.trim().length > 0)
                  .map((sentence, idx) => {
                    const highlighted = isSpeaking && idx === activeSentenceIdx;
                    return (
                      <p
                        key={idx}
                        onClick={() =>
                          speechService.speak(sentence, settings.speechRate)
                        }
                        className={`dyslexia-reading-area p-3 rounded-xl border transition cursor-pointer ${
                          highlighted
                            ? 'font-semibold ring-2'
                            : 'hover:opacity-90'
                        }`}
                        style={{
                          backgroundColor: highlighted
                            ? 'rgba(37, 99, 235, 0.12)'
                            : 'var(--bg-canvas)',
                          borderColor: highlighted
                            ? 'var(--brand-primary)'
                            : 'var(--border-subtle)',
                        }}
                      >
                        {sentence}
                      </p>
                    );
                  })}
              </div>

              {content.dialogueLines && content.dialogueLines.length > 0 && (
                <div
                  className="pt-4 border-t space-y-2.5"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <h4 className="text-sm font-bold">
                    🎙️ Apresentadores / Diálogo em Áudio
                  </h4>
                  {content.dialogueLines.map((line, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border flex items-start justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div>
                        <div
                          className="text-xs font-bold mb-1"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          {line.speaker}
                        </div>
                        <p className="text-sm">{line.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          speechService.speak(line.text, settings.speechRate)
                        }
                        className="p-2 rounded-lg border shrink-0 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                        }}
                        aria-label={`Ouvir fala de ${line.speaker}`}
                      >
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2 & 3: APRESENTAÇÃO / RESUMO EM VÍDEO */}
          {(currentFuncType === 'apresentacao' ||
            currentFuncType === 'resumo_video') &&
            content.slides && (
              <div
                className="rounded-2xl p-6 border space-y-5"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {(() => {
                  const slides = content.slides || [];
                  const currentSlide = slides[slideIdx] || slides[0];
                  if (!currentSlide) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-full"
                          style={{
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--brand-primary)',
                          }}
                        >
                          Slide {slideIdx + 1} de {slides.length}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            speechService.speak(
                              `${currentSlide.title}.\n${currentSlide.narration}`,
                              settings.speechRate
                            )
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-subtle)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Ouvir Narração deste Slide</span>
                        </button>
                      </div>

                      <div
                        className="p-6 rounded-2xl border min-h-[220px] flex flex-col justify-between space-y-4"
                        style={{
                          backgroundColor: 'var(--bg-canvas)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="space-y-3">
                          <h3 className="text-xl font-bold">
                            {currentSlide.title}
                          </h3>
                          <ul className="space-y-2 list-disc pl-5">
                            {currentSlide.bullets.map((b, i) => (
                              <li key={i} className="dyslexia-reading-area">
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <VisualConceptDiagram
                          caption={currentSlide.visualHint}
                          index={slideIdx}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          disabled={slideIdx === 0}
                          onClick={() => setSlideIdx((p) => Math.max(0, p - 1))}
                          className="px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          style={{
                            backgroundColor: 'var(--bg-subtle)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                          <span>Anterior</span>
                        </button>

                        <button
                          type="button"
                          disabled={slideIdx >= slides.length - 1}
                          onClick={() =>
                            setSlideIdx((p) =>
                              Math.min(slides.length - 1, p + 1)
                            )
                          }
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          <span>Próximo Slide</span>
                          <ChevronRight
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

          {/* 4: MAPA MENTAL */}
          {currentFuncType === 'mapa_mental' && content.mindMap && (
            <div
              className="rounded-2xl p-6 border space-y-6"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="text-center">
                <div
                  className="inline-block px-6 py-3 rounded-2xl text-white font-bold text-base shadow-sm"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  🧠 {content.mindMap.centralTopic}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {content.mindMap.branches.map((branch, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-4 border-2 space-y-3"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: branch.color || 'var(--brand-primary)',
                    }}
                  >
                    <h3
                      className="font-bold text-sm pb-2 border-b"
                      style={{
                        color: branch.color || 'var(--brand-primary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {branch.title}
                    </h3>
                    <ul className="space-y-2 text-xs">
                      {branch.items.map((item, i) => (
                        <li
                          key={i}
                          className="p-2.5 rounded-xl border"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5: RELATÓRIO / RESUMO (Descritivo em texto ou Interativo com imagens) */}
          {currentFuncType === 'relatorio_resumo' && (
            <div
              className="rounded-2xl p-6 border space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <h3 className="text-base font-bold">
                📝{' '}
                {matchingArtifact.optionsUsed?.reportStyle ===
                'interativo_com_imagens'
                  ? 'Relatório Interativo com Imagens'
                  : 'Relatório Descritivo em Texto'}
              </h3>

              {content.reportSections && content.reportSections.length > 0 ? (
                <div className="space-y-4">
                  {content.reportSections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border space-y-2"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <h4 className="text-sm font-bold">{sec.heading}</h4>
                      <p className="dyslexia-reading-area whitespace-pre-line">
                        {sec.body}
                      </p>
                      {sec.imageCaption && (
                        <VisualConceptDiagram
                          caption={sec.imageCaption}
                          index={idx}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="dyslexia-reading-area p-4 rounded-xl border whitespace-pre-line"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  {content.summaryText}
                </div>
              )}
            </div>
          )}

          {/* 6: CARTÕES DIDÁTICOS (FLASHCARDS) */}
          {currentFuncType === 'cartoes_didaticos' && content.flashcards && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {content.flashcards.map((card, idx) => {
                const isFlipped = Boolean(flippedCards[idx]);
                return (
                  <div
                    key={idx}
                    onClick={() =>
                      setFlippedCards((p) => ({ ...p, [idx]: !p[idx] }))
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setFlippedCards((p) => ({ ...p, [idx]: !p[idx] }));
                      }
                    }}
                    className="rounded-2xl p-5 border min-h-[190px] flex flex-col justify-between cursor-pointer transition shadow-2xs hover:shadow-md"
                    style={{
                      backgroundColor: isFlipped
                        ? 'var(--bg-subtle)'
                        : 'var(--bg-surface)',
                      borderColor: isFlipped
                        ? '#16a34a'
                        : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span
                        style={{
                          color: isFlipped
                            ? '#16a34a'
                            : 'var(--brand-primary)',
                        }}
                      >
                        {isFlipped
                          ? `✅ RESPOSTA (Cartão ${idx + 1})`
                          : `❓ PERGUNTA (Cartão ${idx + 1})`}
                      </span>
                      <span className="inline-flex items-center gap-1 opacity-75">
                        <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                        Virar
                      </span>
                    </div>

                    <div className="my-3 space-y-2">
                      <p className="dyslexia-reading-area font-semibold">
                        {isFlipped ? card.back : card.front}
                      </p>
                      {card.imageCaption && (
                        <VisualConceptDiagram
                          caption={card.imageCaption}
                          index={idx}
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {card.tip
                          ? `💡 ${card.tip}`
                          : 'Toque para virar o cartão'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speechService.speak(
                            isFlipped ? card.back : card.front,
                            settings.speechRate
                          );
                        }}
                        className="p-1.5 rounded-lg border cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                        }}
                        aria-label="Ouvir cartão em áudio"
                      >
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 7: TESTES (QUIZ - Suporta Múltipla Escolha, Múltiplas Corretas, Preencher Lacuna e Verdadeiro/Falso) */}
          {currentFuncType === 'testes' && content.quizQuestions && (
            <div className="space-y-4">
              {content.quizQuestions.map((q, qIdx) => {
                const qType =
                  q.questionType ||
                  matchingArtifact.optionsUsed?.quizQuestionType ||
                  'multipla_escolha';

                const singleSelected = quizAnswers[qIdx];
                const multiSelected = multiQuizAnswers[qIdx] || [];
                const isMultiVerified = Boolean(multiQuizChecked[qIdx]);
                const isBlankVerified = Boolean(blankChecked[qIdx]);
                const showExplanation =
                  (qType === 'multipla_escolha' &&
                    singleSelected !== undefined) ||
                  (qType === 'verdadeiro_falso' &&
                    singleSelected !== undefined) ||
                  (qType === 'multiplas_corretas' && isMultiVerified) ||
                  (qType === 'preencher_lacuna' && isBlankVerified);

                return (
                  <div
                    key={qIdx}
                    className="rounded-2xl p-5 border space-y-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm whitespace-pre-line">
                        Questão {qIdx + 1}: {q.question}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          speechService.speak(
                            `${q.question}.\n${q.options?.join('.\n') || ''}`,
                            settings.speechRate
                          )
                        }
                        className="p-2 rounded-xl border shrink-0 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-subtle)',
                        }}
                        aria-label="Ouvir questão"
                      >
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    {q.imageCaption && (
                      <VisualConceptDiagram
                        caption={q.imageCaption}
                        index={qIdx}
                      />
                    )}

                    {/* Preencher Lacuna */}
                    {qType === 'preencher_lacuna' ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={blankInputs[qIdx] || ''}
                            onChange={(e) =>
                              setBlankInputs((p) => ({
                                ...p,
                                [qIdx]: e.target.value,
                              }))
                            }
                            placeholder="Digite a palavra que preenche a lacuna..."
                            className="flex-1 rounded-xl px-3 py-2 text-xs border"
                            style={{
                              backgroundColor: 'var(--bg-canvas)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setBlankChecked((p) => ({ ...p, [qIdx]: true }))
                            }
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                          >
                            Verificar Lacuna
                          </button>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              Sugestões de palavras:
                            </span>
                            {q.options.map((word, wIdx) => (
                              <button
                                key={wIdx}
                                type="button"
                                onClick={() => {
                                  setBlankInputs((p) => ({
                                    ...p,
                                    [qIdx]: word,
                                  }));
                                  setBlankChecked((p) => ({
                                    ...p,
                                    [qIdx]: true,
                                  }));
                                }}
                                className="px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--bg-subtle)',
                                  borderColor: 'var(--border-subtle)',
                                }}
                              >
                                {word}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : qType === 'multiplas_corretas' ? (
                      /* Mais de uma resposta certa */
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const picked = multiSelected.includes(optIdx);
                          const isCorrectOpt = (
                            q.correctIndices || [0, 1]
                          ).includes(optIdx);
                          let borderColor = 'var(--border-subtle)';
                          let bg = 'var(--bg-canvas)';
                          if (isMultiVerified) {
                            if (isCorrectOpt) {
                              borderColor = '#16a34a';
                              bg = 'rgba(22, 163, 74, 0.14)';
                            } else if (picked) {
                              borderColor = '#dc2626';
                              bg = 'rgba(220, 38, 38, 0.14)';
                            }
                          } else if (picked) {
                            borderColor = 'var(--brand-primary)';
                            bg = 'var(--bg-subtle)';
                          }
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                setMultiQuizAnswers((p) => {
                                  const cur = p[qIdx] || [];
                                  const next = cur.includes(optIdx)
                                    ? cur.filter((i) => i !== optIdx)
                                    : [...cur, optIdx];
                                  return { ...p, [qIdx]: next };
                                });
                              }}
                              className="w-full text-left p-3 rounded-xl border text-xs font-medium flex items-center gap-2.5 cursor-pointer"
                              style={{ backgroundColor: bg, borderColor }}
                            >
                              <span
                                className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                                style={{
                                  borderColor: picked
                                    ? 'var(--brand-primary)'
                                    : 'var(--border-subtle)',
                                }}
                              >
                                {picked && '✓'}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() =>
                            setMultiQuizChecked((p) => ({
                              ...p,
                              [qIdx]: true,
                            }))
                          }
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          Confirmar Alternativas Marcadas
                        </button>
                      </div>
                    ) : (
                      /* Múltipla escolha tradicional ou Verdadeiro / Falso */
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = optIdx === q.correctIndex;
                          const isPicked = singleSelected === optIdx;
                          let borderColor = 'var(--border-subtle)';
                          let bg = 'var(--bg-canvas)';
                          if (singleSelected !== undefined) {
                            if (isCorrect) {
                              borderColor = '#16a34a';
                              bg = 'rgba(22, 163, 74, 0.14)';
                            } else if (isPicked) {
                              borderColor = '#dc2626';
                              bg = 'rgba(220, 38, 38, 0.14)';
                            }
                          }
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() =>
                                setQuizAnswers((p) => ({
                                  ...p,
                                  [qIdx]: optIdx,
                                }))
                              }
                              className="w-full text-left p-3 rounded-xl border text-xs font-medium cursor-pointer transition"
                              style={{ backgroundColor: bg, borderColor }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {showExplanation && (
                      <div
                        className="p-3 rounded-xl text-xs border"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <strong>Explicação:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 8: INFOGRÁFICO */}
          {currentFuncType === 'infografico' && content.infographic && (
            <div
              className="rounded-2xl p-6 border space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <h3 className="text-base font-bold">
                {content.infographic.subtitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content.infographic.steps.map((step, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border flex items-start gap-3.5"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      {step.number}
                    </div>
                    <div className="space-y-1">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--brand-primary)',
                        }}
                      >
                        {step.highlight}
                      </span>
                      <h4 className="text-sm font-bold">{step.title}</h4>
                      <p
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9: TABELA DOS DADOS */}
          {currentFuncType === 'tabela_dados' && content.dataTable && (
            <div
              className="rounded-2xl p-5 border overflow-x-auto"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <table className="w-full text-left border-collapse text-xs">
                <caption className="text-left font-bold text-sm mb-3">
                  📋 Tabela Organizadora de Dados e Conceitos
                </caption>
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderBottom: '2px solid var(--border-subtle)',
                    }}
                  >
                    {content.dataTable.headers.map((h, i) => (
                      <th key={i} scope="col" className="p-3 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.dataTable.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="border-b"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 11: PROVA INTERATIVA (DISCURSIVA COM ÁUDIO E DITADO) */}
          {currentFuncType === 'prova_interativa' && content.discursiveExam && (
            <div className="space-y-4">
              {content.discursiveExam.map((q, idx) => {
                const isDictatingThis = dictatingQuestionId === q.id;
                const isEvaluatingThis = evaluatingQuestionId === q.id;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl p-5 border space-y-3.5"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-bold flex-1">
                        Questão {idx + 1}: {q.question}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          speechService.speak(
                            `Questão ${idx + 1}.\n${q.question}.\nDica: ${q.hint}`,
                            settings.speechRate
                          )
                        }
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                      >
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Ouvir Pergunta</span>
                      </button>
                    </div>

                    {q.imageCaption && (
                      <VisualConceptDiagram
                        caption={q.imageCaption}
                        index={idx}
                      />
                    )}

                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      💡 <strong>Dica de Apoio:</strong> {q.hint}
                    </p>

                    <div className="space-y-2">
                      <label
                        htmlFor={`exam-answer-${q.id}`}
                        className="block text-xs font-semibold"
                      >
                        Sua Resposta (digite ou fale usando o botão de
                        microfone):
                      </label>
                      <textarea
                        id={`exam-answer-${q.id}`}
                        rows={3}
                        value={q.userAnswer || ''}
                        onChange={(e) =>
                          handleUpdateExamAnswer(q.id, e.target.value)
                        }
                        placeholder="Toque em 'Responder como Áudio / Ditado' abaixo e fale normalmente, ou escreva aqui..."
                        className="w-full rounded-xl p-3 text-sm border"
                        style={{
                          backgroundColor: 'var(--bg-canvas)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleQuestionDictation(
                            q.id,
                            q.userAnswer || ''
                          )
                        }
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
                          isDictatingThis
                            ? 'bg-red-600 text-white border-red-600'
                            : ''
                        }`}
                        style={
                          !isDictatingThis
                            ? {
                                backgroundColor: 'var(--bg-subtle)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-primary)',
                              }
                            : undefined
                        }
                      >
                        {isDictatingThis ? (
                          <>
                            <MicOff className="w-4 h-4" aria-hidden="true" />
                            <span>Parar Gravação de Voz</span>
                          </>
                        ) : (
                          <>
                            <Mic
                              className="w-4 h-4 text-red-500"
                              aria-hidden="true"
                            />
                            <span>Responder como Áudio / Ditado</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isEvaluatingThis}
                        onClick={() => handleEvaluateDiscursive(q.id)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                        style={{ backgroundColor: '#16a34a' }}
                      >
                        {isEvaluatingThis
                          ? 'Avaliando sua resposta...'
                          : 'Corrigir Minha Resposta'}
                      </button>
                    </div>

                    {q.aiFeedback && (
                      <div
                        className="p-3.5 rounded-xl border text-xs space-y-1.5"
                        style={{
                          backgroundColor: 'rgba(22, 163, 74, 0.1)',
                          borderColor: '#16a34a',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            Avaliação: {q.score}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              speechService.speak(
                                q.aiFeedback!,
                                settings.speechRate
                              )
                            }
                            className="inline-flex items-center gap-1 font-semibold underline cursor-pointer"
                          >
                            <Volume2
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                            Ouvir Correção
                          </button>
                        </div>
                        <p>{q.aiFeedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 12: DEMONSTRAÇÃO PRÁTICA */}
          {currentFuncType === 'demonstracao_pratica' &&
            content.practicalDemos && (
              <div className="space-y-4">
                {content.practicalDemos.map((demo, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-6 border space-y-4"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <h3 className="text-base font-bold text-purple-600 dark:text-purple-400">
                      🧪 {demo.title}
                    </h3>
                    <div
                      className="p-3.5 rounded-xl border text-sm"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <strong>Onde isso aparece na vida real:</strong>{' '}
                      {demo.everydaySituation}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase">
                        Passo a Passo Prático:
                      </h4>
                      <ol className="space-y-2">
                        {demo.stepByStepExperiment.map((step, sIdx) => (
                          <li
                            key={sIdx}
                            className="p-3 rounded-xl border text-sm"
                            style={{
                              backgroundColor: 'var(--bg-subtle)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div
                      className="p-3 rounded-xl text-xs font-medium"
                      style={{
                        backgroundColor: 'rgba(147, 51, 234, 0.12)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      ✨ <strong>Por que funciona para Dislexia e TDAH:</strong>{' '}
                      {demo.whyItMatters}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
};
