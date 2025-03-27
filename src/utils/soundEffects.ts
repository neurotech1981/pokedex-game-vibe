// Sound effects utility using Web Audio API
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let isInitialized = false;
let activeSources: AudioBufferSourceNode[] = [];
let soundBuffers: { [key: string]: AudioBuffer } = {};

// Define types for sound parameters
type WaveformType = 'sine' | 'square' | 'triangle' | 'sawtooth';
type SoundType = 'attack' | 'critical' | 'faint' | 'victory' | 'switch' | 'battleStart';

interface SoundParameters {
  duration: number;
  frequency: number;
  attack: number;
  decay: number;
  type: WaveformType;
}

// Initialize the audio context and gain node
const initAudio = () => {
  if (!isInitialized) {
    audioContext = new AudioContext();
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    isInitialized = true;
  }
};

// Create and cache audio elements for each sound
const soundElements: { [key in SoundType]?: HTMLAudioElement } = {};

// Preload all sounds
export const preloadSounds = async () => {
  initAudio();

  const soundFiles: { [key in SoundType]: string } = {
    attack: '/sounds/attack.mp3',
    critical: '/sounds/critical.mp3',
    faint: '/sounds/faint.mp3',
    victory: '/sounds/victory.mp3',
    switch: '/sounds/switch.mp3',
    battleStart: '/sounds/battle-start.mp3'
  };

  const loadPromises = Object.entries(soundFiles).map(([key, url]) => {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';

      audio.addEventListener('canplaythrough', () => {
        soundElements[key as SoundType] = audio;
        resolve();
      });

      audio.addEventListener('error', (error) => {
        console.error(`Error loading sound ${key}:`, error);
        reject(error);
      });
    });
  });

  try {
    await Promise.all(loadPromises);
    console.log('All sounds preloaded successfully');
  } catch (error) {
    console.error('Error preloading sounds:', error);
  }
};

let volume = 0.5;

export const playSound = (soundName: SoundType) => {
  initAudio();

  const audio = soundElements[soundName];
  if (!audio) {
    console.warn(`Sound ${soundName} not found`);
    return;
  }

  // Clone the audio element to allow multiple simultaneous plays
  const audioClone = audio.cloneNode() as HTMLAudioElement;
  audioClone.volume = volume;

  // Add to document temporarily (required for some browsers)
  document.body.appendChild(audioClone);

  // Play the sound
  audioClone.play().catch(error => {
    console.error(`Error playing sound ${soundName}:`, error);
  });

  // Clean up after playing
  audioClone.addEventListener('ended', () => {
    document.body.removeChild(audioClone);
  });
};

export const stopAllSounds = () => {
  // Stop all playing audio elements
  Object.values(soundElements).forEach(audio => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });
};

export const setVolume = (newVolume: number) => {
  volume = Math.max(0, Math.min(1, newVolume));
  if (gainNode) {
    gainNode.gain.value = volume;
  }
};

export const getVolume = () => volume;

// Clean up audio resources
export const cleanup = () => {
  stopAllSounds();
  if (audioContext) {
    audioContext.close();
    audioContext = null;
    gainNode = null;
    isInitialized = false;
  }
  soundBuffers = {};
};