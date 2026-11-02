import React, { useState, useRef } from 'react';
import {
  Camera,
  FileDown,
  Layers,
  Volume2,
  RotateCw,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIXED_SUBJECTS } from '../../constants/curriculum';
import { readFileAsDataUrl, generateCleanBoardPdf } from '../../services/pdfService';
import { processBoardPhoto } from '../../services/geminiService';
import { speechService } from '../../services/speechService';

export const BoardCopySidebar: React.FC = () => {
  const {
    boardCopies,
    addBoardCopy,
    activeBoardCopy,
    setActiveBoardCopy,
    selectedSubjectId,
    settings,
    setMobilePane,
    showToast,
  } = useApp();

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(selectedSubjectId);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleUploadBoardPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const processed = await processBoardPhoto(
        title.trim() || file.name.replace(/\.[^.]+$/, ''),
        subjectId,
        file.type || 'image/jpeg',
        dataUrl,
        settings.geminiApiKey,
        settings.geminiModel
      );

      const now = new Date();
      const newItem = {
        id: `board-${Date.now()}`,
        createdAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('pt-BR'),
        ...processed,
      };
      addBoardCopy(newItem);
      setTitle('');
      setMobilePane('workspace');
      showToast('Foto do quadro transformada em Cartões de Estudo e PDF!');
    } finally {
      setIsProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="p-3.5 border-b space-y-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Cópia do Quadro
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Transforme fotos da lousa em Cartões de Estudo ou PDF limpo
          </p>
        </div>

        <div>
          <label
            htmlFor="board-title-input"
            className="block text-xs font-semibold mb-1"
          >
            Título da Aula (opcional):
          </label>
          <input
            id="board-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Quadro de Ciências - Células"
            className="w-full rounded-xl px-2.5 py-2 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="board-subject-select"
            className="block text-xs font-semibold mb-1"
          >
            Disciplina:
          </label>
          <select
            id="board-subject-select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-xl px-2.5 py-2 text-xs border cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {FIXED_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUploadBoardPhoto}
          className="hidden"
        />
        <button
          type="button"
          disabled={isProcessing}
          onClick={() => fileRef.current?.click()}
          className="w-full py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Camera className="w-4 h-4" aria-hidden="true" />
          <span>
            {isProcessing
              ? 'Passando o quadro a limpo...'
              : 'Enviar Foto do Quadro'}
          </span>
        </button>
      </div>

      {/* Lista de Quadros Salvos */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div
          className="text-[11px] font-bold uppercase px-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Quadros Convertidos ({boardCopies.length})
        </div>
        {boardCopies.map((item) => {
          const isCurrent = activeBoardCopy?.id === item.id;
          const subj = FIXED_SUBJECTS.find((s) => s.id === item.subjectId);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveBoardCopy(item);
                setMobilePane('workspace');
              }}
              className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                isCurrent ? 'ring-2 font-semibold' : ''
              }`}
              style={{
                backgroundColor: isCurrent
                  ? 'var(--bg-subtle)'
                  : 'var(--bg-surface)',
                borderColor: isCurrent
                  ? 'var(--brand-primary)'
                  : 'var(--border-subtle)',
              }}
            >
              <div className="text-xs font-bold truncate">{item.title}</div>
              <div
                className="text-[11px] flex items-center justify-between mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>{subj?.shortName}</span>
                <span>📅 {item.formattedDate}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const BoardCopyWorkspace: React.FC = () => {
  const { activeBoardCopy, settings } = useApp();
  const [viewMode, setViewMode] = useState<'cards' | 'text'>('cards');
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  if (!activeBoardCopy) {
    return (
      <div className="p-6 text-center">
        Envie uma foto do quadro na barra lateral para gerar cartões de estudo ou
        PDF limpo.
      </div>
    );
  }

  const subjName =
    FIXED_SUBJECTS.find((s) => s.id === activeBoardCopy.subjectId)?.name ||
    'Geral';

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      <div
        className="rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div>
          <span
            className="text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--brand-primary)',
            }}
          >
            📸 Cópia de Quadro • {subjName} • {activeBoardCopy.formattedDate}
          </span>
          <h1 className="text-lg font-bold mt-1">{activeBoardCopy.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
              viewMode === 'cards' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor:
                viewMode === 'cards'
                  ? 'var(--brand-primary)'
                  : 'var(--bg-subtle)',
              borderColor:
                viewMode === 'cards'
                  ? 'var(--brand-primary)'
                  : 'var(--border-subtle)',
            }}
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>Ver Cartões de Estudo</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('text')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
              viewMode === 'text' ? 'text-white' : ''
            }`}
            style={{
              backgroundColor:
                viewMode === 'text'
                  ? 'var(--brand-primary)'
                  : 'var(--bg-subtle)',
              borderColor:
                viewMode === 'text'
                  ? 'var(--brand-primary)'
                  : 'var(--border-subtle)',
            }}
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Ver Quadro Passado a Limpo</span>
          </button>

          <button
            type="button"
            onClick={() => generateCleanBoardPdf(activeBoardCopy, subjName)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700"
          >
            <FileDown className="w-4 h-4" aria-hidden="true" />
            <span>Baixar PDF do Quadro</span>
          </button>
        </div>
      </div>

      {activeBoardCopy.imageUrl && (
        <div
          className="rounded-2xl p-4 border"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <p className="text-xs font-bold mb-2">Foto Original Enviada:</p>
          <img
            src={activeBoardCopy.imageUrl}
            alt={activeBoardCopy.title}
            className="max-h-64 rounded-xl object-contain mx-auto"
          />
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeBoardCopy.studyCards.map((card, i) => {
            const isFlipped = Boolean(flipped[i]);
            return (
              <div
                key={i}
                onClick={() => setFlipped((p) => ({ ...p, [i]: !p[i] }))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setFlipped((p) => ({ ...p, [i]: !p[i] }));
                  }
                }}
                className="rounded-2xl p-5 border min-h-[160px] flex flex-col justify-between cursor-pointer"
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
                  <span>
                    {isFlipped
                      ? `✅ Resposta do Quadro #${i + 1}`
                      : `📌 Pergunta do Quadro #${i + 1}`}
                  </span>
                  <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <p className="dyslexia-reading-area font-semibold my-3">
                  {isFlipped ? card.back : card.front}
                </p>
                <div className="flex justify-end">
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
                    aria-label="Ouvir cartão"
                  >
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="rounded-2xl p-5 border space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Texto do Quadro Passado a Limpo (Fonte Sans-Serif):
            </h2>
            <button
              type="button"
              onClick={() =>
                speechService.speak(
                  activeBoardCopy.transcribedText,
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
              <span>Ouvir Quadro</span>
            </button>
          </div>
          <div
            className="dyslexia-reading-area p-4 rounded-xl border whitespace-pre-line"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {activeBoardCopy.transcribedText}
          </div>
        </div>
      )}
    </div>
  );
};

