import React, { useState } from 'react';
import {
  CheckCircle2,
  Volume2,
  MessageSquare,
  Sparkles,
  Play,
  Square,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIXED_SUBJECTS } from '../../constants/curriculum';
import { generateExamCorrection } from '../../services/geminiService';
import { speechService } from '../../services/speechService';

export const CorrectionSidebar: React.FC = () => {
  const {
    documents,
    corrections,
    addCorrection,
    activeCorrection,
    setActiveCorrection,
    settings,
    setMobilePane,
    showToast,
  } = useApp();

  const [subjectId, setSubjectId] = useState('matematica');
  const examDocsForSubject = documents.filter(
    (d) => d.subjectId === subjectId && d.isExam
  );
  const allSubjectDocs = documents.filter((d) => d.subjectId === subjectId);
  const selectableDocs =
    examDocsForSubject.length > 0 ? examDocsForSubject : allSubjectDocs;

  const [selectedExamId, setSelectedExamId] = useState<string>(
    selectableDocs[0]?.id || documents[0]?.id || ''
  );
  const [preferredMode, setPreferredMode] = useState<'audio' | 'dialogo'>(
    'audio'
  );
  const [studentNotes, setStudentNotes] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  const handleStartCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDoc =
      documents.find((d) => d.id === selectedExamId) ||
      selectableDocs[0] ||
      documents[0];
    if (!targetDoc) {
      showToast('Selecione ou envie uma prova primeiro!');
      return;
    }

    setIsCorrecting(true);
    try {
      const generated = await generateExamCorrection(
        targetDoc,
        studentNotes,
        settings.geminiApiKey,
        settings.geminiModel
      );
      const newCorrection = {
        id: `corr-${Date.now()}`,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        mode: preferredMode,
        ...generated,
      };
      addCorrection(newCorrection);
      setMobilePane('workspace');
      showToast('Correção pedagógica pronta!');
    } finally {
      setIsCorrecting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Correção de Provas
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Entenda o que errou e como acertar sem frustração
        </p>
      </div>

      <form onSubmit={handleStartCorrection} className="space-y-3">
        <div>
          <label
            htmlFor="corr-subject"
            className="block text-xs font-semibold mb-1"
          >
            1. Selecione a Matéria:
          </label>
          <select
            id="corr-subject"
            value={subjectId}
            onChange={(e) => {
              const nextSubj = e.target.value;
              setSubjectId(nextSubj);
              const nextDocs = documents.filter(
                (d) => d.subjectId === nextSubj
              );
              if (nextDocs[0]) setSelectedExamId(nextDocs[0].id);
            }}
            className="w-full rounded-xl px-2.5 py-2 text-xs border cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {FIXED_SUBJECTS.filter((s) => !s.isGeneralInfo).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="corr-exam-doc"
            className="block text-xs font-semibold mb-1"
          >
            2. Selecione a Prova:
          </label>
          <select
            id="corr-exam-doc"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full rounded-xl px-2.5 py-2 text-xs border cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {(selectableDocs.length > 0 ? selectableDocs : documents).map(
              (doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.isExam ? '📝 [Prova] ' : '📄 '}
                  {doc.title}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <span className="block text-xs font-semibold mb-1.5">
            3. Como prefere receber a explicação?
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPreferredMode('audio')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer ${
                preferredMode === 'audio' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor:
                  preferredMode === 'audio'
                    ? 'var(--brand-primary)'
                    : 'var(--bg-subtle)',
                borderColor:
                  preferredMode === 'audio'
                    ? 'var(--brand-primary)'
                    : 'var(--border-subtle)',
              }}
            >
              <Volume2 className="w-4 h-4" aria-hidden="true" />
              <span>Áudio Explicativo</span>
            </button>

            <button
              type="button"
              onClick={() => setPreferredMode('dialogo')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer ${
                preferredMode === 'dialogo' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor:
                  preferredMode === 'dialogo'
                    ? 'var(--brand-primary)'
                    : 'var(--bg-subtle)',
                borderColor:
                  preferredMode === 'dialogo'
                    ? 'var(--brand-primary)'
                    : 'var(--border-subtle)',
              }}
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Formato Diálogo</span>
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="corr-notes"
            className="block text-xs font-semibold mb-1"
          >
            O que você marcou ou teve dúvida? (opcional):
          </label>
          <textarea
            id="corr-notes"
            rows={2}
            value={studentNotes}
            onChange={(e) => setStudentNotes(e.target.value)}
            placeholder="Ex: Errei a questão de desconto e de simplificar fração..."
            className="w-full rounded-xl p-2 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isCorrecting}
          className="w-full py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          style={{ backgroundColor: '#16a34a' }}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>
            {isCorrecting
              ? 'Analisando questões da prova...'
              : 'Iniciar Correção Explicada'}
          </span>
        </button>
      </form>

      {corrections.length > 0 && (
        <div
          className="pt-3 border-t space-y-1.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="text-[11px] font-bold uppercase"
            style={{ color: 'var(--text-secondary)' }}
          >
            Correções Salvas
          </div>
          {corrections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveCorrection(c);
                setMobilePane('workspace');
              }}
              className={`w-full text-left p-2.5 rounded-xl text-xs border cursor-pointer ${
                activeCorrection?.id === c.id ? 'font-bold' : ''
              }`}
              style={{
                backgroundColor:
                  activeCorrection?.id === c.id
                    ? 'var(--bg-subtle)'
                    : 'var(--bg-surface)',
                borderColor:
                  activeCorrection?.id === c.id
                    ? 'var(--brand-primary)'
                    : 'var(--border-subtle)',
              }}
            >
              ✅ {c.examTitle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const CorrectionWorkspace: React.FC = () => {
  const {
    activeCorrection,
    updateCorrectionMode,
    documents,
    addCorrection,
    settings,
  } = useApp();

  const [isPlayingAll, setIsPlayingAll] = useState(false);

  const handleQuickDemoCorrection = async () => {
    const sampleExam =
      documents.find((d) => d.isExam) || documents[0];
    if (!sampleExam) return;
    const generated = await generateExamCorrection(
      sampleExam,
      '',
      settings.geminiApiKey,
      settings.geminiModel
    );
    addCorrection({
      id: `corr-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      mode: 'audio',
      ...generated,
    });
  };

  if (!activeCorrection) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div
          className="rounded-2xl p-6 border text-center space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <CheckCircle2
            className="w-10 h-10 mx-auto text-emerald-600"
            aria-hidden="true"
          />
          <h1 className="text-lg font-bold">
            Estude em Cima das Suas Provas e Entenda Seus Erros
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Selecione a matéria e a prova na coluna ao lado (ou clique abaixo
            para corrigir a Prova de Matemática de exemplo) e escolha entre{' '}
            <strong>Áudio Explicativo</strong> ou <strong>Formato de Diálogo</strong>!
          </p>
          <button
            type="button"
            onClick={handleQuickDemoCorrection}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            Ver Correção da Prova de Matemática Agora
          </button>
        </div>
      </div>
    );
  }

  const handlePlayFullCorrectionAudio = () => {
    if (isPlayingAll) {
      speechService.stopSpeaking();
      setIsPlayingAll(false);
      return;
    }
    setIsPlayingAll(true);
    const fullScript = `${activeCorrection.overallEncouragement}. ${activeCorrection.items
      .map(
        (item) =>
          `Questão ${item.questionNumber}: ${item.stepByStepExplanation}`
      )
      .join(' ')}`;
    speechService.speak(fullScript, settings.speechRate, () =>
      setIsPlayingAll(false)
    );
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      {/* Cabeçalho e Alternador entre Áudio Explicativo e Formato de Diálogo */}
      <div
        className="rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
            Correção Passo a Passo • {activeCorrection.createdAt}
          </span>
          <h1 className="text-lg font-bold mt-1">
            {activeCorrection.examTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateCorrectionMode(activeCorrection.id, 'audio')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
              activeCorrection.mode === 'audio' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor:
                activeCorrection.mode === 'audio'
                  ? 'var(--brand-primary)'
                  : 'var(--bg-subtle)',
              borderColor:
                activeCorrection.mode === 'audio'
                  ? 'var(--brand-primary)'
                  : 'var(--border-subtle)',
            }}
          >
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            <span>Modo Áudio Explicativo</span>
          </button>

          <button
            type="button"
            onClick={() => updateCorrectionMode(activeCorrection.id, 'dialogo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
              activeCorrection.mode === 'dialogo' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor:
                activeCorrection.mode === 'dialogo'
                  ? 'var(--brand-primary)'
                  : 'var(--bg-subtle)',
              borderColor:
                activeCorrection.mode === 'dialogo'
                  ? 'var(--brand-primary)'
                  : 'var(--border-subtle)',
            }}
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span>Modo Formato de Diálogo</span>
          </button>
        </div>
      </div>

      {/* Mensagem de Acolhimento + Botão Ouvir Tudo */}
      <div
        className="rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <p className="text-sm flex-1">{activeCorrection.overallEncouragement}</p>
        <button
          type="button"
          onClick={handlePlayFullCorrectionAudio}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shrink-0"
          style={{ backgroundColor: '#16a34a' }}
        >
          {isPlayingAll ? (
            <>
              <Square className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Parar Áudio</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ouvir Correção Completa</span>
            </>
          )}
        </button>
      </div>

      {/* Questões Corrigidas: O que foi errado vs O que seria o certo */}
      <div className="space-y-4">
        {activeCorrection.items.map((item) => (
          <div
            key={item.questionNumber}
            className="rounded-2xl p-5 border space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold">
                Questão {item.questionNumber}: {item.questionText}
              </h2>
              <button
                type="button"
                onClick={() =>
                  speechService.speak(
                    item.stepByStepExplanation,
                    settings.speechRate
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ouvir Questão {item.questionNumber}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                className="p-3.5 rounded-xl border text-xs space-y-1"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  borderColor: '#f59e0b',
                }}
              >
                <div className="font-bold text-amber-700 dark:text-amber-300">
                  ⚠️ O que aconteceu na prova (Onde foi o deslize):
                </div>
                <p>{item.whatWasWrong}</p>
              </div>

              <div
                className="p-3.5 rounded-xl border text-xs space-y-1"
                style={{
                  backgroundColor: 'rgba(22, 163, 74, 0.12)',
                  borderColor: '#16a34a',
                }}
              >
                <div className="font-bold text-emerald-700 dark:text-emerald-300">
                  ✅ O que seria o certo (Como resolver):
                </div>
                <p>{item.whatIsCorrect}</p>
              </div>
            </div>

            {activeCorrection.mode === 'audio' ? (
              <div
                className="dyslexia-reading-area p-4 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                🎧 <strong>Roteiro do Áudio Explicativo:</strong>{' '}
                {item.stepByStepExplanation}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold uppercase">
                  💬 Explicação em Formato de Diálogo:
                </div>
                {item.dialogue.map((d, dIdx) => (
                  <div
                    key={dIdx}
                    className="p-3 rounded-xl border text-sm flex items-start justify-between gap-2"
                    style={{
                      backgroundColor:
                        d.speaker === 'Tutor IA'
                          ? 'var(--bg-subtle)'
                          : 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div>
                      <span
                        className="text-xs font-bold block mb-0.5"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        {d.speaker}:
                      </span>
                      {d.text}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speechService.speak(d.text, settings.speechRate)
                      }
                      className="p-1.5 rounded-lg border shrink-0 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                      aria-label="Ouvir fala"
                    >
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

