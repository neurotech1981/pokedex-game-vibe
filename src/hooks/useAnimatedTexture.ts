import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { parseGIF, decompressFrames } from 'gifuct-js';

/**
 * Loads the first working sprite URL from a fallback ladder as a three.js
 * texture. Animated GIFs are decoded with gifuct-js, composited onto an
 * offscreen canvas and played back frame-by-frame inside useFrame; static
 * images load through TextureLoader. Any failure falls through to the
 * next candidate URL.
 *
 * Must be used inside an r3f <Canvas>.
 */

interface ComposedFrame {
    data: ImageData;
    delay: number;
}

interface GifPlayback {
    frames: ComposedFrame[];
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
    frameIndex: number;
    elapsedMs: number;
}

export interface AnimatedTextureResult {
    texture: THREE.Texture | null;
    /** width / height of the loaded image (1 while loading). */
    aspect: number;
}

const composeGifFrames = (buffer: ArrayBuffer): { frames: ComposedFrame[]; width: number; height: number } => {
    const gif = parseGIF(buffer);
    const rawFrames = decompressFrames(gif, true);
    if (rawFrames.length === 0) throw new Error('GIF has no frames');

    const width = gif.lsd.width;
    const height = gif.lsd.height;
    const work = document.createElement('canvas');
    work.width = width;
    work.height = height;
    const wctx = work.getContext('2d');
    const patchCanvas = document.createElement('canvas');
    const pctx = patchCanvas.getContext('2d');
    if (!wctx || !pctx) throw new Error('canvas 2d context unavailable');

    const frames: ComposedFrame[] = [];
    for (const frame of rawFrames) {
        const { dims } = frame;
        patchCanvas.width = dims.width;
        patchCanvas.height = dims.height;
        pctx.putImageData(new ImageData(new Uint8ClampedArray(frame.patch), dims.width, dims.height), 0, 0);
        wctx.drawImage(patchCanvas, dims.left, dims.top);
        frames.push({
            data: wctx.getImageData(0, 0, width, height),
            delay: Math.max(20, frame.delay || 80),
        });
        // Disposal type 2: restore to background (clear the patch area)
        if (frame.disposalType === 2) {
            wctx.clearRect(dims.left, dims.top, dims.width, dims.height);
        }
    }
    return { frames, width, height };
};

/**
 * If the whole ladder fails (flaky network, CDN throttling a burst of GIF
 * requests), retry it with backoff instead of leaving the sprite invisible
 * for the rest of the battle.
 */
const RETRY_DELAYS_MS = [1000, 3000, 8000];

export const useAnimatedTexture = (urls: string[]): AnimatedTextureResult => {
    const [result, setResult] = useState<AnimatedTextureResult>({ texture: null, aspect: 1 });
    const playbackRef = useRef<GifPlayback | null>(null);
    const key = urls.join('|');

    useEffect(() => {
        let cancelled = false;
        let created: THREE.Texture | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        playbackRef.current = null;
        setResult({ texture: null, aspect: 1 });

        const tryLoad = async (index: number, pass = 0): Promise<void> => {
            if (cancelled) return;
            if (index >= urls.length) {
                // Every candidate failed — schedule a fresh pass over the ladder
                if (pass < RETRY_DELAYS_MS.length) {
                    retryTimer = setTimeout(() => void tryLoad(0, pass + 1), RETRY_DELAYS_MS[pass]);
                }
                return;
            }
            const url = urls[index];
            try {
                if (url.toLowerCase().includes('.gif')) {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const { frames, width, height } = composeGifFrames(await res.arrayBuffer());
                    if (cancelled) return;

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('canvas 2d context unavailable');
                    ctx.putImageData(frames[0].data, 0, 0);

                    const texture = new THREE.CanvasTexture(canvas);
                    texture.magFilter = THREE.NearestFilter;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    created = texture;
                    playbackRef.current = { frames, ctx, texture, frameIndex: 0, elapsedMs: 0 };
                    setResult({ texture, aspect: width / height });
                } else {
                    const texture = await new THREE.TextureLoader().loadAsync(url);
                    if (cancelled) {
                        texture.dispose();
                        return;
                    }
                    texture.magFilter = THREE.NearestFilter;
                    texture.colorSpace = THREE.SRGBColorSpace;
                    created = texture;
                    const img = texture.image as { width: number; height: number };
                    setResult({ texture, aspect: img.width / img.height });
                }
            } catch {
                return tryLoad(index + 1, pass);
            }
        };

        void tryLoad(0);
        return () => {
            cancelled = true;
            clearTimeout(retryTimer);
            playbackRef.current = null;
            created?.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    useFrame((_, delta) => {
        const playback = playbackRef.current;
        if (!playback || playback.frames.length < 2) return;
        playback.elapsedMs += delta * 1000;
        let advanced = false;
        while (playback.elapsedMs >= playback.frames[playback.frameIndex].delay) {
            playback.elapsedMs -= playback.frames[playback.frameIndex].delay;
            playback.frameIndex = (playback.frameIndex + 1) % playback.frames.length;
            advanced = true;
        }
        if (advanced) {
            playback.ctx.putImageData(playback.frames[playback.frameIndex].data, 0, 0);
            playback.texture.needsUpdate = true;
        }
    });

    return result;
};
