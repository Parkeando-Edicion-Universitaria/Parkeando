// Sistema de audio para el juego
// Optimizado para móviles iOS y Android

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private activeClones: Set<HTMLAudioElement> = new Set();
  private volume: number = 1.0;
  private muted: boolean = false;
  private nextStep: number = 1;

  private constructor() {
    // Inicializar en el primer toque del usuario (requerido por iOS)
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initAudioContext() {
    try {
      // @ts-ignore - webkit prefix para iOS
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('AudioContext no disponible:', error);
    }
  }

  private shouldIgnorePlayError(error: unknown): boolean {
    if (!(error instanceof DOMException)) return false;
    return error.name === 'AbortError' || error.name === 'NotAllowedError';
  }

  private logPlayError(error: unknown, soundName: string) {
    if (this.shouldIgnorePlayError(error)) return;
    console.warn(`Error al reproducir audio (${soundName}):`, error);
  }

  private releaseClone(audioClone: HTMLAudioElement) {
    if (!this.activeClones.has(audioClone)) return;

    this.activeClones.delete(audioClone);
    audioClone.onended = null;
    audioClone.onabort = null;
    audioClone.onerror = null;
    audioClone.pause();
    audioClone.removeAttribute('src');
    audioClone.load();
  }

  // Precargar sonidos
  preloadSounds() {
    const soundFiles = [
      'click.mp3',
      'card.mp3',
      'dying.mp3',
      'notifications.mp3',
      'buying.mp3',
      'buying1.mp3',
      'winning.mp3',
      'rolling.mp3',
      /* 'main-theme.mp3', cargado bajo demanda para ahorrar 17MB al inicio */
      'jail.mp3',
      'moneyplus.mp3',
      'moneyminus.mp3',
      'step1.mp3',
      'step2.mp3',
    ];

    soundFiles.forEach((file) => {
      if (!this.sounds.has(file)) {
        const audio = new Audio(`/${file}`);
        audio.preload = 'auto';
        this.sounds.set(file, audio);
      }
    });
  }

  // Reproducir sonido
  play(soundName: string, volumeMultiplier: number = 1.0) {
    if (this.muted) return;

    try {
      // Reanudar AudioContext si está suspendido (iOS)
      if (this.audioContext?.state === 'suspended') {
        void this.audioContext
          .resume()
          .catch((error) => this.logPlayError(error, `${soundName}:resume`));
      }

      let audio = this.sounds.get(soundName);

      if (!audio) {
        audio = new Audio(`/${soundName}`);
        this.sounds.set(soundName, audio);
      }

      // Clonar para permitir múltiples reproducciones simultáneas
      const source = audio.currentSrc || audio.src || `/${soundName}`;
      const audioClone = new Audio(source);
      audioClone.volume = this.volume * volumeMultiplier;
      audioClone.preload = 'auto';
      this.activeClones.add(audioClone);

      const cleanupClone = () => {
        this.releaseClone(audioClone);
      };

      audioClone.onended = cleanupClone;
      audioClone.onabort = cleanupClone;
      audioClone.onerror = cleanupClone;

      // Reproducir con manejo de errores para móviles
      const playPromise = audioClone.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          this.logPlayError(error, soundName);
          cleanupClone();
        });
      }
    } catch (error) {
      this.logPlayError(error, soundName);
    }
  }

  // Sonidos específicos del juego
  playClick() {
    this.play('click.mp3', 0.5);
  }

  playCard() {
    this.play('card.mp3', 0.6);
  }

  playNotification() {
    this.play('notifications.mp3', 0.7);
  }

  playDiceRoll() {
    this.play('rolling.mp3', 0.8);
  }

  playMusic() {
    if (this.muted) return;
    let mainTheme = this.sounds.get('main-theme.mp3');
    if (!mainTheme) {
      mainTheme = new Audio('/main-theme.mp3');
      mainTheme.loop = true;
      mainTheme.volume = 0.3 * this.volume;
      this.sounds.set('main-theme.mp3', mainTheme);
    }
    if (mainTheme.paused) {
      mainTheme.play().catch((error) => this.logPlayError(error, 'main-theme.mp3'));
    }
  }

  stopMusic() {
    const mainTheme = this.sounds.get('main-theme.mp3');
    if (mainTheme && !mainTheme.paused) {
      mainTheme.pause();
    }
  }

  playCorrectAnswer() {
    this.play('buying1.mp3', 0.8);
  }

  playWrongAnswer() {
    this.play('dying.mp3', 0.3);
  }

  playWin() {
    this.play('winning.mp3', 1.0);
  }

  playJail() {
    this.play('jail.mp3', 0.8);
  }

  playMoneyPlus() {
    this.play('moneyplus.mp3', 0.7);
  }

  playMoneyMinus() {
    this.play('moneyminus.mp3', 0.6);
  }

  playStep() {
    const sound = this.nextStep === 1 ? 'step1.mp3' : 'step2.mp3';
    this.play(sound, 0.4);
    this.nextStep = this.nextStep === 1 ? 2 : 1;
  }

  playBuy() {
    this.play('buying.mp3', 0.8);
  }

  // Control de volumen
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }

  // Mutear/Desmutear
  setMuted(muted: boolean) {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  // Limpiar recursos
  cleanup() {
    this.activeClones.forEach((audioClone) => {
      this.releaseClone(audioClone);
    });

    this.sounds.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    this.sounds.clear();
  }
}

// Hook para usar en componentes React
export const useAudio = () => {
  return AudioManager.getInstance();
};
