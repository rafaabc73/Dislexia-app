import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  ShieldCheck,
  Volume2,
  Square,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FIXED_SUBJECTS } from '../../constants/curriculum';
import { sendFocusedChatMessage } from '../../services/geminiService';
import { speechService } from '../../services/speechService';

export const FocusedChatColumn: React.FC = () => {
  const {
    chatMessages,
    addChatMessage,
    clearChat,
    selectedSubjectId,
    selectedDocument,
    settings,
    isChatMinimized,
    setIsChatMinimized,
  } = useApp();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeSubject =
    FIXED_SUBJECTS.find((s) => s.id === selectedSubjectId) || FIXED_SUBJECTS[0];

  useEffect(() => {
    if (!isChatMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isLoading, isChatMinimized]);

  // Estado Minimizado: Pequena coluna lateral estreita igual à 1ª coluna da esquerda (72px)
  if (isChatMinimized) {
    return (
      <aside
        aria-label="Chat de Inteligência Artificial Minimizado"
        className="w-[72px] shrink-0 flex flex-col justify-between items-center py-3 select-none border-l"
        style={{
          backgroundColor: 'var(--bg-activity)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex flex-col items-center gap-2 w-full px-1.5">
          <button
            type="button"
            onClick={() => setIsChatMinimized(false)}
            aria-label="Expandir Chat de Inteligência Artificial"
            className="w-full py-2.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:opacity-100"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--brand-primary)',
            }}
          >
            <PanelRightOpen className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-semibold leading-tight text-center">
              Abrir Chat
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsChatMinimized(false)}
            aria-label="Tutor IA Focado"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs cursor-pointer mt-1"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 px-1 text-center">
          <ShieldCheck
            className="w-4 h-4 text-emerald-600"
            aria-hidden="true"
          />
          <span
            className="text-[9px] leading-tight"
            style={{ color: 'var(--text-secondary)' }}
          >
            Foco Ativo
          </span>
        </div>
      </aside>
    );
  }

  const handleSend = async (customText?: string) => {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    addChatMessage(userMsg);
    setInput('');
    setIsLoading(true);

    const response = await sendFocusedChatMessage(
      textToSend,
      activeSubject.name,
      selectedDocument,
      settings.geminiApiKey,
      settings.geminiModel
    );

    addChatMessage({
      id: `ai-${Date.now()}`,
      role: 'assistant',
      text: response.reply,
      wasRedirected: response.wasRedirected,
      timestamp: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setIsLoading(false);
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      speechService.stopSpeaking();
      setSpeakingMsgId(null);
      return;
    }
    setSpeakingMsgId(msgId);
    speechService.speak(text, settings.speechRate, () => {
      setSpeakingMsgId(null);
    });
  };

  const handleToggleDictation = () => {
    if (isDictating) {
      speechService.stopDictation();
      setIsDictating(false);
      return;
    }
    setIsDictating(true);
    speechService.startDictation(
      (transcript) => {
        setInput(transcript);
      },
      () => setIsDictating(false),
      (err) => {
        alert(err);
        setIsDictating(false);
      }
    );
  };

  const quickPrompts = [
    'Me explica com um exemplo fácil?',
    'Qual é a ideia principal deste texto?',
    'O que mais cai na prova sobre isso?',
  ];

  return (
    <aside
      aria-label="Chat de Inteligência Artificial com Foco no Estudo"
      className="w-full lg:w-[330px] xl:w-[360px] shrink-0 flex flex-col h-full border-l"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Cabeçalho do Chat com Botão Minimizar e Indicador de Restrição de Tópico */}
      <div
        className="p-3.5 border-b flex flex-col gap-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold leading-tight truncate">
                Tutor IA Focado
              </h2>
              <p
                className="text-xs leading-tight truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tira-dúvidas sem distrações
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={clearChat}
              className="p-1.5 rounded-lg text-xs flex items-center gap-1 hover:opacity-80 cursor-pointer border"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              aria-label="Limpar histórico do chat"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setIsChatMinimized(true)}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-80 cursor-pointer border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              aria-label="Minimizar coluna do chat de IA"
            >
              <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Minimizar</span>
            </button>
          </div>
        </div>

        {/* Selo de Trava de Tópico TDAH */}
        <div
          className="px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <ShieldCheck
            className="w-4 h-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          />
          <span className="truncate">
            <strong>Foco travado em:</strong> {activeSubject.shortName}
            {selectedDocument ? ` • ${selectedDocument.title}` : ''}
          </span>
        </div>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {chatMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                  isUser ? 'text-white' : 'border'
                }`}
                style={{
                  backgroundColor: isUser
                    ? 'var(--brand-primary)'
                    : msg.wasRedirected
                      ? 'rgba(245, 158, 11, 0.14)'
                      : 'var(--bg-subtle)',
                  borderColor: msg.wasRedirected
                    ? '#f59e0b'
                    : 'var(--border-subtle)',
                }}
              >
                {msg.text}

                {!isUser && (
                  <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleToggleSpeak(msg.id, msg.text)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-md cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {speakingMsgId === msg.id ? (
                        <>
                          <Square className="w-3 h-3" aria-hidden="true" />
                          <span>Parar áudio</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Ouvir resposta</span>
                        </>
                      )}
                    </button>
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div
            className="rounded-2xl px-3.5 py-2.5 text-xs border inline-block"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            Pensando em uma explicação bem simples...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sugestões Rápidas */}
      <div
        className="px-3 py-2 border-t flex flex-wrap gap-1.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {quickPrompts.map((qp) => (
          <button
            key={qp}
            type="button"
            onClick={() => handleSend(qp)}
            className="text-xs px-2.5 py-1 rounded-full border transition hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Campo de Pergunta */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t flex items-center gap-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <label htmlFor="focused-chat-input" className="visually-hidden">
          Digite ou fale sua dúvida sobre a matéria
        </label>
        <input
          id="focused-chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pergunte sobre ${activeSubject.shortName}...`}
          className="flex-1 rounded-xl px-3 py-2 text-sm border"
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="button"
          onClick={handleToggleDictation}
          aria-label={
            isDictating ? 'Parar ditado por voz' : 'Falar dúvida pelo microfone'
          }
          className={`p-2.5 rounded-xl border cursor-pointer ${
            isDictating ? 'bg-red-600 text-white border-red-600' : ''
          }`}
          style={
            !isDictating
              ? {
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }
              : undefined
          }
        >
          {isDictating ? (
            <MicOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Mic className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label="Enviar pergunta"
          className="p-2.5 rounded-xl text-white cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
};
