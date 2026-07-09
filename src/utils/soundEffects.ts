// Sound effects utility using Web Audio API
import { localCry } from './spriteSources';

let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let isInitialized = false;

// Background music elements
let bgmElement: HTMLAudioElement | null = null;
let bgmVolume = 0.3; // Default background music volume

// Define types for sound parameters
type SoundType = 'attack' | 'critical' | 'faint' | 'victory' | 'switch' | 'battleStart';
type MusicType = 'battleTheme' | 'victoryTheme' | 'menuTheme';

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

const base = import.meta.env.BASE_URL;

// Define music tracks
const musicTracks: { [key in MusicType]: string | string[] } = {
  battleTheme: [
    base + 'audio/battle/battle-theme-1.mp3',  // Original battle theme
    base + 'audio/battle/battle-theme-2.mp3',  // Medieval battle theme
    base + 'audio/battle/battle-theme-3.mp3',  // JRPG Epic Rock Battle Theme
    base + 'audio/battle/battle-theme-4.mp3'   // 8-bit battle theme
  ],
  victoryTheme: base + 'sounds/victory.mp3',    // Reusing sound as music for now
  menuTheme: base + 'audio/battle/battle-theme-1.mp3'  // Reusing battle theme for now
};

// Preload all sounds
export const preloadSounds = async () => {
  initAudio();

  const soundFiles: { [key in SoundType]: string } = {
    attack: base + 'sounds/attack.mp3',
    critical: base + 'sounds/critical.mp3',
    faint: base + 'sounds/faint.mp3',
    victory: base + 'sounds/victory.mp3',
    switch: base + 'sounds/switch.mp3',
    battleStart: base + 'sounds/battle-start.mp3'
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

// ---------------------------------------------------------------------------
// Pokémon cries, streamed from the PokeAPI cries mirror (keyed by dex id).
// ---------------------------------------------------------------------------

const CRY_BASE = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest';
const cryCache = new Map<number, HTMLAudioElement>();

/** Gen 1–2 cries are bundled (scripts/fetch-assets.sh) — same-origin, no rate limit. */
const cryUrl = (pokemonId: number) => localCry(pokemonId) ?? `${CRY_BASE}/${pokemonId}.ogg`;

/**
 * Play a Pokémon's cry (send-out, faint, Pokédex button). Best-effort:
 * missing files, blocked autoplay and offline all fail silently.
 */
export const playCry = (pokemonId: number, volumeScale = 1) => {
  try {
    let audio = cryCache.get(pokemonId);
    if (!audio) {
      audio = new Audio(cryUrl(pokemonId));
      audio.preload = 'auto';
      audio.onerror = () => undefined;
      cryCache.set(pokemonId, audio);
    }
    audio.volume = Math.max(0, Math.min(1, volume * volumeScale));
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  } catch {
    // Audio unavailable (SSR/headless) — cries are flavor only
  }
};

// ---------------------------------------------------------------------------
// Synthesized chimes (no audio assets needed): short oscillator arpeggios
// for meta-game moments. Respects the SFX volume; silently no-ops when the
// browser's autoplay policy keeps the AudioContext suspended.
// ---------------------------------------------------------------------------

export type ChimeType = 'levelUp' | 'recruit' | 'evolve';

// Note frequencies (Hz), played sequentially with a soft envelope
const CHIME_NOTES: Record<ChimeType, number[]> = {
  levelUp: [523.25, 659.25, 783.99],                    // C5 E5 G5
  recruit: [440, 587.33],                               // A4 D5
  evolve: [523.25, 659.25, 783.99, 1046.5],             // C5 E5 G5 C6 fanfare
};

export const playChime = (type: ChimeType) => {
  try {
    initAudio();
    if (!audioContext || !gainNode) return;
    if (audioContext.state === 'suspended') {
      // Best effort: resume needs a user gesture; bail quietly otherwise
      void audioContext.resume().catch(() => undefined);
      if (audioContext.state === 'suspended') return;
    }
    const now = audioContext.currentTime;
    const stepDuration = type === 'evolve' ? 0.14 : 0.11;
    CHIME_NOTES[type].forEach((freq, i) => {
      const osc = audioContext!.createOscillator();
      const envelope = audioContext!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = now + i * stepDuration;
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(volume * 0.35, start + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + stepDuration * 2);
      osc.connect(envelope);
      envelope.connect(gainNode!);
      osc.start(start);
      osc.stop(start + stepDuration * 2.2);
    });
  } catch {
    // Audio unavailable — chimes are cosmetic
  }
};

// Clean up audio resources
export const cleanup = () => {
  stopAllSounds();
  if (audioContext) {
    audioContext.close();
    audioContext = null;
    gainNode = null;
    isInitialized = false;
  }
};