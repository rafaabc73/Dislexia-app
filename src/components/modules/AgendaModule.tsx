import React, { useState, useRef } from 'react';
import {
  CalendarClock,
  Camera,
  Plus,
  Bell,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIXED_SUBJECTS } from '../../constants/curriculum';
import { readFileAsDataUrl } from '../../services/pdfService';
import { extractAgendaFromPhoto } from '../../services/geminiService';

export const AgendaSidebar: React.FC = () => {
  const {
    addAgendaItems,
    settings,
    setMobilePane,
    showToast,
  } = useApp();

  const [manualTitle, setManualTitle] = useState('');
  const [manualSubj, setManualSubj] = useState('matematica');
  const [manualDate, setManualDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  );
  const [manualType, setManualType] = useState<
    'tarefa' | 'prova' | 'trabalho' | 'lembrete'
  >('prova');
  const [manualDesc, setManualDesc] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const boardPhotoRef = useRef<HTMLInputElement | null>(null);
  const plannerPhotoRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoScan = async (
    sourceType: 'foto_quadro' | 'foto_agenda',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const extracted = await extractAgendaFromPhoto(
        sourceType,
        file.type || 'image/jpeg',
        dataUrl,
        settings.geminiApiKey,
        settings.geminiModel
      );
      const newItems = extracted.map((item, idx) => ({
        ...item,
        id: `ag-scan-${Date.now()}-${idx}`,
      }));
      addAgendaItems(newItems);
      setMobilePane('workspace');
      showToast(
        `${newItems.length} compromisso(s) registrado(s) automaticamente com alerta no calendário!`
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    addAgendaItems([
      {
        id: `ag-man-${Date.now()}`,
        title: manualTitle.trim(),
        subjectId: manualSubj,
        dueDate: manualDate,
        type: manualType,
        description:
          manualDesc.trim() || 'Registrado manualmente com alerta ativo.',
        completed: false,
        source: 'manual',
        alertActive: true,
      },
    ]);
    setManualTitle('');
    setManualDesc('');
    setMobilePane('workspace');
    showToast('Data adicionada na Agenda com alerta!');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Agenda & Prazos
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Registre por foto do quadro/agenda ou manualmente
        </p>
      </div>

      {/* Leitura Automática por Foto */}
      <div
        className="p-3 rounded-xl border space-y-2"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="text-xs font-bold">
          📸 Registro Automático por Foto:
        </div>
        <input
          ref={boardPhotoRef}
          type="file"
          accept="image/*"
          onChange={(e) => handlePhotoScan('foto_quadro', e)}
          className="hidden"
        />
        <button
          type="button"
          disabled={isScanning}
          onClick={() => boardPhotoRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 cursor-pointer"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Foto do Quadro (Tarefas de Casa)</span>
        </button>

        <input
          ref={plannerPhotoRef}
          type="file"
          accept="image/*"
          onChange={(e) => handlePhotoScan('foto_agenda', e)}
          className="hidden"
        />
        <button
          type="button"
          disabled={isScanning}
          onClick={() => plannerPhotoRef.current?.click()}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Foto da Agenda Escolar</span>
        </button>
      </div>

      {/* Registro Manual de Provas e Tarefas */}
      <form
        onSubmit={handleAddManual}
        className="p-3 rounded-xl border space-y-2.5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="text-xs font-bold">✍️ Cadastrar Data Manualmente:</div>

        <div>
          <label htmlFor="ag-title" className="block text-[11px] font-semibold mb-1">
            O que vai acontecer?
          </label>
          <input
            id="ag-title"
            type="text"
            required
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Ex: Prova Bimestral de História"
            className="w-full rounded-lg px-2.5 py-1.5 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="ag-type" className="block text-[11px] font-semibold mb-1">
              Tipo:
            </label>
            <select
              id="ag-type"
              value={manualType}
              onChange={(e) => setManualType(e.target.value as any)}
              className="w-full rounded-lg px-2 py-1.5 text-xs border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <option value="prova">Prova</option>
              <option value="tarefa">Tarefa de Casa</option>
              <option value="trabalho">Trabalho</option>
              <option value="lembrete">Lembrete</option>
            </select>
          </div>

          <div>
            <label htmlFor="ag-date" className="block text-[11px] font-semibold mb-1">
              Data de Entrega:
            </label>
            <input
              id="ag-date"
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="w-full rounded-lg px-2 py-1.5 text-xs border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="ag-subj" className="block text-[11px] font-semibold mb-1">
            Disciplina:
          </label>
          <select
            id="ag-subj"
            value={manualSubj}
            onChange={(e) => setManualSubj(e.target.value)}
            className="w-full rounded-lg px-2 py-1.5 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {FIXED_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ag-desc" className="block text-[11px] font-semibold mb-1">
            Observações / Páginas:
          </label>
          <textarea
            id="ag-desc"
            rows={2}
            value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)}
            placeholder="Ex: Capítulos 3 e 4 da apostila"
            className="w-full rounded-lg p-2 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
          style={{ backgroundColor: '#16a34a' }}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Adicionar com Alerta no Calendário</span>
        </button>
      </form>
    </div>
  );
};

export const AgendaWorkspace: React.FC = () => {
  const { agendaItems, toggleAgendaItem, deleteAgendaItem } = useApp();

  const sorted = [...agendaItems].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  );

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      <div
        className="rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <CalendarClock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold">
              Calendário de Prazos, Provas e Tarefas
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Alertas visuais claros para evitar esquecimentos (TDA / TDAH)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((item) => {
          const subj = FIXED_SUBJECTS.find((s) => s.id === item.subjectId);
          return (
            <div
              key={item.id}
              className={`rounded-2xl p-4 border flex items-start justify-between gap-3 transition ${
                item.completed ? 'opacity-60' : ''
              }`}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor:
                  item.type === 'prova' && !item.completed
                    ? '#dc2626'
                    : 'var(--border-subtle)',
              }}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleAgendaItem(item.id)}
                  aria-label={
                    item.completed
                      ? 'Desmarcar tarefa concluída'
                      : 'Marcar como concluída'
                  }
                  className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer ${
                    item.completed
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : ''
                  }`}
                >
                  {item.completed && (
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{
                        backgroundColor: subj?.color || 'var(--brand-primary)',
                      }}
                    >
                      {subj?.shortName || 'Geral'}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        item.type === 'prova'
                          ? 'bg-red-500/15 text-red-500'
                          : 'bg-amber-500/15 text-amber-600'
                      }`}
                    >
                      {item.type}
                    </span>

                    <span className="text-xs font-bold inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                      Prazo: {item.dueDate.split('-').reverse().join('/')}
                    </span>

                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      ({item.source === 'foto_quadro'
                        ? '📸 Foto do Quadro'
                        : item.source === 'foto_agenda'
                          ? '📒 Foto da Agenda'
                          : '✍️ Manual'})
                    </span>
                  </div>

                  <h3
                    className={`text-sm font-bold mt-1 ${
                      item.completed ? 'line-through' : ''
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => deleteAgendaItem(item.id)}
                aria-label="Remover item da agenda"
                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

