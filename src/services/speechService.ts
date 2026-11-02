// Serviço de Voz (Text-to-Speech e Ditado por Voz / Speech-to-Text)

class SpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognition: any = null;

  public speak(
    text: string,
    rate: number = 1.0,
    onEnd?: () => void,
    onBoundary?: (charIndex: number) => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Seu navegador não suporta leitura em voz alta nativa.');
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[#*_`~>•]/g, ' ').replace(/\s+/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = Math.max(0.7, Math.min(1.5, rate));

    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find((v) => v.lang.includes('pt-BR') && v.name.toLowerCase().includes('luciana')) ||
      voices.find((v) => v.lang.includes('pt-BR') && v.name.toLowerCase().includes('google')) ||
      voices.find((v) => v.lang.includes('pt-BR')) ||
      voices.find((v) => v.lang.startsWith('pt'));

    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    if (onBoundary) {
      utterance.onboundary = (event) => {
        if (typeof event.charIndex === 'number') {
          onBoundary(event.charIndex);
        }
      };
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      onEnd?.();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      onEnd?.();
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking(): void {
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

