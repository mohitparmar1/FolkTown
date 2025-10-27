import Phaser from "phaser";

/**
 * Audio Manager for handling all game sounds and music
 * Uses Web Audio API to generate simple sounds if audio files are not available
 */
export default class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
    this.musicPlaying = false;
    this.masterVolume = 0.5;

    // Initialize audio context for generated sounds
    this.initWebAudio();
  }

  initWebAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    } catch (e) {
      console.warn("Web Audio API not supported");
      this.audioContext = null;
    }
  }

  // Generate a simple beep sound
  generateBeep(frequency, duration, type = "square") {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);

    return oscillator;
  }

  // Play walking sound effect
  playWalkSound() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    // Short, subtle footstep sound
    this.generateBeep(200, 0.05, "sine");
  }

  // Play enemy kill sound
  playKillSound() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    // Victory sound - higher pitch, short
    this.generateBeep(400, 0.1, "sine");
    setTimeout(() => this.generateBeep(500, 0.1, "sine"), 50);
  }

  // Play attack sound
  playAttackSound() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    // Short hit sound
    this.generateBeep(100, 0.05, "square");
  }

  // Start background music
  startBackgroundMusic() {
    if (this.musicPlaying) return;

    // Check if user has audio files loaded
    if (this.sounds["bgMusic"]) {
      this.sounds["bgMusic"].play({
        loop: true,
        volume: 0.2,
      });
    } else {
      // Fallback: Generate ambient background sound
      this.playAmbientMusic();
    }

    this.musicPlaying = true;
  }

  // Generate ambient background music
  playAmbientMusic() {
    if (!this.audioContext) return;

    // Create a simple drone/ambient sound
    const notes = [220, 246.94, 261.63]; // A, B, C

    const playNote = (freq, delay) => {
      setTimeout(() => {
        this.generateBeep(freq, 2, "sine");
        if (this.musicPlaying) {
          playNote(freq, 4);
        }
      }, delay * 1000);
    };

    notes.forEach((freq, index) => {
      playNote(freq, index * 0.5);
    });
  }

  // Stop background music
  stopBackgroundMusic() {
    this.musicPlaying = false;
    if (this.sounds["bgMusic"]) {
      this.sounds["bgMusic"].stop();
    }
  }

  // Set master volume
  setVolume(volume) {
    this.masterVolume = volume;
    Object.values(this.sounds).forEach((sound) => {
      if (sound && sound.setVolume) {
        sound.setVolume(volume);
      }
    });
  }
}
