/**
 * TanpuraAudio - Audio synthesis class for generating authentic tanpura sounds
 * Uses React Native Audio API for high-performance audio generation with rich harmonics
 */

import { AudioContext } from 'react-native-audio-api';

class TanpuraAudio {
  constructor() {
    this.audioContext = null;
    this.isInitialized = false;
    this.currentOscillators = [];
    this.gainNode = null;
    this.filterNode = null;
    this.isPlaying = false;
  }

  /**
   * Initialize the audio context and setup audio nodes
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      // Create audio context
      this.audioContext = new AudioContext();
      
      // Create gain node for volume control (balanced for warm tanpura sound)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.setValueAtTime(0.35, this.audioContext.currentTime); // Balanced volume
      
      // Create filter for tanpura's warm, resonant character
      this.filterNode = this.audioContext.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(3000, this.audioContext.currentTime); // Warm but clear
      this.filterNode.Q.setValueAtTime(2, this.audioContext.currentTime); // Good resonance
      
      // Connect filter to gain to destination (simple, reliable chain)
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      this.isInitialized = true;
      console.log('TanpuraAudio initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TanpuraAudio:', error);
      throw error;
    }
  }

  /**
   * Generate authentic tanpura tone for a specific frequency
   * @param {number} baseFrequency - The base frequency of the swara
   * @param {number} duration - Duration in seconds (default: 2.0s)
   */
  async playSwara(baseFrequency, duration = 2.0) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isPlaying) {
      this.stopCurrentTone();
    }

    try {
      const now = this.audioContext.currentTime;
      const endTime = now + duration;
      
      // Create multiple oscillators for rich tanpura sound
      const oscillators = this.createTanpuraOscillators(baseFrequency, now, endTime);
      
      // Start all oscillators
      oscillators.forEach(osc => {
        osc.start(now);
        osc.stop(endTime);
      });
      
      this.currentOscillators = oscillators;
      this.isPlaying = true;
      
      // Clean up after the tone ends
      setTimeout(() => {
        this.isPlaying = false;
        this.currentOscillators = [];
      }, duration * 1000);
      
    } catch (error) {
      console.error('Failed to play swara tone:', error);
    }
  }

  /**
   * Create multiple oscillators to simulate authentic tanpura's rich harmonic content
   * @param {number} baseFreq - Base frequency
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {Array} Array of oscillator nodes
   */
  createTanpuraOscillators(baseFreq, startTime, endTime) {
    const oscillators = [];
    
    // Main tone (fundamental frequency) - sawtooth for rich harmonics
    const mainOsc = this.createOscillator(baseFreq, 'sawtooth', 0.4, startTime, endTime);
    oscillators.push(mainOsc);
    
    // Slightly detuned oscillators for the characteristic tanpura beating/jawari effect
    const detuneOsc1 = this.createOscillator(baseFreq * 1.003, 'sawtooth', 0.3, startTime, endTime);
    oscillators.push(detuneOsc1);
    
    const detuneOsc2 = this.createOscillator(baseFreq * 0.997, 'sawtooth', 0.3, startTime, endTime);
    oscillators.push(detuneOsc2);
    
    // Octave harmonic for richness
    const octaveOsc = this.createOscillator(baseFreq * 2, 'triangle', 0.2, startTime, endTime);
    oscillators.push(octaveOsc);
    
    // Perfect fifth for drone character
    const fifthOsc = this.createOscillator(baseFreq * 1.5, 'sine', 0.15, startTime, endTime);
    oscillators.push(fifthOsc);
    
    // Sub-harmonic for depth and body (classic tanpura characteristic)
    const subOsc = this.createOscillator(baseFreq * 0.5, 'triangle', 0.25, startTime, endTime);
    oscillators.push(subOsc);
    
    // Major third harmonic for warmth
    const thirdOsc = this.createOscillator(baseFreq * 1.25, 'sine', 0.1, startTime, endTime);
    oscillators.push(thirdOsc);
    
    return oscillators;
  }

  /**
   * Create a single oscillator with envelope
   * @param {number} frequency - Oscillator frequency
   * @param {string} waveType - Wave type (sine, square, sawtooth, triangle)
   * @param {number} volume - Volume multiplier
   * @param {number} startTime - Start time
   * @param {number} endTime - End time
   * @returns {OscillatorNode} Configured oscillator node
   */
  createOscillator(frequency, waveType, volume, startTime, endTime) {
    const oscillator = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();
    
    // Configure oscillator
    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    
    // Configure envelope (ADSR) - tanpura-style with gentle attack and long sustain
    const attackTime = 0.08; // Gentle pluck attack
    const decayTime = 0.25; // Natural decay
    const sustainLevel = volume * 0.75; // Good sustain for drone effect
    const releaseTime = 0.4; // Smooth release
    
    // Attack
    oscGain.gain.setValueAtTime(0, startTime);
    oscGain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    
    // Decay
    oscGain.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);
    
    // Sustain (maintain level until release)
    oscGain.gain.setValueAtTime(sustainLevel, endTime - releaseTime);
    
    // Release
    oscGain.gain.linearRampToValueAtTime(0, endTime);
    
    // Connect oscillator through gain to filter
    oscillator.connect(oscGain);
    oscGain.connect(this.filterNode);
    
    return oscillator;
  }

  /**
   * Stop the currently playing tone
   */
  stopCurrentTone() {
    if (this.currentOscillators.length > 0) {
      try {
        const now = this.audioContext.currentTime;
        this.currentOscillators.forEach(osc => {
          try {
            osc.stop(now);
          } catch (e) {
            // Oscillator might already be stopped
          }
        });
        this.currentOscillators = [];
        this.isPlaying = false;
      } catch (error) {
        console.error('Error stopping current tone:', error);
      }
    }
  }

  /**
   * Set master volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    if (this.gainNode && this.audioContext) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopCurrentTone();
    
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (error) {
        console.error('Error closing audio context:', error);
      }
    }
    
    this.audioContext = null;
    this.gainNode = null;
    this.filterNode = null;
    this.isInitialized = false;
  }

  /**
   * Check if audio is currently playing
   * @returns {boolean} True if audio is playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Quick test method to verify audio functionality
   * @param {number} frequency - Test frequency (default: 220Hz - A3)
   */
  async testTone(frequency = 220) {
    console.log(`Playing test tone at ${frequency}Hz`);
    await this.playSwara(frequency, 2.0);
  }
}

