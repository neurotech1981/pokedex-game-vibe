import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { TerrainType } from '../../types/terrain';

/**
 * Ambient particles for active terrain, mirroring the WeatherParticles
 * THREE.Points pattern: electric sparks rise, grassy motes drift, psychic
 * orbs circle, misty fog hugs the ground.
 */

interface TerrainParticleConfig {
    count: number;
    color: string;
    size: number;
    opacity: number;
    maxHeight: number;
    behavior: 'rise' | 'drift' | 'orbit' | 'hover';
    speed: number;
}

const TERRAIN_PARTICLE_CONFIG: Partial<Record<TerrainType, TerrainParticleConfig>> = {
    electric: { count: 130, color: '#ffe95c', size: 0.07, opacity: 0.85, maxHeight: 2.6, behavior: 'rise', speed: 1.6 },
    grassy: { count: 110, color: '#7ddc6c', size: 0.06, opacity: 0.7, maxHeight: 2.2, behavior: 'drift', speed: 0.45 },
    psychic: { count: 90, color: '#c17bff', size: 0.09, opacity: 0.75, maxHeight: 2.4, behavior: 'orbit', speed: 0.35 },
    misty: { count: 170, color: '#f4b8d8', size: 0.12, opacity: 0.4, maxHeight: 0.9, behavior: 'hover', speed: 0.25 },
};

const ARENA_RADIUS = 8;

const randomInArena = (maxHeight: number): [number, number, number] => {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * ARENA_RADIUS;
    return [Math.cos(angle) * radius, Math.random() * maxHeight, Math.sin(angle) * radius];
};

const TerrainParticles: React.FC<{ terrain: TerrainType }> = ({ terrain }) => {
    const config = TERRAIN_PARTICLE_CONFIG[terrain] ?? null;
    const pointsRef = useRef<THREE.Points>(null);

    const { positions, phases } = useMemo(() => {
        if (!config) return { positions: new Float32Array(0), phases: new Float32Array(0) };
        const pos = new Float32Array(config.count * 3);
        const ph = new Float32Array(config.count);
        for (let i = 0; i < config.count; i++) {
            const [x, y, z] = randomInArena(config.maxHeight);
            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;
            ph[i] = Math.random() * Math.PI * 2;
        }
        return { positions: pos, phases: ph };
    }, [config]);

    useFrame(({ clock }, delta) => {
        if (!config || !pointsRef.current) return;
        const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const t = clock.getElapsedTime();

        for (let i = 0; i < config.count; i++) {
            const ix = i * 3;
            switch (config.behavior) {
                case 'rise':
                    arr[ix + 1] += config.speed * delta * (0.6 + Math.sin(phases[i]) * 0.4 + 0.4);
                    arr[ix] += Math.sin(t * 3 + phases[i]) * 0.01;
                    if (arr[ix + 1] > config.maxHeight) {
                        const [x, , z] = randomInArena(config.maxHeight);
                        arr[ix] = x;
                        arr[ix + 1] = 0.05;
                        arr[ix + 2] = z;
                    }
                    break;
                case 'drift':
                    arr[ix + 1] += config.speed * delta * 0.5;
                    arr[ix] += Math.sin(t * 0.8 + phases[i]) * 0.006;
                    arr[ix + 2] += Math.cos(t * 0.6 + phases[i]) * 0.006;
                    if (arr[ix + 1] > config.maxHeight) arr[ix + 1] = 0.05;
                    break;
                case 'orbit': {
                    const angle = config.speed * delta;
                    const x = arr[ix];
                    const z = arr[ix + 2];
                    arr[ix] = x * Math.cos(angle) - z * Math.sin(angle);
                    arr[ix + 2] = x * Math.sin(angle) + z * Math.cos(angle);
                    arr[ix + 1] += Math.sin(t * 1.5 + phases[i]) * 0.004;
                    break;
                }
                case 'hover':
                    arr[ix] += Math.sin(t * 0.5 + phases[i]) * 0.008;
                    arr[ix + 1] = Math.max(0.05, arr[ix + 1] + Math.sin(t * 0.9 + phases[i]) * 0.002);
                    arr[ix + 2] += Math.cos(t * 0.4 + phases[i]) * 0.008;
                    break;
            }
        }
        attr.needsUpdate = true;
    });

    if (!config) return null;

    return (
        <points ref={pointsRef} key={terrain}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                color={config.color}
                size={config.size}
                transparent
                opacity={config.opacity}
                depthWrite={false}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export default TerrainParticles;
