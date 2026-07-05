import React, { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { CameraShake } from '@react-three/drei';
import type { BattleMon, TeamId, WeatherType } from '../../utils/battleEngine';
import type { DamageClass } from '../../data/moves';
import type { TerrainType } from '../../types/terrain';
import type { MoveAnimation } from '../../utils/moveAnimationHelper';
import { criticalOverlay, getMoveAnimation } from '../../utils/moveAnimationHelper';
import { spriteFallbacks } from '../../utils/spriteSources';
import { useAnimatedTexture } from '../../hooks/useAnimatedTexture';
import TerrainParticles from './TerrainParticles';

export interface SceneFx {
    id: number;
    attackerTeam: TeamId;
    moveType: string;
    damageClass: DamageClass;
    isCritical: boolean;
    isDamaging: boolean;
    /** Set when this fx sequence ended in a faint (drives the camera dolly). */
    faintedTeam?: TeamId;
    /** A Poké Ball was thrown at the wild mon (Safari mode). */
    ballThrow?: { shakes: number; caught: boolean };
    /** Move name — a handful of iconic moves get bespoke FX. */
    moveName?: string;
}

interface BattleScene3DProps {
    leftMon: BattleMon | null;
    rightMon: BattleMon | null;
    weather: WeatherType;
    terrain: TerrainType;
    fx: SceneFx | null;
    getTypeColor: (type: string) => string;
    /** Battle background image URL (gen-6 scene); null → abstract sky/floor. */
    backdrop?: string | null;
}

// Over-the-shoulder framing: the player's mon stands near the camera
// showing its back sprite; the enemy faces us from across the arena.
const PLAYER_SCALE = 2.4;
const ENEMY_SCALE = 2.7;
const PLAYER_POS: [number, number, number] = [-2.6, PLAYER_SCALE / 2 - 0.15, 1.3];
const ENEMY_POS: [number, number, number] = [2.4, ENEMY_SCALE / 2 - 0.1, -1.2];

const TERRAIN_COLORS: Record<TerrainType, string> = {
    none: '#3d5a3d',
    electric: '#8a7a1f',
    grassy: '#2e7d32',
    misty: '#7e6a9e',
    psychic: '#6a3d8a',
};

const WEATHER_FOG: Record<WeatherType, { color: string; density: number }> = {
    none: { color: '#0b1026', density: 0.02 },
    rain: { color: '#16223d', density: 0.045 },
    sunny: { color: '#3d2c14', density: 0.015 },
    sandstorm: { color: '#5a4a24', density: 0.06 },
    hail: { color: '#2a3a4d', density: 0.045 },
};

const SKY_GRADIENTS: Record<WeatherType, [string, string]> = {
    none: ['#24397a', '#0b1026'],
    rain: ['#2c3d5e', '#101a2e'],
    sunny: ['#c98a3d', '#3d2c14'],
    sandstorm: ['#8a713a', '#5a4a24'],
    hail: ['#4a6076', '#2a3a4d'],
};

const SkyDome: React.FC<{ weather: WeatherType }> = ({ weather }) => {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const [top, bottom] = SKY_GRADIENTS[weather];
            const grad = ctx.createLinearGradient(0, 0, 0, 256);
            grad.addColorStop(0, top);
            grad.addColorStop(1, bottom);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 4, 256);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, [weather]);

    return (
        <mesh>
            <sphereGeometry args={[40, 24, 16]} />
            <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
        </mesh>
    );
};