// Singleton instance
let tanpuraInstance = null;

/**
 * Get singleton instance of TanpuraAudio
 * @returns {TanpuraAudio} TanpuraAudio instance
 */
export const getTanpuraAudio = () => {
  if (!tanpuraInstance) {
    tanpuraInstance = new TanpuraAudio();
  }
  return tanpuraInstance;
};

/**
 * Utility function to play swara tone
 * @param {number} frequency - Swara frequency
 * @param {number} duration - Duration in seconds
 */
export const playSwaraTone = async (frequency, duration = 2.0, volume = null) => {
  const tanpura = getTanpuraAudio();
  
  // Temporarily set volume if specified
  const originalVolume = tanpura.gainNode ? tanpura.gainNode.gain.value : 0.5;
  if (volume !== null) {
    tanpura.setVolume(volume);
  }
  
  await tanpura.playSwara(frequency, duration);
  
  // Restore original volume if it was temporarily changed
  if (volume !== null) {
    setTimeout(() => {
      tanpura.setVolume(originalVolume);
    }, duration * 1000);
  }
};

/**
 * Utility function to stop current tone
 */
export const stopSwaraTone = () => {
  const tanpura = getTanpuraAudio();
  tanpura.stopCurrentTone();
};

/**
 * Set audio volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export const setSwaraVolume = (volume) => {
  const tanpura = getTanpuraAudio();
  tanpura.setVolume(volume);
};

export default TanpuraAudio;
