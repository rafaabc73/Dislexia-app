import React, { useState, useRef } from 'react';
import {
  CalendarClock,
  Camera,
  Plus,
  Bell,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIXED_SUBJECTS, MONTHS_PT } from '../../constants/curriculum';
import { readFileAsDataUrl } from '../../services/pdfService';
import { extractAgendaFromPhoto } from '../../services/geminiService';

export const AgendaSidebar: React.FC = () => {
  const { addAgendaItems, settings, setMobilePane, showToast } = useApp();

  const [manualTitle, setManualTitle] = useState('');
  const [manualSubj, setManualSubj] = useState('matematica');
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
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
        `${newItems.length} compromisso(s) registrado(s) automaticamente no calendário!`
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
    showToast('Data adicionada no Calendário e na Lista de Tarefas!');
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
          <label
            htmlFor="ag-title"
            className="block text-[11px] font-semibold mb-1"
          >
            O que precisa fazer ou entregar?
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
            <label
              htmlFor="ag-type"
              className="block text-[11px] font-semibold mb-1"
            >
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
            <label
              htmlFor="ag-date"
              className="block text-[11px] font-semibold mb-1"
            >
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
          <label
            htmlFor="ag-subj"
            className="block text-[11px] font-semibold mb-1"
          >
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
          <label
            htmlFor="ag-desc"
            className="block text-[11px] font-semibold mb-1"
          >
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

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth()); // 0..11

  // Filtra apenas tarefas não realizadas e ordena das mais próximas do vencimento até as mais distantes
  const pendingItems = agendaItems
    .filter((item) => !item.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthLabel =
    MONTHS_PT[calendarMonth]?.name || 'Mês';

  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstDayOfMonth }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayIso = now.toISOString().slice(0, 10);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-6">
      {/* 1. CALENDÁRIO DO MÊS COM MARCAÇÕES NOS DIAS COM TAREFAS/ENTREGAS */}
      <section
        aria-labelledby="calendar-heading"
        className="rounded-2xl p-5 border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <CalendarClock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 id="calendar-heading" className="text-lg font-bold">
                Calendário de {monthLabel} de {calendarYear}
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Dias marcados possuem tarefas, trabalhos ou provas para entregar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              className="p-2 rounded-xl border cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-xs font-bold px-2">
              {monthLabel} / {calendarYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              className="p-2 rounded-xl border cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Grade de Dias da Semana */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="py-1.5 text-xs font-bold uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              {wd}
            </div>
          ))}

          {calendarCells.map((dayNum, idx) => {
            if (dayNum === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[78px] rounded-xl opacity-25"
                />
              );
            }

            const dateIso = `${calendarYear}-${String(
              calendarMonth + 1
            ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayTasks = pendingItems.filter((t) => t.dueDate === dateIso);
            const isToday = dateIso === todayIso;
            const hasTasks = dayTasks.length > 0;

            return (
              <div
                key={dateIso}
                className={`min-h-[82px] p-2 rounded-xl border flex flex-col justify-between text-left transition ${
                  hasTasks ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: hasTasks
                    ? 'var(--bg-subtle)'
                    : 'var(--bg-canvas)',
                  borderColor: hasTasks
                    ? 'var(--brand-primary)'
                    : isToday
                      ? '#f59e0b'
                      : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-amber-500 text-white' : ''
                    }`}
                  >
                    {dayNum}
                  </span>
                  {hasTasks && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Marcações visuais das entregas do dia */}
                <div className="space-y-1 mt-1">
                  {dayTasks.slice(0, 2).map((t) => {
                    const subj = FIXED_SUBJECTS.find(
                      (s) => s.id === t.subjectId
                    );
                    return (
                      <div
                        key={t.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate font-semibold text-white"
                        style={{
                          backgroundColor:
                            t.type === 'prova'
                              ? '#dc2626'
                              : subj?.color || 'var(--brand-primary)',
                        }}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 2 && (
                    <div
                      className="text-[10px] font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      +{dayTasks.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. LISTA DE TAREFAS QUE PRECISAM SER FEITAS (DAS MAIS PRÓXIMAS ATÉ AS MAIS DISTANTES) */}
      <section
        aria-labelledby="task-list-heading"
        className="rounded-2xl p-5 border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="task-list-heading" className="text-base font-bold">
              📋 Tarefas e Entregas Pendentes (Do vencimento mais próximo ao
              mais distante)
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Ao marcar uma tarefa como realizada, ela é concluída e some da
              lista automaticamente
            </p>
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--brand-primary)',
            }}
          >
            {pendingItems.length} pendente(s)
          </span>
        </div>

        {pendingItems.length === 0 ? (
          <div
            className="p-6 rounded-xl border border-dashed text-center text-xs"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            Nenhuma tarefa pendente no momento! Use a coluna ao lado para
            adicionar tarefas manualmente ou enviar uma foto do quadro/agenda.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingItems.map((item) => {
              const subj = FIXED_SUBJECTS.find((s) => s.id === item.subjectId);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-4 border flex items-start justify-between gap-3 transition"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor:
                      item.type === 'prova'
                        ? '#dc2626'
                        : 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleAgendaItem(item.id)}
                      aria-label={`Marcar "${item.title}" como realizada`}
                      className="mt-0.5 px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition shrink-0"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Realizada</span>
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{
                            backgroundColor:
                              subj?.color || 'var(--brand-primary)',
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
                          Vencimento:{' '}
                          {item.dueDate.split('-').reverse().join('/')}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold mt-1">{item.title}</h3>
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
                    aria-label="Excluir tarefa"
                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
