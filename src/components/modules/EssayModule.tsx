import React, { useState, useRef } from 'react';
import {
  PenTool,
  CheckCircle2,
  Blocks,
  Camera,
  Upload,
  Sparkles,
  Volume2,
  Square,
  Mic,
  MicOff,
  FolderPlus,
  Wand2,
  FileText,
  ArrowRight,
  Copy,
  Award,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  correctEnemEssay,
  generateEnemLegoStructure,
} from '../../services/geminiService';
import { extractBasicTextFromFile } from '../../services/pdfService';
import { speechService } from '../../services/speechService';
import {
  EssayCorrectionItem,
  EssayPracticeSession,
  EssayPracticeScope,
  EssayParagraphType,
  StudyDocument,
} from '../../types';

const PARAGRAPH_OPTIONS: Array<{
  id: EssayParagraphType;
  label: string;
  shortDesc: string;
  piecesCount: number;
}> = [
  {
    id: 'introducao',
    label: '1º Parágrafo: Introdução',
    shortDesc: 'Repertório + Tema + Tese (Causas 1 e 2)',
    piecesCount: 3,
  },
  {
    id: 'desenvolvimento_1',
    label: '2º Parágrafo: Desenvolvimento 1',
    shortDesc: 'Tópico Frasal + Repertório + Causa/Consequência + Fecho',
    piecesCount: 4,
  },
  {
    id: 'desenvolvimento_2',
    label: '3º Parágrafo: Desenvolvimento 2',
    shortDesc: 'Conectivo de Soma + 2º Argumento + Exemplo + Fecho',
    piecesCount: 4,
  },
  {
    id: 'conclusao',
    label: '4º Parágrafo: Conclusão (ENEM)',
    shortDesc: 'Agente + Ação + Meio + Detalhamento + Efeito',
    piecesCount: 5,
  },
];

