import React, { useState, useRef } from 'react';
import {
  Calculator,
  Camera,
  Upload,
  Sparkles,
  Volume2,
  Square,
  FolderPlus,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Mic,
  MicOff,
  FileText,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { solveMathQuestionsStepByStep } from '../../services/geminiService';
import { extractBasicTextFromFile } from '../../services/pdfService';
import { speechService } from '../../services/speechService';
import { MathResolutionList, StudyDocument } from '../../types';

export const MathSidebar: React.FC = () => {
  const {
    mathResolutions,
    addMathResolution,
    activeMathResolution,
    setActiveMathResolution,
    addDocument,
    selectedYear,
    settings,
    showToast,
    setMobilePane,
  } = useApp();

  const [selectedFiles, setSelectedFiles] = useState<
    Array<{ fileName: string; mimeType: string; dataUrl: string; extractedText: string }>
  >([]);
  const [typedQuestions, setTypedQuestions] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

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

    setSelectedFiles((prev) => [...prev, ...loaded]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToggleDictation = () => {
    if (isRecording) {
      speechService.stopDictation();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    speechService.startDictation(
      (transcript: string) => {
        setTypedQuestions(transcript);
      },
      () => setIsRecording(false),
      (errMsg: string) => {
        showToast(errMsg);
        setIsRecording(false);
      }
    );
  };

  const handleSolve = async () => {
    if (selectedFiles.length === 0 && !typedQuestions.trim()) {
      showToast('Envie uma foto/arquivo da questão ou digite o enunciado primeiro!');
      return;
    }

    setIsSolving(true);
    try {
      const combinedText = [
        ...selectedFiles.map((f) => f.extractedText).filter(Boolean),
        typedQuestions.trim(),
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await solveMathQuestionsStepByStep(
        selectedFiles.map((f) => ({
          dataUrl: f.dataUrl,
          mimeType: f.mimeType,
          fileName: f.fileName,
        })),
        combinedText,
        settings.geminiApiKey,
        settings.geminiModel
      );

      const now = new Date();
      const newItem: MathResolutionList = {
        id: `math-${Date.now()}`,
        title: result.title,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('pt-BR'),
        imageUrls: result.imageUrls,
        sourceText: combinedText,
        questions: result.questions,
      };

      addMathResolution(newItem);
      setSelectedFiles([]);
      setTypedQuestions('');
      setMobilePane('workspace');
      showToast('Resolução passo a passo gerada com sucesso!');
    } finally {
      setIsSolving(false);
    }
  };

  const handleSaveToMathFolder = () => {
    if (!activeMathResolution) return;
    const now = new Date();
    const formattedContent = activeMathResolution.questions
      .map(
        (q) =>
          `QUESTÃO ${q.questionNumber} (${q.topic}):\n${q.statement}\n\n• Caminho a seguir: ${q.whatToDoSummary}\n\n` +
          q.steps
            .map(
              (s) =>
                `  Passo ${s.stepNumber} — ${s.actionTitle}:\n  Conta: ${s.calculation}\n  Explicação: ${s.explanation}`
            )
            .join('\n\n') +
          `\n\n✅ Resposta Final: ${q.finalAnswer}\n⚠️ Dica de Atenção: ${q.attentionTip}`
      )
      .join('\n\n----------------------------------------\n\n');

    const newDoc: StudyDocument = {
      id: `doc-math-${Date.now()}`,
      title: `Resolução Passo a Passo: ${activeMathResolution.title}`,
      fileName: `${activeMathResolution.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`,
      fileType: 'text',
      mimeType: 'text/plain',
      extractedText: formattedContent,
      year: selectedYear,
      subjectId: 'matematica',
      month: now.getMonth() + 1,
      isExam: false,
      createdAt: now.toISOString(),
      formattedDate: now.toLocaleDateString('pt-BR'),
    };

    addDocument(newDoc);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
          <h2 className="text-sm font-bold tracking-tight">Matemática Passo a Passo</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Tire uma foto da questão ou envie uma lista de exercícios para ver o caminho e cada passo da resolução.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Upload de Foto da Questão ou Lista de Exercícios */}
        <div
          className="p-3 rounded-2xl border space-y-2.5"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <p className="text-xs font-bold flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
            1. Foto da Questão ou Lista (PDF/Imagem)
          </p>

          <label
            className="w-full py-3 px-3 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:opacity-90 text-center"
            style={{
              borderColor: 'var(--brand-primary)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <Upload className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <span className="text-xs font-semibold">
              Tirar Foto ou Escolher Arquivo(s)
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Aceita 1 questão ou lista inteira (Fotos e PDF)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.txt"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
          </label>

          {selectedFiles.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
                {selectedFiles.length} arquivo(s) selecionado(s):
              </p>
              {selectedFiles.map((f, idx) => (
                <div
                  key={`${f.fileName}-${idx}`}
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
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-[11px] font-bold text-red-500 ml-2 cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campo opcional para digitar ou ditar questões */}
        <div
          className="p-3 rounded-2xl border space-y-2"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <label htmlFor="math-typed-input" className="text-xs font-bold">
              2. Ou digite / dite a(s) questão(ões):
            </label>
            <button
              type="button"
              onClick={handleToggleDictation}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                isRecording ? 'bg-red-600 text-white' : 'border'
              }`}
              style={
                !isRecording
                  ? {
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }
                  : undefined
              }
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3 h-3" /> Parar
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3" /> Ditar
                </>
              )}
            </button>
          </div>

          <textarea
            id="math-typed-input"
            rows={4}
            value={typedQuestions}
            onChange={(e) => setTypedQuestions(e.target.value)}
            placeholder="Ex:&#10;1) Resolva 3x + 6 = 21&#10;2) Calcule 20% de 150&#10;3) Área de um retângulo de base 10 cm e altura 4 cm"
            className="w-full p-2.5 rounded-xl border text-xs resize-none"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />

          <button
            type="button"
            onClick={handleSolve}
            disabled={isSolving}
            className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Sparkles className="w-4 h-4" />
            {isSolving
              ? 'Calculando Passo a Passo...'
              : 'Gerar Resolução Passo a Passo'}
          </button>
        </div>

        {/* Botão para salvar resolução ativa direto na pasta de Matemática */}
        {activeMathResolution && (
          <button
            type="button"
            onClick={handleSaveToMathFolder}
            className="w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--brand-primary)',
              color: 'var(--brand-primary)',
            }}
          >
            <FolderPlus className="w-4 h-4" />
            Salvar Resolução na Pasta de Matemática
          </button>
        )}

        {/* Histórico de Listas e Questões Resolvidas */}
        {mathResolutions.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <p
              className="text-[11px] font-bold uppercase tracking-wider px-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Questões e Listas Resolvidas ({mathResolutions.length})
            </p>
            {mathResolutions.map((item) => {
              const isSelected = activeMathResolution?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveMathResolution(item);
                    setMobilePane('workspace');
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2 ${
                    isSelected ? 'font-semibold shadow-xs' : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                    borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)',
                  }}
                >
                  <ListChecks
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: 'var(--brand-primary)' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {item.formattedDate} • {item.questions.length} questão(ões)
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const MathWorkspace: React.FC = () => {
  const { activeMathResolution, settings } = useApp();
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  if (!activeMathResolution) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--brand-primary)' }}
        >
          <Calculator className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold mb-2">
          Resolução Passo a Passo de Matemática
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Envie uma foto da questão ou um arquivo com uma lista de exercícios na coluna ao lado. O aplicativo mostrará <strong>qual caminho seguir</strong> e explicará <strong>passo a passo</strong> cada etapa do cálculo sem pular nenhuma conta.
        </p>
      </div>
    );
  }

  const handleSpeakQuestion = (qIndex: number) => {
    const q = activeMathResolution.questions[qIndex];
    const key = `q-${q.questionNumber}`;
    if (speakingId === key) {
      speechService.stopSpeaking();
      setSpeakingId(null);
      return;
    }

    const fullSpeech = [
      `Questão ${q.questionNumber}. ${q.statement}.`,
      `Qual caminho seguir: ${q.whatToDoSummary}.`,
      ...q.steps.map(
        (s) =>
          `Passo ${s.stepNumber}: ${s.actionTitle}. Fazemos ${s.calculation}. ${s.explanation}`
      ),
      `Resposta final: ${q.finalAnswer}. Dica de atenção: ${q.attentionTip}`,
    ].join(' ');

    setSpeakingId(key);
    speechService.speak(fullSpeech, settings.speechRate, () => setSpeakingId(null));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho da Lista Resolvida */}
      <div
        className="p-5 rounded-2xl border flex flex-wrap items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--brand-primary)',
            }}
          >
            <Calculator className="w-3.5 h-3.5" />
            Matemática Descomplicada • {activeMathResolution.questions.length} questão(ões)
          </span>
          <h1 className="text-xl font-bold">{activeMathResolution.title}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Resolvido em {activeMathResolution.formattedDate}
          </p>
        </div>
      </div>

      {/* Miniaturas das fotos enviadas (se houver) */}
      {activeMathResolution.imageUrls && activeMathResolution.imageUrls.length > 0 && (
        <div
          className="p-4 rounded-2xl border space-y-2"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <p className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            Foto(s) original(is) da questão / lista:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeMathResolution.imageUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Foto da questão ${idx + 1}`}
                className="max-h-56 w-auto rounded-xl border object-contain"
                style={{ borderColor: 'var(--border-subtle)' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lista de Questões Resolvidas Passo a Passo */}
      <div className="space-y-6">
        {activeMathResolution.questions.map((q, idx) => {
          const isSpeakingThis = speakingId === `q-${q.questionNumber}`;
          return (
            <article
              key={q.questionNumber}
              className="p-6 rounded-2xl border space-y-5 shadow-xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {/* Topo da Questão */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    Questão {q.questionNumber}
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {q.topic}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeakQuestion(idx)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all"
                  style={{
                    backgroundColor: isSpeakingThis ? '#EF4444' : 'var(--bg-subtle)',
                    color: isSpeakingThis ? '#FFFFFF' : 'var(--brand-primary)',
                    borderColor: isSpeakingThis ? '#EF4444' : 'var(--border-subtle)',
                  }}
                >
                  {isSpeakingThis ? (
                    <>
                      <Square className="w-3.5 h-3.5" /> Parar Áudio
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" /> Ouvir Passo a Passo
                    </>
                  )}
                </button>
              </div>

              {/* Enunciado */}
              <div
                className="p-4 rounded-xl border reading-prose"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                  Enunciado da Questão:
                </p>
                <p className="font-semibold">{q.statement}</p>
              </div>

              {/* Qual caminho deve ser tomado? */}
              <div
                className="p-4 rounded-xl border-l-4 flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--brand-primary)',
                }}
              >
                <Compass
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{ color: 'var(--brand-primary)' }}
                />
                <div className="space-y-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>
                    Qual caminho deve ser tomado? (Plano de Resolução)
                  </p>
                  <p className="text-sm leading-relaxed">{q.whatToDoSummary}</p>
                </div>
              </div>

              {/* Etapas Passo a Passo */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Passo a Passo Detalhado:
                </h3>

                <div className="space-y-3">
                  {q.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-4 rounded-2xl border space-y-2.5"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-lg text-xs font-bold text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          {step.stepNumber}
                        </span>
                        <h4 className="text-sm font-bold">{step.actionTitle}</h4>
                      </div>

                      {/* Caixa de cálculo limpa e espaçada */}
                      <div
                        className="p-3 rounded-xl border font-bold text-sm tracking-wide flex items-center gap-2 overflow-x-auto"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--brand-primary)',
                        }}
                      >
                        <ArrowRight className="w-4 h-4 shrink-0" />
                        <span>{step.calculation}</span>
                      </div>

                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        <strong>Por que fazemos isso:</strong> {step.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resposta Final e Dica de Atenção */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Resposta Final
                    </p>
                    <p className="text-base font-bold mt-0.5">{q.finalAnswer}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Cuidado para não errar por distração
                    </p>
                    <p className="text-xs leading-relaxed mt-0.5">{q.attentionTip}</p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
