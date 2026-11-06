import React, { useState, useRef } from 'react';
import {
  Camera,
  FileDown,
  Layers,
  Volume2,
  RotateCw,
  FileText,
  FolderInput,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIXED_SUBJECTS } from '../../constants/curriculum';
import {
  readFileAsDataUrl,
  generateCleanBoardPdf,
  generateCleanBoardPdfDataUrl,
} from '../../services/pdfService';
import { processBoardPhoto } from '../../services/geminiService';
import { speechService } from '../../services/speechService';
import { StudyDocument } from '../../types';

export const BoardCopySidebar: React.FC = () => {
  const {
    boardCopies,
    addBoardCopy,
    activeBoardCopy,
    setActiveBoardCopy,
    boardCopyViewMode,
    setBoardCopyViewMode,
    selectedSubjectId,
    selectedYear,
    addDocument,
    settings,
    setMobilePane,
    showToast,
  } = useApp();

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(selectedSubjectId);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Permite enviar VÁRIAS fotos do quadro de uma só vez (multiple)
  const handleUploadBoardPhotos = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    try {
      const filesArray = Array.from(fileList);
      const photos: Array<{ mimeType: string; dataUrl: string }> = [];

      for (const file of filesArray) {
        const dataUrl = await readFileAsDataUrl(file);
        photos.push({
          mimeType: file.type || 'image/jpeg',
          dataUrl,
        });
      }

      const defaultTitle =
        title.trim() ||
        (filesArray.length === 1
          ? filesArray[0].name.replace(/\.[^.]+$/, '')
          : `Quadro da Aula (${filesArray.length} fotos)`);

      const processed = await processBoardPhoto(
        defaultTitle,
        subjectId,
        photos,
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
      showToast(
        `${filesArray.length} foto(s) do quadro processada(s) com sucesso!`
      );
    } finally {
      setIsProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownloadPdf = () => {
    if (!activeBoardCopy) {
      showToast('Selecione ou envie fotos do quadro primeiro!');
      return;
    }
    const subjName =
      FIXED_SUBJECTS.find((s) => s.id === activeBoardCopy.subjectId)?.name ||
      'Geral';
    generateCleanBoardPdf(activeBoardCopy, subjName);
  };

  // Exporta o PDF gerado do quadro diretamente para a pasta da matéria correspondente
  const handleExportPdfToSubjectFolder = () => {
    if (!activeBoardCopy) {
      showToast('Selecione ou envie fotos do quadro primeiro!');
      return;
    }
    const subj = FIXED_SUBJECTS.find((s) => s.id === activeBoardCopy.subjectId);
    const subjName = subj?.name || 'Geral';
    const { fileName, dataUrl } = generateCleanBoardPdfDataUrl(
      activeBoardCopy,
      subjName
    );

    const now = new Date();
    const newDoc: StudyDocument = {
      id: `doc-quadro-${Date.now()}`,
      title: `PDF do Quadro: ${activeBoardCopy.title}`,
      fileName,
      fileType: 'pdf',
      mimeType: 'application/pdf',
      dataUrl,
      extractedText: activeBoardCopy.transcribedText,
      year: selectedYear,
      subjectId: activeBoardCopy.subjectId,
      month: now.getMonth() + 1,
      isExam: false,
      createdAt: now.toISOString(),
      formattedDate: now.toLocaleDateString('pt-BR'),
    };

    addDocument(newDoc);
    showToast(
      `PDF do quadro exportado diretamente para a pasta de ${subj?.shortName || subjName}!`
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="p-3.5 border-b space-y-2.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Cópia do Quadro
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Envie uma ou várias fotos da lousa
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
            className="w-full rounded-xl px-2.5 py-1.5 text-xs border"
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
            className="w-full rounded-xl px-2.5 py-1.5 text-xs border cursor-pointer"
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
          multiple
          onChange={handleUploadBoardPhotos}
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
              ? 'Passando fotos a limpo...'
              : 'Enviar Fotos do Quadro (Várias)'}
          </span>
        </button>

        {/* Botões de Ação e Visualização na 2ª Coluna mais à esquerda */}
        <div
          className="pt-2.5 border-t space-y-1.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="text-[10px] font-bold uppercase"
            style={{ color: 'var(--text-secondary)' }}
          >
            Opções do Quadro Selecionado:
          </div>

          <button
            type="button"
            disabled={!activeBoardCopy}
            onClick={() => {
              setBoardCopyViewMode('cards');
              setMobilePane('workspace');
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer border disabled:opacity-40 ${
              boardCopyViewMode === 'cards' && activeBoardCopy
                ? 'text-white'
                : ''
            }`}
            style={{
              backgroundColor:
                boardCopyViewMode === 'cards' && activeBoardCopy
                  ? 'var(--brand-primary)'
                  : 'var(--bg-subtle)',
              borderColor:
                boardCopyViewMode === 'cards' && activeBoardCopy
                  ? 'var(--brand-primary)'
                  : 'var(--border-subtle)',
            }}
          >
            <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ver Cartões de Estudo</span>
          </button>

          <button
            type="button"
            disabled={!activeBoardCopy}
            onClick={() => {
              setBoardCopyViewMode('text');
              setMobilePane('workspace');
            }}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer border disabled:opacity-40 ${
              boardCopyViewMode === 'text' && activeBoardCopy
                ? 'text-white'
                : ''
            }`}
            style={{
              backgroundColor:
                boardCopyViewMode === 'text' && activeBoardCopy
                  ? 'var(--brand-primary)'
                  : 'var(--bg-subtle)',
              borderColor:
                boardCopyViewMode === 'text' && activeBoardCopy
                  ? 'var(--brand-primary)'
                  : 'var(--border-subtle)',
            }}
          >
            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ver Quadro Passado a Limpo</span>
          </button>

          <button
            type="button"
            disabled={!activeBoardCopy}
            onClick={handleDownloadPdf}
            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
          >
            <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Baixar PDF do Quadro</span>
          </button>

          <button
            type="button"
            disabled={!activeBoardCopy}
            onClick={handleExportPdfToSubjectFolder}
            className="w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center gap-2 cursor-pointer disabled:opacity-40"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--brand-primary)',
              color: 'var(--brand-primary)',
            }}
          >
            <FolderInput className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Exportar PDF p/ Pasta da Matéria</span>
          </button>
        </div>
      </div>

      {/* Lista de Quadros Salvos */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div
          className="text-[11px] font-bold uppercase px-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Quadros Convertidos ({boardCopies.length})
        </div>
        {boardCopies.length === 0 ? (
          <p className="text-xs px-1" style={{ color: 'var(--text-secondary)' }}>
            Nenhuma foto enviada ainda.
          </p>
        ) : (
          boardCopies.map((item) => {
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
          })
        )}
      </div>
    </div>
  );
};

export const BoardCopyWorkspace: React.FC = () => {
  const { activeBoardCopy, boardCopyViewMode, settings } = useApp();
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  if (!activeBoardCopy) {
    return <div className="h-full w-full" />;
  }

  const subjName =
    FIXED_SUBJECTS.find((s) => s.id === activeBoardCopy.subjectId)?.name ||
    'Geral';

  const allImages =
    activeBoardCopy.imageUrls && activeBoardCopy.imageUrls.length > 0
      ? activeBoardCopy.imageUrls
      : activeBoardCopy.imageUrl
        ? [activeBoardCopy.imageUrl]
        : [];

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
      </div>

      {/* Galeria das Várias Fotos do Quadro Enviadas */}
      {allImages.length > 0 && (
        <div
          className="rounded-2xl p-4 border space-y-2"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <p className="text-xs font-bold">
            Fotos do Quadro Enviadas ({allImages.length}):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allImages.map((imgSrc, idx) => (
              <img
                key={idx}
                src={imgSrc}
                alt={`${activeBoardCopy.title} - Foto ${idx + 1}`}
                className="max-h-52 w-full rounded-xl object-contain border bg-black/5 p-1"
                style={{ borderColor: 'var(--border-subtle)' }}
              />
            ))}
          </div>
        </div>
      )}

      {boardCopyViewMode === 'cards' ? (
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
                  borderColor: isFlipped ? '#16a34a' : 'var(--border-subtle)',
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
