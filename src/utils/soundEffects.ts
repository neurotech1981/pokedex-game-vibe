// Sound effects utility using Web Audio API
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let isInitialized = false;
let activeSources: AudioBufferSourceNode[] = [];
let soundBuffers: { [key: string]: AudioBuffer } = {};

// Background music elements
let bgmElement: HTMLAudioElement | null = null;
let bgmVolume = 0.3; // Default background music volume

// Define types for sound parameters
type WaveformType = 'sine' | 'square' | 'triangle' | 'sawtooth';
type SoundType = 'attack' | 'critical' | 'faint' | 'victory' | 'switch' | 'battleStart';
type MusicType = 'battleTheme' | 'victoryTheme' | 'menuTheme';

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

// Define music tracks
const musicTracks: { [key in MusicType]: string | string[] } = {
  battleTheme: [
    '/audio/battle/battle-theme-1.mp3',  // Original battle theme
    '/audio/battle/battle-theme-2.mp3',  // Medieval battle theme
    '/audio/battle/battle-theme-3.mp3',  // JRPG Epic Rock Battle Theme
    '/audio/battle/battle-theme-4.mp3'   // 8-bit battle theme
  ],
  victoryTheme: '/sounds/victory.mp3',    // Reusing sound as music for now
  menuTheme: '/audio/battle/battle-theme-1.mp3'  // Reusing battle theme for now
};

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

// Play background music
export const playMusic = (musicType: MusicType, loop: boolean = true) => {
  stopMusic(); // Stop any currently playing music

  // Get music URL or array of URLs
  const musicSource = musicTracks[musicType];

  // If it's an array, always pick a random track
  let musicUrl: string;
  if (Array.isArray(musicSource)) {
    // Always random selection
    const trackIndex = Math.floor(Math.random() * musicSource.length);
    console.log(`Playing random battle theme ${trackIndex + 1} of ${musicSource.length}`);
    musicUrl = musicSource[trackIndex];
  } else {
    musicUrl = musicSource;
  }

  // Create a new audio element for the music
  bgmElement = new Audio(musicUrl);
  bgmElement.volume = bgmVolume;
  bgmElement.loop = loop;

  // Play the music
  bgmElement.play().catch(error => {
    console.error(`Error playing music ${musicType}:`, error);
  });

  return bgmElement; // Return the element for external control if needed
};

// Stop background music
export const stopMusic = () => {
  if (bgmElement) {
    bgmElement.pause();
    bgmElement.currentTime = 0;
    bgmElement = null;
  }
};

// Pause background music
export const pauseMusic = () => {
  if (bgmElement) {
    bgmElement.pause();
  }
};

// Resume background music
export const resumeMusic = () => {
  if (bgmElement) {
    bgmElement.play().catch(error => {
      console.error('Error resuming music:', error);
    });
  }
};

// Set background music volume (separate from sound effects)
export const setMusicVolume = (newVolume: number) => {
  bgmVolume = Math.max(0, Math.min(1, newVolume));
  if (bgmElement) {
    bgmElement.volume = bgmVolume;
  }
};

// Get background music volume
export const getMusicVolume = () => bgmVolume;

// Fade out music over a specified duration
export const fadeOutMusic = (durationMs: number = 1000) => {
  if (!bgmElement) return;

  const startVolume = bgmElement.volume;
  const startTime = Date.now();

  const fadeInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const ratio = 1 - Math.min(elapsed / durationMs, 1);

    if (bgmElement) {
      bgmElement.volume = startVolume * ratio;
    }

    if (elapsed >= durationMs) {
      clearInterval(fadeInterval);
      stopMusic();
    }
  }, 50);
};

export const stopAllSounds = () => {
  // Stop all playing audio elements
  Object.values(soundElements).forEach(audio => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });

  // Also stop background music
  stopMusic();
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