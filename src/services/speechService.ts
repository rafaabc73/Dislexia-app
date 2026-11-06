// Serviço de Voz Aprimorado com Prosódia Natural, Respeito a Pausas e Suporte a Voz Neural

interface SpeechSegment {
  text: string;
  pauseAfterMs: number;
  charOffset: number;
}

function normalizePortugueseForSpeech(raw: string): string {
  return raw
    .replace(/\bProfª\.?\b/gi, 'Professora')
    .replace(/\bProf\.?\b/gi, 'Professor')
    .replace(/\bpág\.?\b/gi, 'página')
    .replace(/\bpágs\.?\b/gi, 'páginas')
    .replace(/\bex:\s*/gi, 'por exemplo, ')
    .replace(/\bobs:\s*/gi, 'observação: ')
    .replace(/---?>/g, ', que se transforma em ')
    .replace(/➔|→/g, ', indo para ')
    .replace(/\bH2O\b/g, 'água H 2 O')
    .replace(/\bCO2\b/g, 'gás carbônico C O 2')
    .replace(/\bO2\b/g, 'oxigênio O 2')
    .replace(/R\$\s*(\d+)/g, '$1 reais')
    .replace(/(\d+)%/g, '$1 por cento')
    .replace(/[#*_`~]/g, '');
}

function buildNaturalSegments(rawText: string): SpeechSegment[] {
  const normalized = normalizePortugueseForSpeech(rawText);
  const lines = normalized.split(/\r?\n/);
  const segments: SpeechSegment[] = [];
  let runningCharOffset = 0;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.replace(/^[•\-▪▸*]\s*/, '').trim();
    if (!trimmedLine) {
      runningCharOffset += rawLine.length + 1;
      continue;
    }

    // Divide a linha em frases respeitando pontuação (. ! ? ; :)
    const parts = trimmedLine
      .split(/(?<=[.!?…:;])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);

    parts.forEach((part, idx) => {
      const isLastInLine = idx === parts.length - 1;
      let pauseAfterMs = 280;

      if (isLastInLine) {
        // Pausa maior ao fim de parágrafo, título ou item de lista
        pauseAfterMs = 460;
      } else if (/[:;]$/.test(part)) {
        pauseAfterMs = 230;
      } else if (/[.!?…]$/.test(part)) {
        pauseAfterMs = 340;
      }

      // Garante pontuação final suave para que o sintetizador faça a entonação descendente natural
      const textWithIntonation = /[.!?…:;]$/.test(part) ? part : `${part}.`;

      segments.push({
        text: textWithIntonation,
        pauseAfterMs,
        charOffset: runningCharOffset,
      });

      runningCharOffset += part.length + 1;
    });
  }

  return segments;
}

function pcmBase64ToWavUrl(base64Pcm: string, sampleRate = 24000): string {
  const binaryStr = atob(base64Pcm);
  const pcmLen = binaryStr.length;
  const wavBuffer = new ArrayBuffer(44 + pcmLen);
  const view = new DataView(wavBuffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcmLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate (16-bit mono)
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeStr(36, 'data');
  view.setUint32(40, pcmLen, true);

  const uint8 = new Uint8Array(wavBuffer, 44);
  for (let i = 0; i < pcmLen; i++) {
    uint8[i] = binaryStr.charCodeAt(i);
  }

  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class SpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private pauseTimer: number | null = null;
  private isCancelled: boolean = false;
  private recognition: any = null;

  private selectBestPortugueseVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter(
      (v) =>
        v.lang.toLowerCase().includes('pt-br') ||
        v.lang.toLowerCase().startsWith('pt')
    );

    if (ptVoices.length === 0) return null;

    // Prioriza vozes Neurais / Naturais / Enhanced / Premium do sistema
    const priorityKeywords = [
      'natural',
      'neural',
      'online',
      'francisca',
      'antonio',
      'thalita',
      'premium',
      'enhanced',
      'google português do brasil',
      'luciana',
      'joana',
    ];

    for (const kw of priorityKeywords) {
      const found = ptVoices.find((v) => v.name.toLowerCase().includes(kw));
      if (found) return found;
    }

    return ptVoices[0];
  }

  private getSavedGeminiKey(): string {
    try {
      const raw = localStorage.getItem('dislexia_app_settings_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.geminiApiKey?.trim() || '';
      }
    } catch {
      // ignore
    }
    return '';
  }

  private async tryNeuralGeminiTts(
    text: string,
    rate: number,
    onEnd?: () => void
  ): Promise<boolean> {
    const apiKey = this.getSavedGeminiKey();
    if (!apiKey || text.length > 1600) return false;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;
      const cleanPrompt = `Leia em português do Brasil com voz humana calorosa, pausada, didática e acolhedora, respeitando todas as vírgulas e pontos finais:\n\n${normalizePortugueseForSpeech(text)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: cleanPrompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
        }),
      });

      if (!res.ok) return false;
      const data = await res.json();
      const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData?.data || this.isCancelled) return false;

      const wavUrl = pcmBase64ToWavUrl(inlineData.data, 24000);
      const audio = new Audio(wavUrl);
      audio.playbackRate = Math.max(0.75, Math.min(1.35, rate));
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(wavUrl);
        this.currentAudio = null;
        onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(wavUrl);
        this.currentAudio = null;
        onEnd?.();
      };

      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  public speak(
    text: string,
    rate: number = 1.0,
    onEnd?: () => void,
    onBoundary?: (charIndex: number) => void
  ): void {
    this.stopSpeaking();
    this.isCancelled = false;

    if (typeof window === 'undefined') {
      onEnd?.();
      return;
    }

    // Tenta primeiro a voz neural humana do Gemini se a chave API estiver configurada
    this.tryNeuralGeminiTts(text, rate, onEnd).then((usedNeural) => {
      if (usedNeural || this.isCancelled) return;

      if (!('speechSynthesis' in window)) {
        alert('Seu navegador não suporta leitura em voz alta.');
        onEnd?.();
        return;
      }

      const segments = buildNaturalSegments(text);
      if (segments.length === 0) {
        onEnd?.();
        return;
      }

      const preferredVoice = this.selectBestPortugueseVoice();
      // Cadência levemente mais calma (0.95x do rate escolhido) para evitar fala apressada/robotizada
      const effectiveRate = Math.max(0.7, Math.min(1.35, rate * 0.96));

      let currentIndex = 0;

      const speakNextSegment = () => {
        if (this.isCancelled || currentIndex >= segments.length) {
          this.currentUtterance = null;
          onEnd?.();
          return;
        }

        const seg = segments[currentIndex];
        onBoundary?.(seg.charOffset);

        const utterance = new SpeechSynthesisUtterance(seg.text);
        utterance.lang = 'pt-BR';
        utterance.rate = effectiveRate;
        utterance.pitch = 1.02;

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        if (onBoundary) {
          utterance.onboundary = (ev) => {
            if (typeof ev.charIndex === 'number') {
              onBoundary(seg.charOffset + ev.charIndex);
            }
          };
        }

        utterance.onend = () => {
          if (this.isCancelled) return;
          currentIndex++;
          if (currentIndex < segments.length) {
            // Pausa respiratória natural entre frases e parágrafos
            this.pauseTimer = window.setTimeout(() => {
              speakNextSegment();
            }, seg.pauseAfterMs);
          } else {
            this.currentUtterance = null;
            onEnd?.();
          }
        };

        utterance.onerror = () => {
          if (this.isCancelled) return;
          currentIndex++;
          speakNextSegment();
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      };

      speakNextSegment();
    });
  }

  public stopSpeaking(): void {
    this.isCancelled = true;
    if (this.pauseTimer !== null) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  public isDictationSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public startDictation(
    onResult: (transcript: string, isFinal: boolean) => void,
    onEnd: () => void,
    onError: (errMsg: string) => void
  ): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError('Ditado por voz não suportado neste navegador. Tente usar Chrome, Edge ou Safari.');
      return;
    }

    this.stopDictation();

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }
      onResult(transcript, isFinal);
    };

    recognition.onerror = (event: any) => {
      onError(
        event.error === 'not-allowed'
          ? 'Permissão de microfone negada. Permita o uso do microfone no navegador.'
          : `Erro no microfone: ${event.error}`
      );
    };

    recognition.onend = () => {
      this.recognition = null;
      onEnd();
    };

    this.recognition = recognition;
    recognition.start();
  }

  public stopDictation(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
  }
}

export const speechService = new SpeechService();
