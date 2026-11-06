import React, { useRef, useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Upload,
  GraduationCap,
  Calendar,
  Award,
  Volume2,
  Square,
  Sparkles,
  CheckCircle2,
  Trash2,
  ChevronRight,
  ChevronDown,
  FoldVertical,
  HardDrive,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  SCHOOL_YEARS,
  FIXED_SUBJECTS,
  MONTHS_PT,
} from '../../constants/curriculum';
import {
  readFileAsDataUrl,
  extractBasicTextFromFile,
} from '../../services/pdfService';
import { classifyAndExtractDocument } from '../../services/geminiService';
import {
  checkLocalDiskServerStatus,
  linkAndCreateComputerFolders,
} from '../../services/fileSystemService';
import { speechService } from '../../services/speechService';
import { StudyDocument } from '../../types';

export const FoldersSidebar: React.FC = () => {
  const {
    selectedYear,
    setSelectedYear,
    openSubjectIds,
    toggleSubjectFolder,
    closeAllFolders,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedMonth,
    setSelectedMonth,
    selectedSubfolder,
    setSelectedSubfolder,
    documents,
    addDocument,
    selectedDocument,
    setSelectedDocument,
    settings,
    setMobilePane,
    showToast,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [localFolderPath, setLocalFolderPath] = useState<string>(
    'Pastas_do_Aluno'
  );

  useEffect(() => {
    checkLocalDiskServerStatus().then((pathOnDisk) => {
      if (pathOnDisk) {
        setLocalFolderPath(pathOnDisk);
      }
    });
  }, []);

  const handleLinkComputerFolder = async () => {
    const linkedName = await linkAndCreateComputerFolders(selectedYear);
    if (linkedName) {
      setLocalFolderPath(`${linkedName}/Pastas_do_Aluno`);
      showToast(
        `Estrutura de pastas criada no seu computador dentro de "${linkedName}/Pastas_do_Aluno"!`
      );
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await readFileAsDataUrl(file);
        const basicText = await extractBasicTextFromFile(file);
        const classification = await classifyAndExtractDocument(
          file.name,
          file.type || 'application/octet-stream',
          dataUrl,
          basicText,
          settings.geminiApiKey,
          settings.geminiModel
        );

        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR');
        const newDoc: StudyDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: classification.suggestedTitle,
          fileName: file.name,
          fileType: file.type.startsWith('image/') ? 'image' : 'pdf',
          mimeType: file.type || 'application/pdf',
          dataUrl,
          extractedText: classification.extractedText,
          year: selectedYear,
          subjectId: classification.subjectId,
          month: classification.month,
          isExam: classification.isExam,
          createdAt: now.toISOString(),
          formattedDate,
        };

        addDocument(newDoc);
        setMobilePane('workspace');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho estilo Explorador do VS Code */}
      <div
        className="p-3.5 border-b space-y-2.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider">
              Explorador de Pastas
            </h2>
            <p
              className="text-[11px] truncate max-w-[180px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              💻 Pasta local: Pastas_do_Aluno
            </p>
          </div>

          {/* Botão para Fechar Todas as Pastas (igual ao VS Code) */}
          <button
            type="button"
            onClick={closeAllFolders}
            disabled={openSubjectIds.length === 0 && !selectedDocument}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 cursor-pointer disabled:opacity-40"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            aria-label="Fechar todas as pastas abertas"
          >
            <FoldVertical className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Fechar Todas</span>
          </button>
        </div>

        {/* Seletor de Ano Escolar */}
        <div>
          <label
            htmlFor="school-year-select"
            className="block text-[11px] font-semibold mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Ano Escolar:
          </label>
          <select
            id="school-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full rounded-xl px-2.5 py-1.5 text-xs font-medium border cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {SCHOOL_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Upload Automático */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*,.txt"
          multiple
          onChange={handleUploadFiles}
          className="hidden"
          id="auto-folder-upload"
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition hover:opacity-95 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          <span>
            {isUploading
              ? 'Salvando na pasta da matéria...'
              : 'Carregar PDF ou Foto (Auto-Pasta)'}
          </span>
        </button>

        {/* Botão opcional para vincular diretório do computador quando aberto sem servidor */}
        <button
          type="button"
          onClick={handleLinkComputerFolder}
          className="w-full py-1.5 px-2.5 rounded-xl text-[11px] font-medium border flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <HardDrive className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Sincronizar Pasta no Computador ({localFolderPath.split('/').pop()})
          </span>
        </button>
      </div>

      {/* Árvore Fixa de Disciplinas + Informações Gerais (Boletim) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {FIXED_SUBJECTS.map((subj) => {
          const isOpen = openSubjectIds.includes(subj.id);
          const subjDocs = documents.filter(
            (d) => d.year === selectedYear && d.subjectId === subj.id
          );
          const examDocs = subjDocs.filter((d) => d.isExam);

          return (
            <div key={subj.id} className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSubjectFolder(subj.id)}
                aria-expanded={isOpen}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-left text-xs rounded-xl transition cursor-pointer ${
                  isOpen ? 'font-bold' : 'font-medium hover:opacity-90'
                }`}
                style={{
                  backgroundColor: isOpen ? 'var(--bg-subtle)' : 'transparent',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen ? (
                    <ChevronDown
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: subj.color }}
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="w-3.5 h-3.5 shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                  )}
                  {subj.isGeneralInfo ? (
                    <Award
                      className="w-4 h-4 shrink-0"
                      style={{ color: subj.color }}
                      aria-hidden="true"
                    />
                  ) : isOpen ? (
                    <FolderOpen
                      className="w-4 h-4 shrink-0"
                      style={{ color: subj.color }}
                      aria-hidden="true"
                    />
                  ) : (
                    <Folder
                      className="w-4 h-4 shrink-0"
                      style={{ color: subj.color }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">{subj.name}</span>
                </div>
                {subjDocs.length > 0 && (
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {subjDocs.length}
                  </span>
                )}
              </button>

              {/* Subpastas da Disciplina quando Aberta */}
              {isOpen && (
                <div
                  className="ml-5 pl-2.5 my-1 border-l space-y-1"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {/* Subpasta Fixa de Provas */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(subj.id);
                      setSelectedSubfolder('provas');
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                      selectedSubjectId === subj.id &&
                      selectedSubfolder === 'provas'
                        ? 'font-bold'
                        : 'opacity-80'
                    }`}
                    style={{
                      backgroundColor:
                        selectedSubjectId === subj.id &&
                        selectedSubfolder === 'provas'
                          ? 'rgba(220, 38, 38, 0.12)'
                          : 'transparent',
                      color:
                        selectedSubjectId === subj.id &&
                        selectedSubfolder === 'provas'
                          ? '#dc2626'
                          : 'var(--text-primary)',
                    }}
                  >
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                      Subpasta: Provas
                    </span>
                    <span className="text-[10px] font-semibold">
                      {examDocs.length}
                    </span>
                  </button>

                  {/* Segmentação pelos 12 Meses */}
                  <div className="pt-1">
                    <div
                      className="text-[10px] font-semibold uppercase px-2 mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Meses ({selectedYear})
                    </div>
                    <div className="grid grid-cols-3 gap-1 px-1">
                      {MONTHS_PT.map((m) => {
                        const monthDocsCount = subjDocs.filter(
                          (d) => d.month === m.number
                        ).length;
                        const isActiveMonth =
                          selectedSubjectId === subj.id &&
                          selectedSubfolder === 'month' &&
                          selectedMonth === m.number;
                        return (
                          <button
                            key={m.number}
                            type="button"
                            onClick={() => {
                              setSelectedSubjectId(subj.id);
                              setSelectedMonth(m.number);
                              setSelectedSubfolder('month');
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] flex items-center justify-between border cursor-pointer ${
                              isActiveMonth ? 'font-bold' : ''
                            }`}
                            style={{
                              backgroundColor: isActiveMonth
                                ? 'var(--brand-primary)'
                                : 'var(--bg-surface)',
                              color: isActiveMonth
                                ? '#ffffff'
                                : 'var(--text-primary)',
                              borderColor: isActiveMonth
                                ? 'var(--brand-primary)'
                                : 'var(--border-subtle)',
                            }}
                          >
                            <span>{m.short}</span>
                            {monthDocsCount > 0 && (
                              <span className="text-[10px] opacity-90">
                                ({monthDocsCount})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Lista de Documentos com Data de Registro */}
                  {subjDocs.length > 0 && (
                    <div className="pt-1.5 space-y-1">
                      {subjDocs.map((doc) => {
                        const isCurrentDoc = selectedDocument?.id === doc.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => {
                              setSelectedSubjectId(subj.id);
                              setSelectedDocument(doc);
                              setMobilePane('workspace');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-start gap-2 cursor-pointer border ${
                              isCurrentDoc ? 'font-semibold' : ''
                            }`}
                            style={{
                              backgroundColor: isCurrentDoc
                                ? 'var(--bg-surface)'
                                : 'transparent',
                              borderColor: isCurrentDoc
                                ? 'var(--brand-primary)'
                                : 'transparent',
                            }}
                          >
                            {doc.fileType === 'image' ? (
                              <ImageIcon
                                className="w-3.5 h-3.5 mt-0.5 shrink-0 text-purple-500"
                                aria-hidden="true"
                              />
                            ) : (
                              <FileText
                                className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500"
                                aria-hidden="true"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{doc.title}</div>
                              <div
                                className="text-[10px] flex items-center gap-1.5"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                <span>📅 {doc.formattedDate}</span>
                                {doc.isExam && (
                                  <span className="text-red-500 font-semibold">
                                    • Prova
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FoldersWorkspace: React.FC = () => {
  const {
    selectedYear,
    openSubjectIds,
    selectedSubjectId,
    selectedMonth,
    setSelectedMonth,
    selectedSubfolder,
    setSelectedSubfolder,
    documents,
    selectedDocument,
    setSelectedDocument,
    updateDocument,
    deleteDocument,
    setActiveTab,
    settings,
  } = useApp();

  const [isSpeaking, setIsSpeaking] = useState(false);

  // REGRA OBRIGATÓRIA: Quando todas as pastas estiverem fechadas (e nenhum documento aberto),
  // a segunda página mais à direita fica totalmente vazia!
  if (openSubjectIds.length === 0 && !selectedDocument) {
    return <div className="h-full w-full" />;
  }

  const activeSubjId = openSubjectIds.includes(selectedSubjectId)
    ? selectedSubjectId
    : openSubjectIds[openSubjectIds.length - 1] || selectedSubjectId;

  const currentSubject =
    FIXED_SUBJECTS.find((s) => s.id === activeSubjId) || FIXED_SUBJECTS[0];

  const filteredDocuments = documents.filter((d) => {
    if (d.year !== selectedYear) return false;
    if (d.subjectId !== currentSubject.id) return false;
    if (selectedSubfolder === 'provas') return d.isExam;
    if (selectedSubfolder === 'month' && selectedMonth !== null) {
      return d.month === selectedMonth;
    }
    return true;
  });

  const handleToggleReadDocument = () => {
    if (!selectedDocument) return;
    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speechService.speak(
      `${selectedDocument.title}.\n${selectedDocument.extractedText}`,
      settings.speechRate,
      () => setIsSpeaking(false)
    );
  };

  return (
    <div className="p-5 space-y-6 max-w-5xl mx-auto">
      {/* Conteúdo da Pasta Aberta */}
      {openSubjectIds.length > 0 && (
        <section
          aria-labelledby="folder-structure-heading"
          className="rounded-2xl p-4 border shadow-2xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h1 id="folder-structure-heading" className="text-base font-bold">
                Pasta Aberta: {currentSubject.name} ({selectedYear})
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Caminho no computador: <code>Pastas_do_Aluno/{selectedYear}/{currentSubject.shortName}</code>
              </p>
            </div>
          </div>

          {/* Barra de Subpastas da Disciplina: Todos | Subpasta Provas | Meses 1..12 */}
          <div
            className="pt-2 border-t flex flex-wrap items-center gap-1.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => setSelectedSubfolder('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                selectedSubfolder === 'all' ? 'text-white font-semibold' : ''
              }`}
              style={{
                backgroundColor:
                  selectedSubfolder === 'all'
                    ? 'var(--brand-primary)'
                    : 'var(--bg-subtle)',
                borderColor:
                  selectedSubfolder === 'all'
                    ? 'var(--brand-primary)'
                    : 'var(--border-subtle)',
              }}
            >
              Todos os Meses
            </button>

            <button
              type="button"
              onClick={() => setSelectedSubfolder('provas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer border ${
                selectedSubfolder === 'provas'
                  ? 'bg-red-600 text-white border-red-600'
                  : ''
              }`}
              style={
                selectedSubfolder !== 'provas'
                  ? {
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-subtle)',
                    }
                  : undefined
              }
            >
              <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Subpasta: Provas</span>
            </button>

            {MONTHS_PT.map((m) => {
              const activeM =
                selectedSubfolder === 'month' && selectedMonth === m.number;
              return (
                <button
                  key={m.number}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(m.number);
                    setSelectedSubfolder('month');
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border"
                  style={{
                    backgroundColor: activeM
                      ? 'var(--brand-primary)'
                      : 'var(--bg-subtle)',
                    color: activeM ? '#ffffff' : 'var(--text-primary)',
                    borderColor: activeM
                      ? 'var(--brand-primary)'
                      : 'var(--border-subtle)',
                  }}
                >
                  {m.short}
                </button>
              );
            })}
          </div>

          {/* Arquivos na Pasta Selecionada */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredDocuments.length === 0 ? (
              <div
                className="col-span-full py-6 text-center rounded-xl border border-dashed text-xs"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Esta pasta ainda está vazia. Use o botão{' '}
                <strong>"Carregar PDF ou Foto"</strong> na coluna à esquerda para
                adicionar seus materiais!
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const isSelected = selectedDocument?.id === doc.id;
                const monthObj = MONTHS_PT.find((m) => m.number === doc.month);
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        setSelectedDocument(doc);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between gap-3 cursor-pointer transition ${
                      isSelected ? 'ring-2' : 'hover:opacity-95'
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--bg-subtle)'
                        : 'var(--bg-canvas)',
                      borderColor: isSelected
                        ? 'var(--brand-primary)'
                        : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {doc.fileType === 'image' ? (
                        <ImageIcon
                          className="w-5 h-5 mt-0.5 shrink-0 text-purple-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <FileText
                          className="w-5 h-5 mt-0.5 shrink-0 text-blue-500"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {doc.title}
                        </div>
                        <div
                          className="text-[11px] flex flex-wrap items-center gap-2 mt-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            Data: {doc.formattedDate}
                          </span>
                          <span>• {monthObj?.name}</span>
                          {doc.isExam && (
                            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-semibold">
                              Subpasta Provas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Leitor Limpo e Interativo do Arquivo Selecionado */}
      {selectedDocument && (
        <section
          aria-labelledby="selected-doc-heading"
          className="rounded-2xl p-5 border shadow-xs space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold text-white"
                  style={{
                    backgroundColor:
                      FIXED_SUBJECTS.find(
                        (s) => s.id === selectedDocument.subjectId
                      )?.color || 'var(--brand-primary)',
                  }}
                >
                  {
                    FIXED_SUBJECTS.find(
                      (s) => s.id === selectedDocument.subjectId
                    )?.name
                  }
                </span>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full border"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  📅 Data de Registro: {selectedDocument.formattedDate}
                </span>
                {selectedDocument.isExam && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-600 text-white font-semibold">
                    Subpasta: Provas
                  </span>
                )}
              </div>
              <h2 id="selected-doc-heading" className="text-lg font-bold">
                {selectedDocument.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleReadDocument}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {isSpeaking ? (
                  <>
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Parar Leitura</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                    <span>Ouvir em Áudio</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('funcoes')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Sparkles
                  className="w-4 h-4 text-amber-500"
                  aria-hidden="true"
                />
                <span>Usar nas Funções</span>
              </button>

              {selectedDocument.isExam && (
                <button
                  type="button"
                  onClick={() => setActiveTab('correcao')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span>Corrigir Prova</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteDocument(selectedDocument.id)}
                aria-label="Excluir documento"
                className="p-2 rounded-xl border text-red-500 hover:bg-red-500/10 cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Ajuste rápido de Pasta */}
          <div
            className="flex flex-wrap items-center gap-3 p-3 rounded-xl text-xs"
            style={{ backgroundColor: 'var(--bg-subtle)' }}
          >
            <span className="font-semibold">Pasta do documento:</span>
            <select
              aria-label="Alterar disciplina do documento"
              value={selectedDocument.subjectId}
              onChange={(e) =>
                updateDocument({
                  ...selectedDocument,
                  subjectId: e.target.value,
                })
              }
              className="rounded-lg px-2 py-1 border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {FIXED_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Alterar mês do documento"
              value={selectedDocument.month}
              onChange={(e) =>
                updateDocument({
                  ...selectedDocument,
                  month: Number(e.target.value),
                })
              }
              className="rounded-lg px-2 py-1 border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {MONTHS_PT.map((m) => (
                <option key={m.number} value={m.number}>
                  Mês: {m.name}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDocument.isExam}
                onChange={(e) =>
                  updateDocument({
                    ...selectedDocument,
                    isExam: e.target.checked,
                  })
                }
              />
              <span>Guardar na Subpasta de Provas</span>
            </label>
          </div>

          {selectedDocument.fileType === 'image' && selectedDocument.dataUrl && (
            <div className="rounded-xl overflow-hidden border p-2 flex justify-center bg-black/5">
              <img
                src={selectedDocument.dataUrl}
                alt={selectedDocument.title}
                className="max-h-80 object-contain rounded-lg"
              />
            </div>
          )}

          <div
            className="dyslexia-reading-area p-4 rounded-xl border whitespace-pre-line"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {selectedDocument.extractedText}
          </div>
        </section>
      )}
    </div>
  );
};
