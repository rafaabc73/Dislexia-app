import React, { useState, useRef } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  KeyRound,
  Type,
  Download,
  Upload,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportFullBackup } from '../../services/storageService';

export const SettingsSidebar: React.FC = () => {
  const { settings, updateSettings } = useApp();

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3.5 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Configurações
        </h2>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Tema, Chave API da LLM e Acessibilidade de Leitura
        </p>
      </div>

      {/* Atalhos Rápidos na 2ª Coluna */}
      <div
        className="p-3 rounded-xl border space-y-2.5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="text-xs font-bold">🎨 Tema Visual:</div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'light', label: 'Claro', icon: <Sun className="w-3.5 h-3.5" /> },
            { id: 'dark', label: 'Escuro', icon: <Moon className="w-3.5 h-3.5" /> },
            {
              id: 'system',
              label: 'Sistema',
              icon: <Monitor className="w-3.5 h-3.5" />,
            },
          ].map((t) => {
            const active = settings.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateSettings({ theme: t.id as any })}
                className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 cursor-pointer ${
                  active ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: active
                    ? 'var(--brand-primary)'
                    : 'var(--bg-subtle)',
                  borderColor: active
                    ? 'var(--brand-primary)'
                    : 'var(--border-subtle)',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="p-3 rounded-xl border space-y-2"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="text-xs font-bold">📏 Régua de Leitura (Dislexia):</div>
        <button
          type="button"
          onClick={() =>
            updateSettings({
              readingRulerEnabled: !settings.readingRulerEnabled,
            })
          }
          className={`w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
            settings.readingRulerEnabled ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: settings.readingRulerEnabled
              ? 'var(--brand-primary)'
              : 'var(--bg-subtle)',
            borderColor: settings.readingRulerEnabled
              ? 'var(--brand-primary)'
              : 'var(--border-subtle)',
          }}
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span>
            {settings.readingRulerEnabled
              ? 'Régua de Leitura: ATIVADA'
              : 'Ativar Régua de Leitura'}
          </span>
        </button>
      </div>
    </div>
  );
};

export const SettingsWorkspace: React.FC = () => {
  const { settings, updateSettings, importBackupJson, showToast } = useApp();
  const [apiKeyInput, setApiKeyInput] = useState(settings.geminiApiKey);
  const [savedNotice, setSavedNotice] = useState(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ geminiApiKey: apiKeyInput.trim() });
    setSavedNotice(true);
    showToast('Chave da API salva com sucesso!');
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleExportBackup = async () => {
    const json = await exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dislexia-app-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importBackupJson(text);
    if (backupInputRef.current) backupInputRef.current.value = '';
  };

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      <div
        className="rounded-2xl p-5 border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <h1 className="text-lg font-bold">
          ⚙️ Configurações do Aplicativo
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Personalize o Tema Claro/Escuro, carregue sua Chave API da LLM e
          ajuste as fontes sans-serif para leitura confortável.
        </p>
      </div>

      {/* 1. Chave API da LLM Utilizada */}
      <section
        aria-labelledby="llm-key-heading"
        className="rounded-2xl p-5 border space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <KeyRound
            className="w-5 h-5"
            style={{ color: 'var(--brand-primary)' }}
            aria-hidden="true"
          />
          <h2 id="llm-key-heading" className="text-base font-bold">
            Chave API da LLM (Google Gemini)
          </h2>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Cole abaixo sua chave gratuita do Google AI Studio (
          <code>https://aistudio.google.com/apikey</code>). Sua chave fica salva
          apenas no seu próprio computador/celular e nunca vai para o GitHub.
        </p>

        <form onSubmit={handleSaveApiKey} className="space-y-3">
          <div>
            <label
              htmlFor="gemini-api-key-input"
              className="block text-xs font-semibold mb-1"
            >
              Chave API (API Key):
            </label>
            <input
              id="gemini-api-key-input"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl px-3.5 py-2.5 text-sm border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Salvar Chave API</span>
            </button>

            {savedNotice && (
              <span className="text-xs font-semibold text-emerald-600">
                ✓ Chave salva!
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 2. Tema Claro ou Escuro */}
      <section
        aria-labelledby="theme-heading"
        className="rounded-2xl p-5 border space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <h2 id="theme-heading" className="text-base font-bold">
          🌞 / 🌙 Tema Claro ou Escuro
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'light',
              title: 'Tema Claro',
              desc: 'Fundo suave sem brilho excessivo',
              icon: <Sun className="w-5 h-5" />,
            },
            {
              id: 'dark',
              title: 'Tema Escuro',
              desc: 'Reduz o cansaço visual à noite',
              icon: <Moon className="w-5 h-5" />,
            },
            {
              id: 'system',
              title: 'Automático (Sistema)',
              desc: 'Acompanha o Windows ou iOS',
              icon: <Monitor className="w-5 h-5" />,
            },
          ].map((opt) => {
            const active = settings.theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateSettings({ theme: opt.id as any })}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 cursor-pointer ${
                  active ? 'ring-2 font-bold' : ''
                }`}
                style={{
                  backgroundColor: active
                    ? 'var(--bg-subtle)'
                    : 'var(--bg-canvas)',
                  borderColor: active
                    ? 'var(--brand-primary)'
                    : 'var(--border-subtle)',
                }}
              >
                <div style={{ color: 'var(--brand-primary)' }}>{opt.icon}</div>
                <div>
                  <div className="text-xs font-bold">{opt.title}</div>
                  <div
                    className="text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Tipografia Sans-Serif e Conforto Visual para Dislexia */}
      <section
        aria-labelledby="typography-heading"
        className="rounded-2xl p-5 border space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <Type
            className="w-5 h-5"
            style={{ color: 'var(--brand-primary)' }}
            aria-hidden="true"
          />
          <h2 id="typography-heading" className="text-base font-bold">
            Fontes Sans-Serif e Espaçamento (Apoio à Dislexia)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="font-family-select"
              className="block text-xs font-semibold mb-1"
            >
              Fonte Sans-Serif:
            </label>
            <select
              id="font-family-select"
              value={settings.fontFamily}
              onChange={(e) =>
                updateSettings({ fontFamily: e.target.value as any })
              }
              className="w-full rounded-xl px-3 py-2 text-xs border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <option value="Lexend">
                Lexend (Sans-Serif projetada para fluência de leitura)
              </option>
              <option value="Inter">
                Inter (Sans-Serif limpa e moderna)
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="speech-rate-range"
              className="block text-xs font-semibold mb-1"
            >
              Velocidade da Voz em Áudio: {settings.speechRate.toFixed(1)}x
            </label>
            <input
              id="speech-rate-range"
              type="range"
              min={0.7}
              max={1.3}
              step={0.1}
              value={settings.speechRate}
              onChange={(e) =>
                updateSettings({ speechRate: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="font-size-range"
              className="block text-xs font-semibold mb-1"
            >
              Tamanho da Letra: {settings.fontSize}px
            </label>
            <input
              id="font-size-range"
              type="range"
              min={15}
              max={22}
              step={1}
              value={settings.fontSize}
              onChange={(e) =>
                updateSettings({ fontSize: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="line-height-range"
              className="block text-xs font-semibold mb-1"
            >
              Espaçamento entre Linhas: {settings.lineHeight}
            </label>
            <input
              id="line-height-range"
              type="range"
              min={1.5}
              max={2.2}
              step={0.05}
              value={settings.lineHeight}
              onChange={(e) =>
                updateSettings({ lineHeight: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* 4. Backup para Transferir entre Windows e iPhone/iPad */}
      <section
        aria-labelledby="backup-heading"
        className="rounded-2xl p-5 border space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <h2 id="backup-heading" className="text-base font-bold">
          💾 Backup dos Seus Estudos (Computador ⇄ iPhone/iPad)
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Exportar Backup (.json)</span>
          </button>

          <input
            ref={backupInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Importar Backup</span>
          </button>
        </div>
      </section>
    </div>
  );
};