export const EssaySidebar: React.FC = () => {
  const {
    essayMode,
    setEssayMode,
    essayCorrections,
    addEssayCorrection,
    activeEssayCorrection,
    setActiveEssayCorrection,
    essayPracticeSessions,
    addEssayPracticeSession,
    activeEssayPractice,
    setActiveEssayPractice,
    settings,
    showToast,
    setMobilePane,
  } = useApp();

  // Estado para Correção
  const [corrFiles, setCorrFiles] = useState<
    Array<{ fileName: string; mimeType: string; dataUrl: string; extractedText: string }>
  >([]);
  const [corrThemeHint, setCorrThemeHint] = useState('');
  const [corrEssayText, setCorrEssayText] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  // Estado para Praticar (Montagem em Blocos LEGO)
  const [themeSource, setThemeSource] = useState<'gerado_ia' | 'arquivo_enviado'>('gerado_ia');
  const [practiceScope, setPracticeScope] = useState<EssayPracticeScope>('redacao_completa');
  const [selectedParagraphs, setSelectedParagraphs] = useState<EssayParagraphType[]>([
    'introducao',
  ]);
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [practiceFiles, setPracticeFiles] = useState<
    Array<{ fileName: string; mimeType: string; dataUrl: string; extractedText: string }>
  >([]);
  const [isGeneratingLego, setIsGeneratingLego] = useState(false);

  const corrFileInputRef = useRef<HTMLInputElement | null>(null);
  const practiceFileInputRef = useRef<HTMLInputElement | null>(null);

  const readUploadedFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return [];
    const loaded: Array<{
      fileName: string;
      mimeType: string;
      dataUrl: string;
      extractedText: string;
    }> = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const mimeType = file.type || 'application/octet-stream';
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      let extractedText = '';
      if (
        mimeType === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        mimeType.startsWith('text/')
      ) {
        extractedText = await extractBasicTextFromFile(file);
      }

      loaded.push({
        fileName: file.name,
        mimeType,
        dataUrl,
        extractedText,
      });
    }
    return loaded;
  };

  const handleCorrFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const loaded = await readUploadedFiles(e.target.files);
    setCorrFiles((prev) => [...prev, ...loaded]);
    if (corrFileInputRef.current) corrFileInputRef.current.value = '';
  };

  const handlePracticeFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const loaded = await readUploadedFiles(e.target.files);
    setPracticeFiles((prev) => [...prev, ...loaded]);
    if (practiceFileInputRef.current) practiceFileInputRef.current.value = '';
  };

  const toggleParagraphSelection = (pId: EssayParagraphType) => {
    setSelectedParagraphs((prev) => {
      if (prev.includes(pId)) {
        if (prev.length === 1) return prev; // Mantém pelo menos 1 selecionado
        return prev.filter((item) => item !== pId);
      }
      const order: EssayParagraphType[] = [
        'introducao',
        'desenvolvimento_1',
        'desenvolvimento_2',
        'conclusao',
      ];
      return order.filter((id) => id === pId || prev.includes(id));
    });
  };

  const handleRunCorrection = async () => {
    if (corrFiles.length === 0 && !corrEssayText.trim()) {
      showToast('Envie a foto da redação ou digite/cole o texto para corrigir!');
      return;
    }

    setIsCorrecting(true);
    try {
      const combinedText = [
        ...corrFiles.map((f) => f.extractedText).filter(Boolean),
        corrEssayText.trim(),
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await correctEnemEssay(
        corrFiles.map((f) => ({
          dataUrl: f.dataUrl,
          mimeType: f.mimeType,
          fileName: f.fileName,
        })),
        combinedText,
        corrThemeHint,
        settings.geminiApiKey,
        settings.geminiModel
      );

      const now = new Date();
      const newCorr: EssayCorrectionItem = {
        id: `essay-corr-${Date.now()}`,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('pt-BR'),
        ...res,
      };

      addEssayCorrection(newCorr);
      setCorrFiles([]);
      setCorrEssayText('');
      setMobilePane('workspace');
      showToast('Correção nos critérios do ENEM concluída!');
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleStartLegoPractice = async () => {
    if (
      themeSource === 'arquivo_enviado' &&
      practiceFiles.length === 0 &&
      !customThemeInput.trim()
    ) {
      showToast('Envie a foto/arquivo da proposta entregue a você ou digite o tema!');
      return;
    }

    setIsGeneratingLego(true);
    try {
      const combinedProposalText = [
        ...practiceFiles.map((f) => f.extractedText).filter(Boolean),
        customThemeInput.trim(),
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await generateEnemLegoStructure(
        {
          themeSource,
          customThemeOrText: combinedProposalText,
          filesDataUrls: practiceFiles.map((f) => ({
            dataUrl: f.dataUrl,
            mimeType: f.mimeType,
            fileName: f.fileName,
          })),
          practiceScope,
          selectedParagraphs:
            practiceScope === 'redacao_completa'
              ? ['introducao', 'desenvolvimento_1', 'desenvolvimento_2', 'conclusao']
              : selectedParagraphs,
        },
        settings.geminiApiKey,
        settings.geminiModel
      );

      const now = new Date();
      const newSession: EssayPracticeSession = {
        id: `essay-lego-${Date.now()}`,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('pt-BR'),
        ...res,
      };

      addEssayPracticeSession(newSession);
      setPracticeFiles([]);
      setMobilePane('workspace');
      showToast('Estrutura em blocos estilo LEGO pronta para montar!');
    } finally {
      setIsGeneratingLego(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Topo e Seletor das 2 Opções: Correção e Praticar */}
      <div className="p-3.5 border-b space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PenTool className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-sm font-bold tracking-tight">Redação ENEM</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Escolha entre corrigir uma redação pronta ou praticar montando bloco a bloco.
          </p>
        </div>

        {/* Botões das 2 opções: Praticar e Correção */}
        <div
          className="grid grid-cols-2 gap-1.5 p-1 rounded-xl border"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setEssayMode('praticar')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              essayMode === 'praticar' ? 'shadow-xs text-white' : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              backgroundColor:
                essayMode === 'praticar' ? 'var(--brand-primary)' : 'transparent',
            }}
          >
            <Blocks className="w-3.5 h-3.5" />
            Praticar
          </button>

          <button
            type="button"
            onClick={() => setEssayMode('correcao')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              essayMode === 'correcao' ? 'shadow-xs text-white' : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              backgroundColor:
                essayMode === 'correcao' ? 'var(--brand-primary)' : 'transparent',
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Correção
          </button>
        </div>
      </div>

      {/* Conteúdo da Coluna Lateral conforme a opção selecionada */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {essayMode === 'correcao' ? (
          <>
            <div
              className="p-3 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <p className="text-xs font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
                1. Foto ou Arquivo da sua Redação
              </p>

              <label
                className="w-full py-3 px-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-center"
                style={{
                  borderColor: 'var(--brand-primary)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <Upload className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                <span className="text-xs font-semibold">
                  Enviar Foto da Redação ou PDF
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Avaliação nas 5 Competências do ENEM
                </span>
                <input
                  ref={corrFileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.txt"
                  multiple
                  onChange={handleCorrFilesChange}
                  className="hidden"
                />
              </label>

              {corrFiles.length > 0 && (
                <div className="space-y-1">
                  {corrFiles.map((f, i) => (
                    <div
                      key={`${f.fileName}-${i}`}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <span className="truncate">{f.fileName}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCorrFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-[11px] font-bold text-red-500 ml-2 cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold mb-1">
                  Tema da redação (opcional):
                </label>
                <input
                  type="text"
                  value={corrThemeHint}
                  onChange={(e) => setCorrThemeHint(e.target.value)}
                  placeholder="Ex: Inclusão escolar no Brasil..."
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1">
                  Ou cole/digite sua redação aqui (opcional):
                </label>
                <textarea
                  rows={4}
                  value={corrEssayText}
                  onChange={(e) => setCorrEssayText(e.target.value)}
                  placeholder="Se preferir, cole o texto da sua redação aqui para análise imediata..."
                  className="w-full p-2.5 rounded-xl border text-xs resize-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleRunCorrection}
                disabled={isCorrecting}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Sparkles className="w-4 h-4" />
                {isCorrecting
                  ? 'Avaliando pelos Critérios do ENEM...'
                  : 'Corrigir Redação (Critérios ENEM)'}
              </button>
            </div>

            {/* Histórico de Correções */}
            {essayCorrections.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <p
                  className="text-[11px] font-bold uppercase tracking-wider px-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Redações Corrigidas ({essayCorrections.length})
                </p>
                {essayCorrections.map((item) => {
                  const isSel = activeEssayCorrection?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveEssayCorrection(item);
                        setMobilePane('workspace');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer ${
                        isSel ? 'font-semibold' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSel ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                        borderColor: isSel ? 'var(--brand-primary)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{item.theme}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {item.formattedDate}
                        </p>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-white shrink-0"
                        style={{ backgroundColor: 'var(--brand-primary)' }}
                      >
                        {item.totalScore} pts
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ABA PRATICAR (MONTAGEM EM BLOCOS ESTILO LEGO) */
          <>
            {/* Passo 1: Como escolher o Tema */}
            <div
              className="p-3 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <p className="text-xs font-bold">1. Escolha de onde virá o Tema:</p>

              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => setThemeSource('gerado_ia')}
                  className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2 cursor-pointer ${
                    themeSource === 'gerado_ia' ? 'font-bold' : 'opacity-80'
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor:
                      themeSource === 'gerado_ia'
                        ? 'var(--brand-primary)'
                        : 'var(--border-subtle)',
                  }}
                >
                  <Wand2 className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  <div>
                    <p>Gerar Tema Automaticamente</p>
                    <p className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>
                      Sorteia um tema estilo ENEM ou sobre o assunto que você pedir
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setThemeSource('arquivo_enviado')}
                  className={`p-2.5 rounded-xl border text-left text-xs flex items-center gap-2 cursor-pointer ${
                    themeSource === 'arquivo_enviado' ? 'font-bold' : 'opacity-80'
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor:
                      themeSource === 'arquivo_enviado'
                        ? 'var(--brand-primary)'
                        : 'var(--border-subtle)',
                  }}
                >
                  <Camera className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  <div>
                    <p>Enviar Foto / Arquivo da Proposta</p>
                    <p className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>
                      Envie a folha de redação entregue na escola/cursinho
                    </p>
                  </div>
                </button>
              </div>

              {themeSource === 'arquivo_enviado' && (
                <div className="space-y-2 pt-1">
                  <label
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer text-center"
                    style={{
                      borderColor: 'var(--brand-primary)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <Upload className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                    <span className="text-xs font-semibold">
                      Escolher Foto ou PDF da Proposta
                    </span>
                    <input
                      ref={practiceFileInputRef}
                      type="file"
                      accept="image/*,application/pdf,.txt"
                      multiple
                      onChange={handlePracticeFilesChange}
                      className="hidden"
                    />
                  </label>

                  {practiceFiles.map((f, i) => (
                    <div
                      key={`${f.fileName}-${i}`}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <span className="truncate">{f.fileName}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPracticeFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-[11px] font-bold text-red-500 ml-2 cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold mb-1">
                  {themeSource === 'gerado_ia'
                    ? 'Quer sugerir algum assunto específico? (opcional — deixe em branco para sortear)'
                    : 'Se quiser, digite o título do tema da folha:'}
                </label>
                <input
                  type="text"
                  value={customThemeInput}
                  onChange={(e) => setCustomThemeInput(e.target.value)}
                  placeholder="Ex: Meio ambiente, inteligência artificial, inclusão..."
                  className="w-full px-2.5 py-1.5 rounded-xl border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                />
              </div>
            </div>

            {/* Passo 2: Escolher entre Redação Completa ou Parágrafos Específicos */}
            <div
              className="p-3 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <p className="text-xs font-bold">
                2. O que você quer montar em blocos agora?
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPracticeScope('redacao_completa')}
                  className={`p-2 rounded-xl border text-xs font-bold text-center cursor-pointer ${
                    practiceScope === 'redacao_completa' ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor:
                      practiceScope === 'redacao_completa'
                        ? 'var(--brand-primary)'
                        : 'var(--bg-surface)',
                    borderColor:
                      practiceScope === 'redacao_completa'
                        ? 'var(--brand-primary)'
                        : 'var(--border-subtle)',
                  }}
                >
                  Redação Completa (4 Parágrafos)
                </button>

                <button
                  type="button"
                  onClick={() => setPracticeScope('paragrafos_especificos')}
                  className={`p-2 rounded-xl border text-xs font-bold text-center cursor-pointer ${
                    practiceScope === 'paragrafos_especificos' ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor:
                      practiceScope === 'paragrafos_especificos'
                        ? 'var(--brand-primary)'
                        : 'var(--bg-surface)',
                    borderColor:
                      practiceScope === 'paragrafos_especificos'
                        ? 'var(--brand-primary)'
                        : 'var(--border-subtle)',
                  }}
                >
                  Parágrafos Específicos
                </button>
              </div>

              {practiceScope === 'paragrafos_especificos' && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Marque qual(is) parágrafo(s) quer treinar em blocos:
                  </p>
                  {PARAGRAPH_OPTIONS.map((pOpt) => {
                    const checked = selectedParagraphs.includes(pOpt.id);
                    return (
                      <button
                        key={pOpt.id}
                        type="button"
                        onClick={() => toggleParagraphSelection(pOpt.id)}
                        className="w-full p-2 rounded-xl border text-left text-xs flex items-start gap-2 cursor-pointer"
                        style={{
                          backgroundColor: checked ? 'var(--bg-surface)' : 'transparent',
                          borderColor: checked
                            ? 'var(--brand-primary)'
                            : 'var(--border-subtle)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          readOnly
                          className="mt-0.5 pointer-events-none"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{pOpt.label}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {pOpt.shortDesc} ({pOpt.piecesCount} blocos)
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={handleStartLegoPractice}
                disabled={isGeneratingLego}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Blocks className="w-4 h-4" />
                {isGeneratingLego
                  ? 'Montando Peças da Estrutura ENEM...'
                  : 'Gerar Estrutura em Blocos (LEGO)'}
              </button>
            </div>

            {/* Histórico de Treinos em Blocos */}
            {essayPracticeSessions.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <p
                  className="text-[11px] font-bold uppercase tracking-wider px-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Estruturas em Prática ({essayPracticeSessions.length})
                </p>
                {essayPracticeSessions.map((sess) => {
                  const isSel = activeEssayPractice?.id === sess.id;
                  return (
                    <button
                      key={sess.id}
                      type="button"
                      onClick={() => {
                        setActiveEssayPractice(sess);
                        setMobilePane('workspace');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs cursor-pointer ${
                        isSel ? 'font-semibold' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSel ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                        borderColor: isSel ? 'var(--brand-primary)' : 'var(--border-subtle)',
                      }}
                    >
                      <p className="truncate">{sess.themeTitle}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {sess.practiceScope === 'redacao_completa'
                          ? 'Redação Completa (4 parágrafos)'
                          : `${sess.paragraphs.length} parágrafo(s) específico(s)`}{' '}
                        • {sess.formattedDate}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const EssayWorkspace: React.FC = () => {
  const {
    essayMode,
    setEssayMode,
    activeEssayCorrection,
    activeEssayPractice,
    updateEssayPracticeSession,
    addEssayCorrection,
    addDocument,
    selectedYear,
    settings,
    showToast,
  } = useApp();

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [recordingBlockId, setRecordingBlockId] = useState<string | null>(null);
  const [isEvaluatingAssembled, setIsEvaluatingAssembled] = useState(false);

  const handleToggleSpeech = (id: string, text: string) => {
    if (speakingId === id) {
      speechService.stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(id);
    speechService.speak(text, settings.speechRate, () => setSpeakingId(null));
  };

  // ==========================================================================
  // MODO 1: CORREÇÃO PELOS CRITÉRIOS DO ENEM
  // ==========================================================================
  if (essayMode === 'correcao') {
    if (!activeEssayCorrection) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--brand-primary)' }}
          >
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold mb-2">
            Correção de Redação pelos 5 Critérios do ENEM
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Envie uma foto da sua folha de redação na coluna ao lado para receber sua nota em cada uma das <strong>5 Competências do ENEM</strong>, uma análise clara e <strong>sugestões simples e práticas de melhoria</strong>.
          </p>
        </div>
      );
    }

    const fullCorrectionSpeech = [
      `Correção da Redação: ${activeEssayCorrection.theme}.`,
      `Nota total estimada: ${activeEssayCorrection.totalScore} de 1000 pontos.`,
      activeEssayCorrection.generalAnalysis,
      ...activeEssayCorrection.competencies.map(
        (c) =>
          `${c.title}: ${c.score} pontos. ${c.analysis}. Sugestão prática: ${c.practicalSuggestions.join('. ')}`
      ),
    ].join(' ');

    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho com Nota Total ENEM */}
        <div
          className="p-6 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="space-y-1 max-w-xl">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--brand-primary)',
              }}
            >
              <Award className="w-3.5 h-3.5" />
              Avaliação Oficial nas 5 Competências do ENEM
            </span>
            <h1 className="text-xl font-bold">{activeEssayCorrection.theme}</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Corrigida em {activeEssayCorrection.formattedDate}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="px-4 py-3 rounded-2xl text-center text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                Nota Total ENEM
              </p>
              <p className="text-2xl font-extrabold">
                {activeEssayCorrection.totalScore}{' '}
                <span className="text-xs font-normal opacity-85">/ 1000</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleToggleSpeech('corr-full', fullCorrectionSpeech)}
              className="px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor:
                  speakingId === 'corr-full' ? '#EF4444' : 'var(--bg-subtle)',
                color: speakingId === 'corr-full' ? '#FFFFFF' : 'var(--brand-primary)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {speakingId === 'corr-full' ? (
                <>
                  <Square className="w-4 h-4" /> Parar Áudio
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" /> Ouvir Correção
                </>
              )}
            </button>
          </div>
        </div>

        {/* Análise Geral */}
        <div
          className="p-5 rounded-2xl border-l-4 space-y-1.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--brand-primary)',
          }}
        >
          <h2 className="text-sm font-bold" style={{ color: 'var(--brand-primary)' }}>
            Visão Geral da sua Redação
          </h2>
          <p className="text-sm leading-relaxed">{activeEssayCorrection.generalAnalysis}</p>
        </div>

        {/* As 5 Competências do ENEM */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Análise por Critério (5 Competências do ENEM)
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {activeEssayCorrection.competencies.map((comp) => (
              <div
                key={comp.number}
                className="p-5 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">{comp.title}</h3>
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-bold"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--brand-primary)',
                    }}
                  >
                    {comp.score} / 200 pontos
                  </span>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {comp.analysis}
                </p>

                <div
                  className="p-3.5 rounded-xl border space-y-1.5"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>
                    Sugestões Simples e Práticas para Subir a Nota:
                  </p>
                  <ul className="space-y-1 text-xs leading-relaxed list-disc pl-4">
                    {comp.practicalSuggestions.map((sug, idx) => (
                      <li key={idx}>{sug}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plano de Ação Prático: Como estava -> Como melhorar na prática */}
        {activeEssayCorrection.simpleActionPlan &&
          activeEssayCorrection.simpleActionPlan.length > 0 && (
            <div className="space-y-3">
              <h2
                className="text-sm font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Passo a Passo Prático de Melhoria (Antes ➔ Depois)
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {activeEssayCorrection.simpleActionPlan.map((step, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border space-y-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ Ponto de Atenção: {step.whatHappened}
                    </p>
                    <p className="text-sm font-semibold">
                      🛠️ Como resolver de jeito simples: {step.howToFixPractically}
                    </p>
                    <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs leading-relaxed">
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                        ✅ Exemplo prático pronto para usar na sua redação:
                      </p>
                      <p className="italic">{step.exampleRewrite}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Fotos enviadas e transcrição */}
        <div
          className="p-5 rounded-2xl border space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Texto / Foto Analisada
          </h3>
          {activeEssayCorrection.imageUrls && activeEssayCorrection.imageUrls.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeEssayCorrection.imageUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Foto da redação ${idx + 1}`}
                  className="max-h-64 w-auto rounded-xl border object-contain"
                  style={{ borderColor: 'var(--border-subtle)' }}
                />
              ))}
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {activeEssayCorrection.transcribedEssay}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MODO 2: PRATICAR EM BLOCOS DE MONTAR (ESTILO LEGO — PADRÃO ENEM)
  // ==========================================================================
  if (!activeEssayPractice) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--brand-primary)' }}
        >
          <Blocks className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold mb-2">
          Praticar Redação em Blocos de Montar (Estilo LEGO)
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Na coluna à esquerda, peça um <strong>tema gerado automaticamente</strong> ou envie a <strong>foto/arquivo da proposta</strong> entregue na escola. Você pode escolher treinar a <strong>Redação Completa</strong> ou <strong>Parágrafos Específicos</strong> montando peça por peça segundo os critérios do ENEM!
        </p>
      </div>
    );
  }

  const updateBlockUserText = (
    paragraphType: EssayParagraphType,
    blockId: string,
    newText: string
  ) => {
    const updatedParagraphs = activeEssayPractice.paragraphs.map((p) => {
      if (p.paragraphType !== paragraphType) return p;
      return {
        ...p,
        blocks: p.blocks.map((b) =>
          b.id === blockId ? { ...b, userText: newText } : b
        ),
      };
    });

    updateEssayPracticeSession({
      ...activeEssayPractice,
      paragraphs: updatedParagraphs,
    });
  };

  const handleInsertConnector = (
    paragraphType: EssayParagraphType,
    blockId: string,
    currentText: string,
    connector: string
  ) => {
    const trimmed = currentText.trim();
    const updated = trimmed
      ? `${connector} ${trimmed}`
      : `${connector} `;
    updateBlockUserText(paragraphType, blockId, updated);
  };

  const handleToggleBlockDictation = (
    paragraphType: EssayParagraphType,
    blockId: string
  ) => {
    if (recordingBlockId === blockId) {
      speechService.stopDictation();
      setRecordingBlockId(null);
      return;
    }

    setRecordingBlockId(blockId);
    speechService.startDictation(
      (transcript: string) => {
        updateBlockUserText(paragraphType, blockId, transcript);
      },
      () => setRecordingBlockId(null),
      (errMsg: string) => {
        showToast(errMsg);
        setRecordingBlockId(null);
      }
    );
  };

  // Calcula quantos blocos já foram preenchidos pelo aluno
  const totalBlocksCount = activeEssayPractice.paragraphs.reduce(
    (acc, p) => acc + p.blocks.length,
    0
  );
  const filledBlocksCount = activeEssayPractice.paragraphs.reduce(
    (acc, p) => acc + p.blocks.filter((b) => b.userText.trim().length > 0).length,
    0
  );

  // Texto completo montado juntando todas as peças de cada parágrafo
  const assembledParagraphsText = activeEssayPractice.paragraphs
    .map((p) =>
      p.blocks
        .map((b) => b.userText.trim())
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join('\n\n');

  const handleEvaluateAssembledEssay = async () => {
    if (!assembledParagraphsText.trim()) {
      showToast('Preencha os blocos de montar primeiro para avaliar seu texto!');
      return;
    }

    setIsEvaluatingAssembled(true);
    try {
      const res = await correctEnemEssay(
        [],
        assembledParagraphsText,
        activeEssayPractice.themeTitle,
        settings.geminiApiKey,
        settings.geminiModel
      );
      const now = new Date();
      const newCorr: EssayCorrectionItem = {
        id: `essay-corr-${Date.now()}`,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('pt-BR'),
        ...res,
      };
      addEssayCorrection(newCorr);
      setEssayMode('correcao');
      showToast('Seus blocos montados foram avaliados nos 5 critérios do ENEM!');
    } finally {
      setIsEvaluatingAssembled(false);
    }
  };

  const handleSavePracticeToFolder = () => {
    const contentToSave =
      assembledParagraphsText.trim() ||
      activeEssayPractice.paragraphs
        .map(
          (p) =>
            `${p.title}\n` +
            p.blocks
              .map(
                (b) =>
                  `• ${b.blockLabel}: ${b.userText.trim() || b.themeExample}`
              )
              .join('\n')
        )
        .join('\n\n');

    const now = new Date();
    const newDoc: StudyDocument = {
      id: `doc-essay-${Date.now()}`,
      title: `Redação em Blocos: ${activeEssayPractice.themeTitle}`,
      fileName: `Redacao_ENEM_${now.toLocaleDateString('pt-BR').replace(/\//g, '-')}.txt`,
      fileType: 'text',
      mimeType: 'text/plain',
      extractedText: `TEMA: ${activeEssayPractice.themeTitle}\n\n${contentToSave}`,
      year: selectedYear,
      subjectId: 'portugues',
      month: now.getMonth() + 1,
      isExam: false,
      createdAt: now.toISOString(),
      formattedDate: now.toLocaleDateString('pt-BR'),
    };
    addDocument(newDoc);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho do Tema e Barra de Progresso dos Blocos LEGO */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--brand-primary)',
                }}
              >
                <Blocks className="w-3.5 h-3.5" />
                Estrutura em Blocos (LEGO) •{' '}
                {activeEssayPractice.practiceScope === 'redacao_completa'
                  ? 'Redação Completa'
                  : 'Parágrafos Específicos'}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Eixo: {activeEssayPractice.enemAxis}
              </span>
            </div>

            <h1 className="text-xl font-bold leading-snug">
              Tema: “{activeEssayPractice.themeTitle}”
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {activeEssayPractice.motivatingContext}
            </p>
          </div>

          {/* Contador de Peças Montadas */}
          <div
            className="px-4 py-3 rounded-2xl border text-center shrink-0"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Peças Encaixadas
            </p>
            <p className="text-xl font-extrabold" style={{ color: 'var(--brand-primary)' }}>
              {filledBlocksCount} / {totalBlocksCount}
            </p>
          </div>
        </div>

        {/* Fotos da proposta enviada (se houver) */}
        {activeEssayPractice.imageUrls && activeEssayPractice.imageUrls.length > 0 && (
          <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
              Proposta digitalizada enviada:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeEssayPractice.imageUrls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Proposta ${idx + 1}`}
                  className="max-h-52 w-auto rounded-xl border object-contain"
                  style={{ borderColor: 'var(--border-subtle)' }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista de Parágrafos Selecionados para Montar Bloco a Bloco */}
      <div className="space-y-8">
        {activeEssayPractice.paragraphs.map((paragraph) => {
          const joinedParagraphText = paragraph.blocks
            .map((b) => b.userText.trim())
            .filter(Boolean)
            .join(' ');

          return (
            <section
              key={paragraph.paragraphType}
              className="p-6 rounded-2xl border space-y-5 shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {/* Cabeçalho do Parágrafo */}
              <div className="border-b pb-4 space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Blocks className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                    {paragraph.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleSpeech(
                        `p-guide-${paragraph.paragraphType}`,
                        `${paragraph.title}. ${paragraph.goalDescription}. ` +
                          paragraph.blocks
                            .map(
                              (b) =>
                                `${b.blockLabel}: ${b.whatToWrite}. Exemplo: ${b.themeExample}`
                            )
                            .join(' ')
                      )
                    }
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor:
                        speakingId === `p-guide-${paragraph.paragraphType}`
                          ? '#EF4444'
                          : 'var(--bg-subtle)',
                      color:
                        speakingId === `p-guide-${paragraph.paragraphType}`
                          ? '#FFFFFF'
                          : 'var(--brand-primary)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    {speakingId === `p-guide-${paragraph.paragraphType}` ? (
                      <>
                        <Square className="w-3.5 h-3.5" /> Parar Áudio
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" /> Ouvir Guia deste Parágrafo
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>
                  {paragraph.subtitle}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {paragraph.goalDescription}
                </p>
              </div>

              {/* Peças de LEGO do Parágrafo */}
              <div className="space-y-4">
                {paragraph.blocks.map((block) => {
                  const isRec = recordingBlockId === block.id;
                  return (
                    <div
                      key={block.id}
                      className="rounded-2xl border-2 overflow-hidden transition-all"
                      style={{
                        borderColor: block.colorHex,
                        backgroundColor: 'var(--bg-canvas)',
                      }}
                    >
                      {/* Topo da Peça de LEGO com Pinos Visuais */}
                      <div
                        className="px-4 py-2.5 text-white flex flex-wrap items-center justify-between gap-2"
                        style={{ backgroundColor: block.colorHex }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex gap-1" aria-hidden="true">
                            <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                            <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                          </span>
                          <span className="text-xs font-extrabold tracking-wide">
                            {block.blockLabel}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold bg-black/20 px-2.5 py-0.5 rounded-full">
                          {block.enemCriterion}
                        </span>
                      </div>

                      {/* Corpo da Peça de LEGO */}
                      <div className="p-4 space-y-3">
                        <p className="text-sm font-semibold">{block.whatToWrite}</p>

                        {/* Conectivos prontos para clicar e encaixar */}
                        {block.suggestedConnectors && block.suggestedConnectors.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                              Clique em um conectivo para encaixar no início do bloco:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {block.suggestedConnectors.map((conn, cIdx) => (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() =>
                                    handleInsertConnector(
                                      paragraph.paragraphType,
                                      block.id,
                                      block.userText,
                                      conn
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all hover:opacity-90"
                                  style={{
                                    backgroundColor: 'var(--bg-surface)',
                                    borderColor: block.colorHex,
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  + “{conn}”
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Molde e Exemplo do Tema */}
                        <div
                          className="p-3 rounded-xl border text-xs space-y-1.5"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold" style={{ color: 'var(--brand-primary)' }}>
                              💡 Exemplo prático para este tema:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateBlockUserText(
                                    paragraph.paragraphType,
                                    block.id,
                                    block.guidedTemplate
                                  )
                                }
                                className="px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--bg-subtle)',
                                  borderColor: 'var(--border-subtle)',
                                }}
                              >
                                <Copy className="w-3 h-3" /> Usar Molde com Lacunas
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateBlockUserText(
                                    paragraph.paragraphType,
                                    block.id,
                                    block.themeExample
                                  )
                                }
                                className="px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--bg-subtle)',
                                  borderColor: 'var(--border-subtle)',
                                }}
                              >
                                <ArrowRight className="w-3 h-3" /> Preencher com Exemplo
                              </button>
                            </div>
                          </div>
                          <p className="italic" style={{ color: 'var(--text-secondary)' }}>
                            “{block.themeExample}”
                          </p>
                        </div>

                        {/* Área de escrita ou ditado do bloco */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor={`input-${block.id}`}
                              className="text-xs font-bold"
                            >
                              Sua Peça Montada (digite ou dite no microfone):
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleBlockDictation(
                                  paragraph.paragraphType,
                                  block.id
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                                isRec ? 'bg-red-600 text-white' : 'border'
                              }`}
                              style={
                                !isRec
                                  ? {
                                      backgroundColor: 'var(--bg-surface)',
                                      borderColor: 'var(--border-subtle)',
                                    }
                                  : undefined
                              }
                            >
                              {isRec ? (
                                <>
                                  <MicOff className="w-3.5 h-3.5" /> Parar Ditado
                                </>
                              ) : (
                                <>
                                  <Mic className="w-3.5 h-3.5" /> Ditar Peça
                                </>
                              )}
                            </button>
                          </div>

                          <textarea
                            id={`input-${block.id}`}
                            rows={2}
                            value={block.userText}
                            onChange={(e) =>
                              updateBlockUserText(
                                paragraph.paragraphType,
                                block.id,
                                e.target.value
                              )
                            }
                            placeholder={block.guidedTemplate}
                            className="w-full p-3 rounded-xl border text-sm leading-relaxed resize-y"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor:
                                block.userText.trim().length > 0
                                  ? block.colorHex
                                  : 'var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Prévia do Parágrafo Montado juntando as peças */}
              <div
                className="p-4 rounded-2xl border-2 border-dashed space-y-2"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--brand-primary)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>
                  🧩 Parágrafo Montado (Juntando seus Blocos acima):
                </p>
                {joinedParagraphText ? (
                  <p className="text-sm leading-relaxed font-medium">
                    {joinedParagraphText}
                  </p>
                ) : (
                  <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                    À medida que você preencher ou clicar em "Preencher com Exemplo" nos blocos acima, o parágrafo completo aparecerá encaixado aqui!
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Painel Final: Figura Completa Montada (Todos os Parágrafos Juntos) */}
      <div
        className="p-6 rounded-2xl border-2 space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--brand-primary)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Figura Completa Montada (União de Todos os Blocos)
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Veja como seus blocos se conectam formando o texto final estruturado para o ENEM.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {assembledParagraphsText && (
              <button
                type="button"
                onClick={() =>
                  handleToggleSpeech('assembled-full', assembledParagraphsText)
                }
                className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor:
                    speakingId === 'assembled-full' ? '#EF4444' : 'var(--bg-subtle)',
                  color:
                    speakingId === 'assembled-full'
                      ? '#FFFFFF'
                      : 'var(--brand-primary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {speakingId === 'assembled-full' ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Parar Leitura
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" /> Ouvir Meu Texto
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSavePracticeToFolder}
              className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Salvar na Pasta de Português
            </button>

            <button
              type="button"
              onClick={handleEvaluateAssembledEssay}
              disabled={isEvaluatingAssembled || !assembledParagraphsText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Award className="w-4 h-4" />
              {isEvaluatingAssembled
                ? 'Calculando Nota ENEM...'
                : 'Avaliar Meus Blocos nos Critérios do ENEM'}
            </button>
          </div>
        </div>

        <div
          className="p-4 rounded-xl border whitespace-pre-wrap text-sm leading-relaxed"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {assembledParagraphsText ||
            'Preencha as peças de LEGO acima para ver seu texto completo ganhar forma aqui!'}
        </div>
      </div>
    </div>
  );
};
