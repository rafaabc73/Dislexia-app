import React, { useState } from 'react';
import { Compass, CheckCircle2, Sparkles, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIXED_SUBJECTS } from '../../constants/curriculum';
import { generatePersonalizedStudyPlan } from '../../services/geminiService';
import { speechService } from '../../services/speechService';

export const PlanningSidebar: React.FC = () => {
  const {
    studyPlans,
    addStudyPlan,
    activeStudyPlan,
    setActiveStudyPlan,
    settings,
    setMobilePane,
    showToast,
  } = useApp();

  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedDiffSubjects, setSelectedDiffSubjects] = useState<string[]>([]);
  const [examTopics, setExamTopics] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(40);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleDiffSubject = (id: string) => {
    setSelectedDiffSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const schedule = await generatePersonalizedStudyPlan(
        goal,
        deadline,
        selectedDiffSubjects,
        examTopics,
        dailyMinutes,
        settings.geminiApiKey,
        settings.geminiModel
      );
      const newPlan = {
        id: `plan-${Date.now()}`,
        goal,
        deadline,
        difficultSubjects: selectedDiffSubjects,
        examTopics,
        dailyMinutes,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        schedule,
      };
      addStudyPlan(newPlan);
      setMobilePane('workspace');
      showToast('Plano de Estudos Personalizado criado com sucesso!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Planejamento de Estudo
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Responda abaixo para montar seu roteiro adaptado
        </p>
      </div>

      <form onSubmit={handleCreatePlan} className="space-y-3">
        <div>
          <label htmlFor="plan-goal" className="block text-xs font-semibold mb-1">
            1. Para que você quer montar o plano?
          </label>
          <input
            id="plan-goal"
            type="text"
            required
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Ex: Estudar para a prova de sexta-feira"
            className="w-full rounded-xl px-2.5 py-2 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="plan-deadline"
            className="block text-xs font-semibold mb-1"
          >
            2. Tem algum prazo específico?
          </label>
          <input
            id="plan-deadline"
            type="text"
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="Ex: Até sexta-feira (5 dias)"
            className="w-full rounded-xl px-2.5 py-2 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          />
        </div>

        <div>
          <span className="block text-xs font-semibold mb-1.5">
            3. Quais matérias você tem mais dificuldade?
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FIXED_SUBJECTS.filter((s) => !s.isGeneralInfo).map((subj) => {
              const picked = selectedDiffSubjects.includes(subj.id);
              return (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => toggleDiffSubject(subj.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                    picked ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: picked ? subj.color : 'var(--bg-subtle)',
                    borderColor: picked ? subj.color : 'var(--border-subtle)',
                  }}
                >
                  {subj.shortName}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="plan-topics"
            className="block text-xs font-semibold mb-1"
          >
            4. Qual matéria/assunto vai cair na prova?
          </label>
          <textarea
            id="plan-topics"
            rows={3}
            required
            value={examTopics}
            onChange={(e) => setExamTopics(e.target.value)}
            placeholder="Digite os assuntos que vão cair caso ainda não estejam salvos nas pastas..."
            className="w-full rounded-xl p-2.5 text-xs border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="plan-minutes"
            className="block text-xs font-semibold mb-1"
          >
            5. Tempo de estudo diário (minutos por dia):
          </label>
          <div className="flex items-center gap-2">
            <input
              id="plan-minutes"
              type="range"
              min={15}
              max={360}
              step={15}
              value={Math.min(360, dailyMinutes)}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={10}
              max={600}
              step={5}
              aria-label="Digite os minutos de estudo diário"
              value={dailyMinutes}
              onChange={(e) =>
                setDailyMinutes(Math.max(10, Number(e.target.value) || 10))
              }
              className="w-20 rounded-lg px-2 py-1 text-xs font-bold border text-center"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            />
            <span className="text-xs font-semibold">min/dia</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-2.5 px-3 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>
            {isGenerating
              ? 'Montando Plano Personalizado...'
              : 'Criar Plano de Estudo Personalizado'}
          </span>
        </button>
      </form>

      {studyPlans.length > 0 && (
        <div
          className="pt-3 border-t space-y-1.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="text-[11px] font-bold uppercase"
            style={{ color: 'var(--text-secondary)' }}
          >
            Meus Planos Salvos
          </div>
          {studyPlans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActiveStudyPlan(p);
                setMobilePane('workspace');
              }}
              className={`w-full text-left p-2.5 rounded-xl text-xs border cursor-pointer ${
                activeStudyPlan?.id === p.id ? 'font-bold' : ''
              }`}
              style={{
                backgroundColor:
                  activeStudyPlan?.id === p.id
                    ? 'var(--bg-subtle)'
                    : 'var(--bg-surface)',
                borderColor:
                  activeStudyPlan?.id === p.id
                    ? 'var(--brand-primary)'
                    : 'var(--border-subtle)',
              }}
            >
              🧭 {p.goal} ({p.deadline})
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const PlanningWorkspace: React.FC = () => {
  const { activeStudyPlan, togglePlanStep, settings } = useApp();

  if (!activeStudyPlan) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div
          className="rounded-2xl p-6 border text-center space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <Compass
            className="w-10 h-10 mx-auto"
            style={{ color: 'var(--brand-primary)' }}
            aria-hidden="true"
          />
          <h1 className="text-lg font-bold">
            Monte seu Plano de Estudos Personalizado na Coluna ao Lado
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Informe seu objetivo, prazo, matérias de maior dificuldade e os
            assuntos da prova. O plano será dividido em blocos curtos ideais para
            quem tem TDAH e dislexia!
          </p>
        </div>
      </div>
    );
  }

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
            Prazo: {activeStudyPlan.deadline}
          </span>
          <h1 className="text-lg font-bold mt-1">{activeStudyPlan.goal}</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Assuntos mapeados: {activeStudyPlan.examTopics}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            speechService.speak(
              `Plano de estudo para ${activeStudyPlan.goal}. ${activeStudyPlan.schedule
                .map(
                  (s) =>
                    `${s.dayLabel}: estudar ${s.subjectName}, assunto ${s.topic}, usando ${s.technique}`
                )
                .join('. ')}`,
              settings.speechRate
            )
          }
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Volume2 className="w-4 h-4" aria-hidden="true" />
          <span>Ouvir Plano em Áudio</span>
        </button>
      </div>

      <div className="space-y-3">
        {activeStudyPlan.schedule.map((step) => (
          <div
            key={step.id}
            onClick={() => togglePlanStep(activeStudyPlan.id, step.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                togglePlanStep(activeStudyPlan.id, step.id);
              }
            }}
            className={`rounded-2xl p-4 border flex items-start gap-3.5 cursor-pointer transition ${
              step.completed ? 'opacity-65' : ''
            }`}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: step.completed
                ? '#16a34a'
                : 'var(--border-subtle)',
            }}
          >
            <div
              className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${
                step.completed
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : ''
              }`}
            >
              {step.completed && (
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="text-xs font-bold"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  {step.dayLabel} • {step.subjectName}
                </span>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'var(--bg-subtle)' }}
                >
                  ⏱️ Bloco curto: {step.durationMinutes} min
                </span>
              </div>
              <h3
                className={`text-sm font-bold ${
                  step.completed ? 'line-through' : ''
                }`}
              >
                {step.topic}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                🎯 <strong>Como estudar sem cansar:</strong> {step.technique}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

