// Roblox Classic Audio Engine (Jump, Death/OOF, Footstep Walking Loop)

class GameAudioManager {
  private walkingAudio: HTMLAudioElement | null = null;
  private jumpAudio: HTMLAudioElement | null = null;
  private deathAudio: HTMLAudioElement | null = null;
  private isWalkingPlaying: boolean = false;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.walkingAudio = new Audio('/roblox-walking-sound-faster.mp3');
        this.walkingAudio.loop = true;
        this.walkingAudio.volume = 0.55;

        this.jumpAudio = new Audio('/roblox-classic-jump.mp3');
        this.jumpAudio.volume = 0.6;

        this.deathAudio = new Audio('/roblox-death-sound_1.mp3');
        this.deathAudio.volume = 0.85;
      } catch (err) {
        console.warn('HTML5 Audio init fallback:', err);
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      } catch {
        // ignore
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public playJumpSound() {
    if (this.jumpAudio) {
      try {
        this.jumpAudio.currentTime = 0;
        const playPromise = this.jumpAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.playSynthJump();
          });
        }
        return;
      } catch {
        // Fallback
      }
    }
    this.playSynthJump();
  }

  public playDeathSound() {
    // Stop walking immediately when dead
    this.stopWalking();

    if (this.deathAudio) {
      try {
        this.deathAudio.currentTime = 0;
        const playPromise = this.deathAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.playSynthDeath();
          });
        }
        return;
      } catch {
        // Fallback
      }
    }
    this.playSynthDeath();
  }

  public setWalking(isWalking: boolean) {
    if (isWalking) {
      if (!this.isWalkingPlaying) {
        this.isWalkingPlaying = true;
        if (this.walkingAudio) {
          try {
            const playPromise = this.walkingAudio.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                // Ignore autoplay policies until user interaction
              });
            }
          } catch {
            // ignore
          }
        }
      }
    } else {
      this.stopWalking();
    }
  }

  public stopWalking() {
    if (this.isWalkingPlaying) {
      this.isWalkingPlaying = false;
      if (this.walkingAudio) {
        try {
          this.walkingAudio.pause();
          this.walkingAudio.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
  }

  // Synthesized audio fallbacks to guarantee 100% sound reliability
  private playSynthJump() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore
    }
  }

  private playSynthDeath() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // ignore
    }
  }
}

export const gameAudio = new GameAudioManager();
