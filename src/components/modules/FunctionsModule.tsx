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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NOTEBOOK_FUNCTIONS, FIXED_SUBJECTS } from '../../constants/curriculum';
import { FunctionType, GeneratedArtifact, StudyDocument } from '../../types';
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

export const FunctionsSidebar: React.FC = () => {
  const {
    documents,
    selectedDocument,
    setSelectedDocument,
    addDocument,
    artifacts,
    addArtifact,
    activeArtifact,
    setActiveArtifact,
    settings,
    selectedYear,
    setMobilePane,
    showToast,
  } = useApp();

  const [isGenerating, setIsGenerating] = useState<FunctionType | null>(null);
  const pdfAudioInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerFunction = async (funcId: FunctionType) => {
    const targetDoc = selectedDocument || documents[0];
    if (!targetDoc) {
      showToast('Carregue ou selecione um documento primeiro!');
      return;
    }

    setIsGenerating(funcId);
    try {
      const content = await generateStudyFunction(
        funcId,
        [targetDoc],
        settings.geminiApiKey,
        settings.geminiModel
      );
      const funcMeta = NOTEBOOK_FUNCTIONS.find((f) => f.id === funcId);
      const newArt: GeneratedArtifact = {
        id: `art-${Date.now()}`,
        functionType: funcId,
        title: `${funcMeta?.title || funcId} — ${targetDoc.title}`,
        sourceDocIds: [targetDoc.id],
        subjectId: targetDoc.subjectId,
        createdAt: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        content,
      };
      addArtifact(newArt);
      setMobilePane('workspace');
    } finally {
      setIsGenerating(null);
    }
  };

  // Opção especial: Carregar PDF/Livro direto para Transformar Texto em Áudio
  const handleDirectPdfToAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsGenerating('texto_em_audio');
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
        title: `Audiolivro / Texto em Áudio — ${newDoc.title}`,
        sourceDocIds: [newDoc.id],
        subjectId: newDoc.subjectId,
        createdAt: now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        content,
      };
      addArtifact(newArt);
      setMobilePane('workspace');
    } finally {
      setIsGenerating(null);
      if (pdfAudioInputRef.current) pdfAudioInputRef.current.value = '';
    }
  };

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
            Inspirado no NotebookLM + Acessibilidade Dislexia
          </p>
        </div>

        <div>
          <label
            htmlFor="function-source-doc"
            className="block text-xs font-semibold mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Material Selecionado:
          </label>
          <select
            id="function-source-doc"
            value={selectedDocument?.id || ''}
            onChange={(e) => {
              const found = documents.find((d) => d.id === e.target.value);
              if (found) setSelectedDocument(found);
            }}
            className="w-full rounded-xl px-2.5 py-2 text-xs font-medium border cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
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
          onClick={() => pdfAudioInputRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--brand-primary)',
            color: 'var(--brand-primary)',
          }}
        >
          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Enviar PDF/Livro p/ Transformar em Áudio</span>
        </button>
      </div>

      {/* Grade de Retângulos das 12 Funções */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="grid grid-cols-1 gap-2">
          {NOTEBOOK_FUNCTIONS.map((fn) => {
            const busy = isGenerating === fn.id;
            const isCurrentType = activeArtifact?.functionType === fn.id;
            return (
              <button
                key={fn.id}
                type="button"
                disabled={isGenerating !== null}
                onClick={() => handleTriggerFunction(fn.id)}
                className={`w-full p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  isCurrentType ? 'ring-2' : 'hover:opacity-95'
                }`}
                style={{
                  backgroundColor: isCurrentType
                    ? 'var(--bg-subtle)'
                    : 'var(--bg-surface)',
                  borderColor: isCurrentType ? fn.color : 'var(--border-subtle)',
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
                    <span className="text-xs font-bold truncate">{fn.title}</span>
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
                    {busy ? 'Gerando conteúdo adaptado...' : fn.subtitle}
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
    </div>
  );
};

export const FunctionsWorkspace: React.FC = () => {
  const {
    activeArtifact,
    updateArtifact,
    selectedDocument,
    addArtifact,
    settings,
  } = useApp();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [dictatingQuestionId, setDictatingQuestionId] = useState<string | null>(
    null
  );
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState<string | null>(
    null
  );
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);

  const handleQuickCreate = async (funcType: FunctionType) => {
    if (!selectedDocument) return;
    setIsQuickGenerating(true);
    try {
      const content = await generateStudyFunction(
        funcType,
        [selectedDocument],
        settings.geminiApiKey,
        settings.geminiModel
      );
      const meta = NOTEBOOK_FUNCTIONS.find((f) => f.id === funcType);
      addArtifact({
        id: `art-${Date.now()}`,
        functionType: funcType,
        title: `${meta?.title || funcType} — ${selectedDocument.title}`,
        sourceDocIds: [selectedDocument.id],
        subjectId: selectedDocument.subjectId,
        createdAt: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        content,
      });
    } finally {
      setIsQuickGenerating(false);
    }
  };

  if (!activeArtifact) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div
          className="rounded-2xl p-6 border text-center space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold">
            Escolha uma Função na 2ª Coluna para Transformar seu Estudo
          </h1>
          <p
            className="text-sm max-w-xl mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Documento selecionado no momento:{' '}
            <strong>{selectedDocument?.title || 'Nenhum'}</strong>. Clique em qualquer
            retângulo ao lado ou nos atalhos abaixo para gerar resumos em áudio,
            mapas mentais, provas interativas por voz ou demonstrações práticas!
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {NOTEBOOK_FUNCTIONS.slice(0, 6).map((fn) => (
              <button
                key={fn.id}
                type="button"
                disabled={isQuickGenerating}
                onClick={() => handleQuickCreate(fn.id)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                style={{ backgroundColor: fn.color }}
              >
                Gerar {fn.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { functionType, content } = activeArtifact;

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

  // Atualizar resposta de questão na Prova Interativa
  const handleUpdateExamAnswer = (qId: string, newText: string) => {
    if (!content.discursiveExam) return;
    const updatedExam = content.discursiveExam.map((q) =>
      q.id === qId ? { ...q, userAnswer: newText } : q
    );
    updateArtifact({
      ...activeArtifact,
      content: { ...content, discursiveExam: updatedExam },
    });
  };

  // Ditado por Voz para Responder a Prova Interativa
  const handleToggleQuestionDictation = (qId: string, currentAnswer: string = '') => {
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

  // Avaliar Resposta Discursiva com IA
  const handleEvaluateDiscursive = async (qId: string) => {
    const qObj = content.discursiveExam?.find((q) => q.id === qId);
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
      const updatedExam = content.discursiveExam!.map((q) =>
        q.id === qId
          ? { ...q, aiFeedback: result.feedback, score: result.score }
          : q
      );
      updateArtifact({
        ...activeArtifact,
        content: { ...content, discursiveExam: updatedExam },
      });
    } finally {
      setEvaluatingQuestionId(null);
    }
  };

  const sentences = (
    content.audioScript ||
    content.summaryText ||
    selectedDocument?.extractedText ||
    ''
  )
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho do Resultado da Função */}
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
            {NOTEBOOK_FUNCTIONS.find((f) => f.id === functionType)?.title}
          </span>
          <h1 className="text-lg font-bold mt-1">{activeArtifact.title}</h1>
        </div>

        <button
          type="button"
          onClick={() =>
            handlePlayAudio(
              content.audioScript ||
                content.summaryText ||
                selectedDocument?.extractedText ||
                activeArtifact.title
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
      {(functionType === 'resumo_audio' || functionType === 'texto_em_audio') && (
        <div
          className="rounded-2xl p-5 border space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h2 className="text-base font-bold">
            🎧 Leitura Acompanhada (Destaque Visual para Dislexia)
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Clique em "Ouvir em Voz Alta" no topo ou toque em qualquer frase abaixo
            para ouvi-la individualmente:
          </p>

          <div className="space-y-2">
            {sentences.map((sentence, idx) => {
              const highlighted = isSpeaking && idx === activeSentenceIdx;
              return (
                <p
                  key={idx}
                  onClick={() =>
                    speechService.speak(sentence, settings.speechRate)
                  }
                  className={`dyslexia-reading-area p-3 rounded-xl border transition cursor-pointer ${
                    highlighted ? 'font-semibold ring-2' : 'hover:opacity-90'
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
            <div className="pt-4 border-t space-y-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-sm font-bold">
                🎙️ Bate-Papo de Estudo (Estilo Podcast NotebookLM)
              </h3>
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

      {/* 2 & 3: APRESENTAÇÃO / RESUMO EM VÍDEO NARRADO */}
      {(functionType === 'apresentacao' || functionType === 'resumo_video') &&
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
                          `${currentSlide.title}. ${currentSlide.narration}`,
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
                      <h2 className="text-xl font-bold">{currentSlide.title}</h2>
                      <ul className="space-y-2 list-disc pl-5">
                        {currentSlide.bullets.map((b, i) => (
                          <li key={i} className="dyslexia-reading-area">
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className="p-3 rounded-xl text-xs border"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      🎨 <strong>Associação Visual:</strong> {currentSlide.visualHint}
                    </div>
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
                        setSlideIdx((p) => Math.min(slides.length - 1, p + 1))
                      }
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      <span>Próximo Slide</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

      {/* 4: MAPA MENTAL */}
      {functionType === 'mapa_mental' && content.mindMap && (
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

      {/* 5: RELATÓRIO / RESUMO */}
      {functionType === 'relatorio_resumo' && (
        <div
          className="rounded-2xl p-6 border space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h2 className="text-base font-bold">📝 Relatório e Resumo Estruturado</h2>
          <div
            className="dyslexia-reading-area p-4 rounded-xl border whitespace-pre-line"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {content.summaryText}
          </div>
        </div>
      )}

      {/* 6: CARTÕES DIDÁTICOS (FLASHCARDS) */}
      {functionType === 'cartoes_didaticos' && content.flashcards && (
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
                className="rounded-2xl p-5 border min-h-[180px] flex flex-col justify-between cursor-pointer transition shadow-2xs hover:shadow-md"
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
                      color: isFlipped ? '#16a34a' : 'var(--brand-primary)',
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

                <p className="dyslexia-reading-area font-semibold my-3">
                  {isFlipped ? card.back : card.front}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                  <span
                    className="text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {card.tip ? `💡 ${card.tip}` : 'Toque para virar o cartão'}
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

      {/* 7: TESTES (QUIZ) */}
      {functionType === 'testes' && content.quizQuestions && (
        <div className="space-y-4">
          {content.quizQuestions.map((q, qIdx) => {
            const selectedOpt = quizAnswers[qIdx];
            const answered = selectedOpt !== undefined;
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
                  <h3 className="font-bold text-sm">
                    Questão {qIdx + 1}: {q.question}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      speechService.speak(
                        `${q.question}. Alternativas: ${q.options.join('. ')}`,
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

                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === q.correctIndex;
                    const isPicked = selectedOpt === optIdx;
                    let borderColor = 'var(--border-subtle)';
                    let bg = 'var(--bg-canvas)';
                    if (answered) {
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
                          setQuizAnswers((p) => ({ ...p, [qIdx]: optIdx }))
                        }
                        className="w-full text-left p-3 rounded-xl border text-xs font-medium cursor-pointer transition"
                        style={{ backgroundColor: bg, borderColor }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {answered && (
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
      {functionType === 'infografico' && content.infographic && (
        <div
          className="rounded-2xl p-6 border space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <h2 className="text-base font-bold">{content.infographic.subtitle}</h2>
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
                  <h3 className="text-sm font-bold">{step.title}</h3>
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
      {functionType === 'tabela_dados' && content.dataTable && (
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

      {/* 11: PROVA INTERATIVA (FORMATO DISCURSIVO COM ÁUDIO DA QUESTÃO E RESPOSTA POR ÁUDIO/DITADO) */}
      {functionType === 'prova_interativa' && content.discursiveExam && (
        <div className="space-y-4">
          <div
            className="p-4 rounded-2xl border text-xs flex items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--brand-primary)',
            }}
          >
            <div>
              <strong>🎙️ Prova Interativa Discursiva (Acessível para Dislexia):</strong>{' '}
              Clique em <strong>"Ouvir Pergunta"</strong> para escutar o enunciado e em{' '}
              <strong>"Responder por Voz (Ditado)"</strong> para falar sua resposta!
            </div>
          </div>

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
                        `Questão ${idx + 1}. ${q.question}. Dica: ${q.hint}`,
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

                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  💡 <strong>Dica de Apoio:</strong> {q.hint}
                </p>

                <div className="space-y-2">
                  <label
                    htmlFor={`exam-answer-${q.id}`}
                    className="block text-xs font-semibold"
                  >
                    Sua Resposta (digite ou fale usando o botão de microfone):
                  </label>
                  <textarea
                    id={`exam-answer-${q.id}`}
                    rows={3}
                    value={q.userAnswer || ''}
                    onChange={(e) => handleUpdateExamAnswer(q.id, e.target.value)}
                    placeholder="Toque em 'Responder por Áudio/Ditado' abaixo e fale normalmente, ou escreva aqui..."
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
                      handleToggleQuestionDictation(q.id, q.userAnswer || '')
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
                        <Mic className="w-4 h-4 text-red-500" aria-hidden="true" />
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
                          speechService.speak(q.aiFeedback!, settings.speechRate)
                        }
                        className="inline-flex items-center gap-1 font-semibold underline cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
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
      {functionType === 'demonstracao_pratica' && content.practicalDemos && (
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
              <h2 className="text-base font-bold text-purple-600 dark:text-purple-400">
                🧪 {demo.title}
              </h2>
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
                <h3 className="text-xs font-bold uppercase">
                  Passo a Passo Prático:
                </h3>
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
  );
};