// Module-cached Pokéball texture (deliberately NOT useLoader: suspense would
// unmount the sprite mid-entry)
let pokeballTexture: THREE.Texture | null = null;
const getPokeballTexture = (): THREE.Texture => {
    if (!pokeballTexture) {
        pokeballTexture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/items/poke-ball.png`);
        pokeballTexture.magFilter = THREE.NearestFilter;
        pokeballTexture.colorSpace = THREE.SRGBColorSpace;
    }
    return pokeballTexture;
};

// Shared radial-gradient texture so glows and shadows fade out at the
// edges instead of rendering as hard-edged discs.
let radialTexture: THREE.CanvasTexture | null = null;
const getRadialTexture = (): THREE.CanvasTexture => {
    if (!radialTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
            grad.addColorStop(0.7, 'rgba(255,255,255,0.12)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 128, 128);
        }
        radialTexture = new THREE.CanvasTexture(canvas);
    }
    return radialTexture;
};

// Weather mood multiplied onto the backdrop image (white = untouched)
const BACKDROP_WEATHER_TINT: Record<WeatherType, string> = {
    none: '#ffffff',
    sunny: '#fff3dd',
    rain: '#7d8fb3',
    sandstorm: '#c2a36b',
    hail: '#a8c4d8',
};

const BACKDROP_DISTANCE = 20; // along the camera's view axis, behind the enemy
const BACKDROP_IMAGE_ASPECT = 800 / 480;

/**
 * A gen-6 battle scene image filling the camera frustum behind the arena.
 * Positioned along the camera's view axis (the camera is tilted toward the
 * origin) and sized "cover"-style: the image keeps its aspect ratio and
 * overfills the frustum. The painted battlefield ground in the image becomes
 * the visual floor; sprites, shadows, particles and FX all draw on top.
 */
const Backdrop: React.FC<{ url: string; weather: WeatherType }> = ({ url, weather }) => {
    const texture = useLoader(THREE.TextureLoader, url);
    texture.colorSpace = THREE.SRGBColorSpace;
    const { camera, size } = useThree();

    const placement = useMemo(() => {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const position = camera.position.clone().add(direction.multiplyScalar(BACKDROP_DISTANCE));
        const quaternion = camera.quaternion.clone();

        const fov = (camera as THREE.PerspectiveCamera).fov ?? 40;
        const frustumHeight = 2 * Math.tan((fov * Math.PI) / 360) * BACKDROP_DISTANCE;
        const frustumWidth = frustumHeight * (size.width / Math.max(1, size.height));
        // Cover: keep the image aspect, overfill the frustum (crop, never stretch)
        const height = Math.max(frustumHeight, frustumWidth / BACKDROP_IMAGE_ASPECT) * 1.06;
        const width = height * BACKDROP_IMAGE_ASPECT;
        return { position, quaternion, width, height };
    }, [camera, size.width, size.height]);

    return (
        <mesh position={placement.position} quaternion={placement.quaternion} renderOrder={-1}>
            <planeGeometry args={[placement.width, placement.height]} />
            <meshBasicMaterial
                map={texture}
                color={BACKDROP_WEATHER_TINT[weather]}
                fog={false}
                depthWrite={false}
                toneMapped={false}
            />
        </mesh>
    );
};

interface SpriteProps {
    mon: BattleMon;
    position: [number, number, number];
    /** Lunge direction along x (1 = toward the right/enemy, -1 = toward the player). */
    facing: 1 | -1;
    side: TeamId;
    scale: number;
    fx: SceneFx | null;
    glowColor: string;
}

const PokemonSprite: React.FC<SpriteProps> = ({ mon, position, facing, side, scale, fx, glowColor }) => {
    const spriteUrls = useMemo(
        () => spriteFallbacks(mon.pokemon.id, side === 1 ? 'back' : 'front', mon.pokemon.image, mon.shiny ?? false),
        [mon.pokemon.id, mon.pokemon.image, mon.shiny, side]
    );
    const { texture, aspect } = useAnimatedTexture(spriteUrls);

    const groupRef = useRef<THREE.Group>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const spriteRef = useRef<THREE.Mesh>(null);
    const ballRef = useRef<THREE.Mesh>(null);
    const flashRef = useRef<THREE.Mesh>(null);
    const flashMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const fxStart = useRef<number>(0);
    const lastFxId = useRef<number>(-1);
    const faintProgress = useRef<number>(0);
    const entryStart = useRef<number | null>(null);
    const phase = useMemo(() => Math.random() * Math.PI * 2, []);

    const isFainted = mon.currentHp <= 0;
    const isAttacker = fx !== null && fx.attackerTeam === mon.team;
    const isDefender = fx !== null && fx.attackerTeam !== mon.team && fx.isDamaging;

    // Keep sprite proportions from the source image, within sane bounds
    const width = scale * Math.min(1.6, Math.max(0.6, aspect));

    useFrame(({ clock }) => {
        const group = groupRef.current;
        const mat = matRef.current;
        if (!group || !mat) return;
        const t = clock.getElapsedTime();

        if (fx && fx.id !== lastFxId.current) {
            lastFxId.current = fx.id;
            fxStart.current = t;
        }
        const fxElapsed = fx ? t - fxStart.current : 99;

        // Pokéball send-out: ball arcs in, flash, sprite materializes
        if (entryStart.current === null) entryStart.current = t;
        const entry = t - entryStart.current;
        const entering = entry < 0.9;

        const ball = ballRef.current;
        if (ball) {
            if (entry < 0.35) {
                const p = entry / 0.35;
                ball.visible = true;
                ball.position.set(-facing * (1.8 - p * 1.8), 0.4 + Math.sin(p * Math.PI) * 0.9 - 0.4 * p, 0.3);
                ball.rotation.z = -facing * p * Math.PI * 2;
            } else {
                ball.visible = false;
            }
        }
        const flash = flashRef.current;
        const flashMat = flashMatRef.current;
        if (flash && flashMat) {
            if (entry >= 0.3 && entry < 0.65) {
                const p = (entry - 0.3) / 0.35;
                flash.visible = true;
                flash.scale.setScalar(0.5 + p * 2.4);
                flashMat.opacity = 0.9 * (1 - p);
            } else {
                flash.visible = false;
            }
        }
        let spriteScale = entering ? Math.max(0, Math.min(1, (entry - 0.35) / 0.35)) : 1;

        // Safari: the wild mon gets absorbed into a thrown ball, and pops
        // back out only if it breaks free
        const ballFx = fx?.ballThrow && mon.team === 2 ? fx.ballThrow : null;
        if (ballFx) {
            const ballTotal = 0.4 + ballFx.shakes * 0.35;
            if (fxElapsed >= 0.25 && fxElapsed < 0.45) spriteScale *= 1 - (fxElapsed - 0.25) / 0.2;
            else if (fxElapsed >= 0.45 && fxElapsed < ballTotal + 0.2) spriteScale = 0;
            else if (fxElapsed >= ballTotal + 0.2) spriteScale *= ballFx.caught ? 0 : Math.min(1, (fxElapsed - ballTotal - 0.2) / 0.25);
        }
        spriteRef.current?.scale.set(width * spriteScale, scale * spriteScale, 1);

        // Faint: sink + fade out
        if (isFainted) {
            faintProgress.current = Math.min(1, faintProgress.current + 0.02);
        } else {
            faintProgress.current = Math.max(0, faintProgress.current - 0.1);
        }
        const faint = faintProgress.current;
        const sink = scale / 2;

        let x = position[0];
        let z = position[2];
        const y = position[1] + Math.sin(t * 2 + phase) * 0.07;
        let tint = mon.status?.type === 'freeze' ? 0x9fd8ff : 0xffffff; // icy sheen

        // Attack lunge toward the opponent (harder for physical moves)
        if (isAttacker && fxElapsed < 0.45 && !entering) {
            const p = fxElapsed / 0.45;
            const amplitude = fx?.damageClass === 'physical' ? 1.5 : 1.1;
            const lunge = Math.sin(p * Math.PI) * amplitude;
            x += lunge * facing;
            z += lunge * 0.72 * -facing;
        }

        // Hit reaction: shake + red flash
        if (isDefender && fxElapsed > 0.25 && fxElapsed < 0.8 && !entering) {
            x += Math.sin(fxElapsed * 60) * 0.09;
            tint = 0xff5555;
        }

        group.position.x = x;
        group.position.y = y - faint * sink;
        group.position.z = z;
        group.rotation.z = -faint * facing * 0.6;
        mat.opacity = 1 - faint * 0.95;
        mat.color.setHex(tint);
    });

    const shadowY = -(scale / 2) + 0.12;

    return (
        <group ref={groupRef} position={position}>
            {texture && (
                <mesh ref={spriteRef} scale={[width, scale, 1]}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial
                        ref={matRef}
                        map={texture}
                        transparent
                        alphaTest={0.05}
                        side={THREE.DoubleSide}
                        toneMapped={false}
                    />
                </mesh>
            )}
            {/* Pokéball toss on entry */}
            <mesh ref={ballRef} visible={false}>
                <planeGeometry args={[0.55, 0.55]} />
                <meshBasicMaterial map={getPokeballTexture()} transparent alphaTest={0.1} toneMapped={false} />
            </mesh>
            {/* Materialize flash */}
            <mesh ref={flashRef} visible={false} position={[0, 0, 0.2]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    ref={flashMatRef}
                    map={getRadialTexture()}
                    color="#ffffff"
                    transparent
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
            {/* Ambient status particles (poison bubbles, embers, Zzz...) */}
            {mon.status && !isFainted && <StatusAura status={mon.status.type} height={scale} />}
            {/* Soft glow behind the sprite (gold for shiny/elite mons), fading radially */}
            <mesh position={[0, -0.05, side === 1 ? 0.15 : -0.15]}>
                <planeGeometry args={[scale * 1.15, scale * 1.15]} />
                <meshBasicMaterial
                    map={getRadialTexture()}
                    color={mon.shiny ? '#ffd700' : glowColor}
                    transparent
                    opacity={isFainted ? 0 : mon.shiny ? 0.4 : 0.25}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
            {/* Ground shadow, fading radially */}
            <mesh position={[0, shadowY, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]}>
                <planeGeometry args={[scale * 0.85, scale * 0.85]} />
                <meshBasicMaterial
                    map={getRadialTexture()}
                    color="#000000"
                    transparent
                    opacity={isFainted ? 0 : 0.5}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
};

// ---------------------------------------------------------------------------
// Move-class FX: special = beam, physical = slash crescent, status = sparkles
// ---------------------------------------------------------------------------

const BeamEffect: React.FC<{ from: [number, number, number]; to: [number, number, number]; color: string; thickness?: number }> = ({ from, to, color, thickness = 1 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const start = useRef<number | null>(null);

    const placement = useMemo(() => {
        const a = new THREE.Vector3(from[0], from[1], from[2]);
        const b = new THREE.Vector3(to[0], to[1] + 0.1, to[2]);
        const dir = b.clone().sub(a);
        const length = dir.length();
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
        return { mid, quaternion, length };
    }, [from, to]);

    useFrame(({ clock }) => {
        const mesh = meshRef.current;
        const mat = matRef.current;
        if (!mesh || !mat) return;
        const t = clock.getElapsedTime();
        if (start.current === null) start.current = t;
        const elapsed = t - start.current;
        if (elapsed >= 0.38) {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;
        const grow = (elapsed < 0.12 ? (elapsed / 0.12) * 0.5 : 0.5) * thickness;
        mesh.scale.set(1, grow, 1);
        mat.opacity = elapsed < 0.12 ? 0.95 : 0.95 * (1 - (elapsed - 0.12) / 0.26);
    });

    return (
        <mesh ref={meshRef} position={placement.mid} quaternion={placement.quaternion} visible={false}>
            <planeGeometry args={[placement.length, 1]} />
            <meshBasicMaterial
                ref={matRef}
                map={getRadialTexture()}
                color={color}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
            />
        </mesh>
    );
};

const SlashEffect: React.FC<{ at: [number, number, number]; color: string }> = ({ at, color }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const start = useRef<number | null>(null);

    useFrame(({ clock }) => {
        const mesh = meshRef.current;
        const mat = matRef.current;
        if (!mesh || !mat) return;
        const t = clock.getElapsedTime();
        if (start.current === null) start.current = t;
        const elapsed = t - start.current - 0.28; // land with the lunge
        if (elapsed < 0 || elapsed >= 0.28) {
            mesh.visible = elapsed < 0 ? false : mesh.visible && false;
            return;
        }
        mesh.visible = true;
        const p = elapsed / 0.28;
        mesh.rotation.z = 0.7 - p * 2.1; // swipe
        const s = 0.8 + p * 0.6;
        mesh.scale.set(s, s, 1);
        mat.opacity = 0.95 * (1 - p);
    });

    return (
        <mesh ref={meshRef} position={[at[0], at[1] + 0.2, at[2] + 0.5]} visible={false}>
            <ringGeometry args={[0.7, 1.05, 32, 1, 0, 1.7]} />
            <meshBasicMaterial
                ref={matRef}
                color={color}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

const SparkleEffect: React.FC<{ at: [number, number, number]; color: string }> = ({ at, color }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const matRef = useRef<THREE.PointsMaterial>(null);
    const start = useRef<number | null>(null);
    const COUNT = 20;

    const positions = useMemo(() => {
        const arr = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 1.6;
            arr[i * 3 + 1] = Math.random() * 1.4 - 0.4;
            arr[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
        }
        return arr;
    }, []);

    useFrame(({ clock }, delta) => {
        const points = pointsRef.current;
        const mat = matRef.current;
        if (!points || !mat) return;
        const t = clock.getElapsedTime();
        if (start.current === null) start.current = t;
        const elapsed = t - start.current;
        if (elapsed >= 0.7) {
            points.visible = false;
            return;
        }
        points.visible = true;
        points.position.y = at[1] + elapsed * 1.3;
        mat.opacity = 0.95 * (1 - elapsed / 0.7);
        void delta;
    });

    return (
        <points ref={pointsRef} position={[at[0], at[1], at[2] + 0.4]} visible={false}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                ref={matRef}
                color={color}
                size={0.12}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                sizeAttenuation
            />
        </points>
    );
};

// A handful of iconic moves get bespoke FX instead of the class defaults
const MOVE_FX_OVERRIDES: Record<string, { vertical?: boolean; beamScale?: number; quake?: boolean }> = {
    'Thunderbolt': { vertical: true },
    'Thunder': { vertical: true },
    'Zap Cannon': { vertical: true },
    'Hyper Beam': { beamScale: 2 },
    'Solar Beam': { beamScale: 1.8 },
    'Fire Blast': { beamScale: 1.5 },
    'Earthquake': { quake: true },
    'Magnitude': { quake: true },
};

/** Vertical lightning bolt crashing down on the target (Thunder/Thunderbolt). */
const LightningStrike: React.FC<{ at: [number, number, number]; color: string }> = ({ at, color }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const start = useRef<number | null>(null);

    useFrame(({ clock }) => {
        const mesh = meshRef.current;
        const mat = matRef.current;
        if (!mesh || !mat) return;
        const t = clock.getElapsedTime();
        if (start.current === null) start.current = t;
        const elapsed = t - start.current - 0.15;
        if (elapsed < 0 || elapsed >= 0.45) {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;
        // Double flicker: bright → dim → bright → fade
        const flicker = elapsed < 0.08 ? 1 : elapsed < 0.14 ? 0.35 : elapsed < 0.24 ? 0.95 : Math.max(0, 1 - (elapsed - 0.24) / 0.21);
        mat.opacity = flicker;
        mesh.scale.x = 0.6 + Math.sin(elapsed * 80) * 0.15; // crackle
    });

    return (
        <mesh ref={meshRef} position={[at[0], at[1] + 2.4, at[2] + 0.3]} visible={false}>
            <planeGeometry args={[0.7, 7]} />
            <meshBasicMaterial
                ref={matRef}
                map={getRadialTexture()}
                color={color}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
            />
        </mesh>
    );
};

// Looping ambient particles while a status condition is active
const STATUS_AURA: Record<string, { color: string; count: number; rise: number; spread: number; size: number; flicker?: boolean }> = {
    poison: { color: '#c060e0', count: 10, rise: 0.5, spread: 1.1, size: 0.16 },
    burn: { color: '#ff7043', count: 12, rise: 0.9, spread: 0.8, size: 0.11 },
    sleep: { color: '#cfd8dc', count: 5, rise: 0.35, spread: 0.6, size: 0.2 },
    paralysis: { color: '#ffe54c', count: 8, rise: 0.15, spread: 1.1, size: 0.13, flicker: true },
    freeze: { color: '#81d4fa', count: 10, rise: 0.05, spread: 1.0, size: 0.14 },
    confusion: { color: '#ce93d8', count: 7, rise: 0.12, spread: 1.3, size: 0.16, flicker: true },
};

const StatusAura: React.FC<{ status: string; height: number }> = ({ status, height }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const matRef = useRef<THREE.PointsMaterial>(null);
    const cfg = STATUS_AURA[status];
    const seeds = useMemo(
        () => Array.from({ length: cfg?.count ?? 8 }, () => [Math.random(), Math.random(), Math.random()] as const),
        [cfg]
    );
    const positions = useMemo(() => new Float32Array((cfg?.count ?? 8) * 3), [cfg]);

    useFrame(({ clock }) => {
        const points = pointsRef.current;
        const mat = matRef.current;
        if (!points || !mat || !cfg) return;
        const t = clock.getElapsedTime();
        const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
        seeds.forEach(([sx, sy, sz], i) => {
            const cycle = (sy + t * cfg.rise * 0.5) % 1;
            attr.setXYZ(
                i,
                (sx - 0.5) * cfg.spread + Math.sin(t * 1.5 + sx * 9) * 0.08,
                -height / 2 + cycle * height,
                (sz - 0.5) * 0.5 + 0.3
            );
        });
        attr.needsUpdate = true;
        mat.opacity = cfg.flicker ? 0.35 + Math.abs(Math.sin(t * 6)) * 0.55 : 0.75;
    });

    if (!cfg) return null;
    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                ref={matRef}
                color={cfg.color}
                size={cfg.size}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                sizeAttenuation
            />
        </points>
    );
};

// Tinted full-view flash when the weather turns (remounts via key={weather})
const WEATHER_FLASH_COLOR: Record<WeatherType, string | null> = {
    none: null,
    rain: '#4a90d9',
    sunny: '#ffcc66',
    sandstorm: '#d9b36b',
    hail: '#bfe3f2',
};

const WeatherFlash: React.FC<{ weather: WeatherType }> = ({ weather }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const start = useRef<number | null>(null);
    const { camera } = useThree();
    const color = WEATHER_FLASH_COLOR[weather];

    const placement = useMemo(() => {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        return {
            position: camera.position.clone().add(direction.multiplyScalar(3)),
            quaternion: camera.quaternion.clone(),
        };
    }, [camera]);

    useFrame(({ clock }) => {
        const mesh = meshRef.current;
        const mat = matRef.current;
        if (!mesh || !mat) return;
        const t = clock.getElapsedTime();
        if (start.current === null) start.current = t;
        const elapsed = t - start.current;
        if (elapsed >= 0.6 || !color) {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;
        mat.opacity = 0.5 * (1 - elapsed / 0.6);
    });

    if (!color) return null;
    return (
        <mesh ref={meshRef} position={placement.position} quaternion={placement.quaternion} visible={false} renderOrder={10}>
            <planeGeometry args={[12, 8]} />
            <meshBasicMaterial ref={matRef} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
        </mesh>
    );
};

/**
 * Safari catch sequence: ball arcs to the wild mon, wobbles `shakes` times,
 * then locks (caught: white flash, ball stays) or bursts open (broke free).
 */
const CatchBallEffect: React.FC<{ shakes: number; caught: boolean }> = ({ shakes, caught }) => {
    const ballRef = useRef<THREE.Mesh>(null);
    const flashRef = useRef<THREE.Mesh>(null);
    const flashMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const start = useRef<number | null>(null);

    const FLIGHT = 0.4;
    const SHAKE = 0.35;
    const total = FLIGHT + shakes * SHAKE;

    useFrame(({ clock }) => {
        const ball = ballRef.current;
        const flash = flashRef.current;
        const flashMat = flashMatRef.current;
        if (!ball || !flash || !flashMat) return;
        const t = clock.getElapsedTime();
        if (start.current === null) start.current = t;
        const elapsed = t - start.current;

        if (elapsed < FLIGHT) {
            // Arc from the player's side to the wild mon
            const p = elapsed / FLIGHT;
            ball.visible = true;
            ball.position.set(
                PLAYER_POS[0] + (ENEMY_POS[0] - PLAYER_POS[0]) * p,
                PLAYER_POS[1] + (ENEMY_POS[1] - PLAYER_POS[1]) * p + Math.sin(p * Math.PI) * 1.4,
                PLAYER_POS[2] + (ENEMY_POS[2] - PLAYER_POS[2]) * p + 0.4
            );
            ball.rotation.z = -p * Math.PI * 3;
            flash.visible = false;
            return;
        }

        // Sitting at the target, wobbling
        const sitX = ENEMY_POS[0];
        const sitY = ENEMY_POS[1] - 0.6;
        ball.position.set(sitX, sitY, ENEMY_POS[2] + 0.4);
        if (elapsed < total) {
            const shakePhase = ((elapsed - FLIGHT) % SHAKE) / SHAKE;
            ball.rotation.z = Math.sin(shakePhase * Math.PI * 2) * 0.4;
            return;
        }

        // Verdict
        const after = elapsed - total;
        if (caught) {
            ball.visible = after < 1.6;
            ball.rotation.z = 0;
            if (after < 0.45) {
                flash.visible = true;
                flash.position.set(sitX, sitY, ENEMY_POS[2] + 0.5);
                flash.scale.setScalar(0.6 + after * 4);
                flashMat.color.set('#ffffff');
                flashMat.opacity = 0.9 * (1 - after / 0.45);
            } else {
                flash.visible = false;
            }
        } else {
            ball.visible = false;
            if (after < 0.35) {
                flash.visible = true;
                flash.position.set(sitX, sitY + 0.3, ENEMY_POS[2] + 0.5);
                flash.scale.setScalar(0.8 + after * 5);
                flashMat.color.set('#ff8a65');
                flashMat.opacity = 0.8 * (1 - after / 0.35);
            } else {
                flash.visible = false;
            }
        }
    });

    return (
        <>
            <mesh ref={ballRef} visible={false}>
                <planeGeometry args={[0.6, 0.6]} />
                <meshBasicMaterial map={getPokeballTexture()} transparent alphaTest={0.1} toneMapped={false} />
            </mesh>
            <mesh ref={flashRef} visible={false}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    ref={flashMatRef}
                    map={getRadialTexture()}
                    transparent
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
        </>
    );
};

/** Brief fov dolly-in when a Pokémon faints. FOV only — never touch position/rotation. */
const CameraRig: React.FC<{ fx: SceneFx | null }> = ({ fx }) => {
    const lastId = useRef(-1);
    const dollyStart = useRef<number | null>(null);

    useFrame(({ camera, clock }) => {
        const cam = camera as THREE.PerspectiveCamera;
        const t = clock.getElapsedTime();
        if (fx?.faintedTeam !== undefined && fx.id !== lastId.current) {
            lastId.current = fx.id;
            dollyStart.current = t;
        }
        if (dollyStart.current === null) return;
        const elapsed = t - dollyStart.current;
        let fov = 40;
        if (elapsed < 0.35) fov = 40 - 7 * (elapsed / 0.35);
        else if (elapsed < 0.75) fov = 33;
        else if (elapsed < 1.2) fov = 33 + 7 * ((elapsed - 0.75) / 0.45);
        else dollyStart.current = null;
        cam.fov = fov;
        cam.updateProjectionMatrix();
    });

    return null;
};

interface ImpactProps {
    anim: MoveAnimation;
    targetPosition: [number, number, number];
    size: number;
    delay: number;
}

const ImpactEffect: React.FC<ImpactProps> = ({ anim, targetPosition, size, delay }) => {
    const sheet = anim.spritesheet;
    const texture = useLoader(THREE.TextureLoader, sheet.src);

    const configured = useMemo(() => {
        const tex = texture.clone();
        tex.magFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1 / sheet.columns, 1 / sheet.rows);
        tex.needsUpdate = true;
        return tex;
    }, [texture, sheet.columns, sheet.rows]);

    const meshRef = useRef<THREE.Mesh>(null);
    const start = useRef<number | null>(null);
    const totalDuration = (sheet.frameCount * sheet.frameDuration) / 1000;

    useFrame(({ clock }) => {
        const mesh = meshRef.current;
        if (!mesh) return;
        const t = clock.getElapsedTime();
        if (start.current === null) start.current = t;
        const elapsed = t - start.current - delay;
        if (elapsed < 0) {
            mesh.visible = false;
            return;
        }
        const progress = elapsed / totalDuration;
        if (progress >= 1) {
            mesh.visible = false;
            return;
        }
        mesh.visible = true;
        const frame = Math.min(sheet.frameCount - 1, Math.floor(progress * sheet.frameCount));
        const col = frame % sheet.columns;
        const row = Math.floor(frame / sheet.columns);
        configured.offset.set(col / sheet.columns, 1 - (row + 1) / sheet.rows);
    });

    return (
        <mesh ref={meshRef} position={[targetPosition[0], targetPosition[1] + 0.1, targetPosition[2] + 0.4]} visible={false}>
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial
                map={configured}
                color={anim.tint ?? '#ffffff'}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
            />
        </mesh>
    );
};

const WEATHER_PARTICLE_CONFIG = {
    rain: { count: 500, color: '#7fb2ff', size: 0.05, fall: 9, drift: 0.6 },
    hail: { count: 250, color: '#dff2ff', size: 0.09, fall: 5, drift: 1.2 },
    sandstorm: { count: 450, color: '#d8b45a', size: 0.07, fall: 0.8, drift: 7 },
} as const;

const WeatherParticles: React.FC<{ weather: WeatherType }> = ({ weather }) => {
    const config = weather in WEATHER_PARTICLE_CONFIG
        ? WEATHER_PARTICLE_CONFIG[weather as keyof typeof WEATHER_PARTICLE_CONFIG]
        : null;

    const pointsRef = useRef<THREE.Points>(null);
    const positions = useMemo(() => {
        if (!config) return new Float32Array(0);
        const arr = new Float32Array(config.count * 3);
        for (let i = 0; i < config.count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 16;
            arr[i * 3 + 1] = Math.random() * 8;
            arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
        }
        return arr;
    }, [config]);

    useFrame((_, delta) => {
        if (!config || !pointsRef.current) return;
        const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < config.count; i++) {
            arr[i * 3] += config.drift * delta * (weather === 'sandstorm' ? 1 : 0.3);
            arr[i * 3 + 1] -= config.fall * delta;
            if (arr[i * 3 + 1] < 0) {
                arr[i * 3 + 1] = 8;
                arr[i * 3] = (Math.random() - 0.5) * 16;
            }
            if (arr[i * 3] > 8) arr[i * 3] = -8;
        }
        attr.needsUpdate = true;
    });

    if (!config) return null;

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                color={config.color}
                size={config.size}
                transparent
                opacity={0.75}
                depthWrite={false}
                sizeAttenuation
            />
        </points>
    );
};

const SceneContents: React.FC<BattleScene3DProps> = ({ leftMon, rightMon, weather, terrain, fx, getTypeColor, backdrop = null }) => {
    const fog = WEATHER_FOG[weather];
    const targetIsPlayer = fx !== null && fx.attackerTeam === 2;
    const targetPos = targetIsPlayer ? PLAYER_POS : ENEMY_POS;
    const fxOverride = fx?.moveName ? MOVE_FX_OVERRIDES[fx.moveName] : undefined;

    return (
        <>
            <fog attach="fog" args={[fog.color, 4, weather === 'sandstorm' ? 14 : 30]} />
            <color attach="background" args={[fog.color]} />
            {backdrop ? (
                // Scene image becomes sky + ground; SkyDome shows while it loads
                <Suspense fallback={<SkyDome weather={weather} />}>
                    <Backdrop url={backdrop} weather={weather} />
                </Suspense>
            ) : (
                <SkyDome weather={weather} />
            )}
            <hemisphereLight args={['#93b4ff', '#1c2c4f', 0.55]} />
            <ambientLight intensity={weather === 'sunny' ? 1.1 : 0.85} color={weather === 'sunny' ? '#ffe0a3' : '#cdd6ff'} />
            <directionalLight position={[4, 6, 4]} intensity={weather === 'sunny' ? 1.6 : 1.05} color={weather === 'sunny' ? '#ffd27f' : '#ffffff'} />
            <directionalLight position={[-5, 3, -4]} intensity={0.35} color="#8b7cf7" />

            {/* Ground plane + arena floor (abstract mode only — the backdrop
                image paints its own battlefield ground) */}
            {!backdrop && (
                <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                        <planeGeometry args={[90, 90]} />
                        <meshStandardMaterial color="#0a0f1e" roughness={1} />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                        <circleGeometry args={[9, 48]} />
                        <meshStandardMaterial color={TERRAIN_COLORS[terrain]} roughness={1} />
                    </mesh>
                </>
            )}
            {/* Active terrain stays readable over the backdrop as a soft tint disc */}
            {backdrop && terrain !== 'none' && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                    <circleGeometry args={[7, 48]} />
                    <meshBasicMaterial
                        map={getRadialTexture()}
                        color={TERRAIN_COLORS[terrain]}
                        transparent
                        opacity={0.35}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            )}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[3.1, 3.3, 48]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={backdrop ? 0.08 : 0.14} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[3.3, 3.42, 48]} />
                <meshBasicMaterial color="#4f8ef7" transparent opacity={backdrop ? 0.1 : 0.2} />
            </mesh>

            {leftMon && (
                <PokemonSprite
                    key={leftMon.key}
                    mon={leftMon}
                    position={PLAYER_POS}
                    facing={1}
                    side={1}
                    scale={PLAYER_SCALE}
                    fx={fx}
                    glowColor={getTypeColor(leftMon.pokemon.types[0])}
                />
            )}
            {rightMon && (
                <PokemonSprite
                    key={rightMon.key}
                    mon={rightMon}
                    position={ENEMY_POS}
                    facing={-1}
                    side={2}
                    scale={ENEMY_SCALE}
                    fx={fx}
                    glowColor={getTypeColor(rightMon.pokemon.types[0])}
                />
            )}
            {fx && fx.isDamaging && fxOverride?.vertical && (
                <LightningStrike key={`bolt-${fx.id}`} at={targetPos} color={getTypeColor(fx.moveType)} />
            )}
            {fx && fx.isDamaging && !fxOverride?.vertical && !fxOverride?.quake && fx.damageClass === 'special' && (
                <BeamEffect
                    key={`beam-${fx.id}`}
                    from={targetIsPlayer ? ENEMY_POS : PLAYER_POS}
                    to={targetPos}
                    color={getTypeColor(fx.moveType)}
                    thickness={fxOverride?.beamScale ?? 1}
                />
            )}
            {fx && fx.isDamaging && !fxOverride?.vertical && !fxOverride?.quake && fx.damageClass !== 'special' && (
                <SlashEffect key={`slash-${fx.id}`} at={targetPos} color={getTypeColor(fx.moveType)} />
            )}
            {fx && !fx.isDamaging && fx.damageClass === 'status' && (
                <SparkleEffect
                    key={`spark-${fx.id}`}
                    at={fx.attackerTeam === 1 ? PLAYER_POS : ENEMY_POS}
                    color={getTypeColor(fx.moveType)}
                />
            )}
            {fx?.ballThrow && (
                <CatchBallEffect key={`catch-${fx.id}`} shakes={fx.ballThrow.shakes} caught={fx.ballThrow.caught} />
            )}
            <CameraRig fx={fx} />
            <Suspense fallback={null}>
                {fx && fx.isDamaging && (
                    <ImpactEffect
                        key={fx.id}
                        anim={getMoveAnimation(fx.moveType)}
                        targetPosition={targetPos}
                        size={targetIsPlayer ? 3.6 : 3}
                        delay={0.3}
                    />
                )}
                {fx && fx.isDamaging && fx.isCritical && (
                    <ImpactEffect
                        key={`crit-${fx.id}`}
                        anim={criticalOverlay}
                        targetPosition={targetPos}
                        size={targetIsPlayer ? 4.2 : 3.5}
                        delay={0.42}
                    />
                )}
            </Suspense>

            <WeatherParticles weather={weather} />
            <TerrainParticles terrain={terrain} />

            {(fx?.isCritical || (fx?.isDamaging && fxOverride?.quake)) && (
                <CameraShake
                    key={fx.id}
                    maxYaw={fxOverride?.quake ? 0.07 : 0.03}
                    maxPitch={fxOverride?.quake ? 0.07 : 0.03}
                    maxRoll={fxOverride?.quake ? 0.05 : 0.02}
                    yawFrequency={9}
                    pitchFrequency={9}
                    rollFrequency={7}
                    intensity={1}
                    decay
                    decayRate={fxOverride?.quake ? 1.2 : 1.8}
                />
            )}
            <WeatherFlash key={`wf-${weather}`} weather={weather} />
        </>
    );
};

const BattleScene3D: React.FC<BattleScene3DProps> = (props) => (
    <Canvas
        camera={{ position: [0, 2.6, 8.2], fov: 40 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
    >
        <SceneContents {...props} />
    </Canvas>
);

export default BattleScene3D;
