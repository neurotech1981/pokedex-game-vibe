import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WeatherEffectsProps {
    type: 'rain' | 'sunny' | 'sandstorm' | 'hail' | 'none';
    intensity?: number;
}

const WeatherEffects: React.FC<WeatherEffectsProps> = ({ type, intensity = 1 }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const particleCount = 1000;

    const geometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 10;
            positions[i + 1] = (Math.random() - 0.5) * 10;
            positions[i + 2] = (Math.random() - 0.5) * 10;

            switch (type) {
                case 'rain':
                    colors[i] = 0.4;     // R
                    colors[i + 1] = 0.5; // G
                    colors[i + 2] = 0.8; // B
                    break;
                case 'sunny':
                    colors[i] = 1;       // R
                    colors[i + 1] = 0.8; // G
                    colors[i + 2] = 0.2; // B
                    break;
                case 'sandstorm':
                    colors[i] = 0.8;     // R
                    colors[i + 1] = 0.7; // G
                    colors[i + 2] = 0.4; // B
                    break;
                case 'hail':
                    colors[i] = 0.6;     // R
                    colors[i + 1] = 0.8; // G
                    colors[i + 2] = 1;   // B
                    break;
                default:
                    colors[i] = 1;
                    colors[i + 1] = 1;
                    colors[i + 2] = 1;
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geometry;
    }, [type]);

    const material = useMemo(() => {
        return new THREE.PointsMaterial({
            size: type === 'hail' ? 0.1 : 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.6 * intensity,
        });
    }, [type, intensity]);

    useFrame((state) => {
        if (!meshRef.current) return;

        const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
        const time = state.clock.getElapsedTime();

        for (let i = 0; i < particleCount * 3; i += 3) {
            switch (type) {
                case 'rain':
                    positions[i + 1] -= 0.1 * intensity; // Fall down
                    if (positions[i + 1] < -5) positions[i + 1] = 5;
                    break;
                case 'sunny':
                    positions[i + 1] += Math.sin(time + positions[i]) * 0.01 * intensity;
                    break;
                case 'sandstorm':
                    positions[i] += Math.sin(time + positions[i + 1]) * 0.05 * intensity;
                    positions[i + 1] += Math.cos(time + positions[i]) * 0.05 * intensity;
                    break;
                case 'hail':
                    positions[i + 1] -= 0.05 * intensity; // Slower fall than rain
                    if (positions[i + 1] < -5) positions[i + 1] = 5;
                    break;
            }
        }

        meshRef.current.geometry.attributes.position.needsUpdate = true;
    });

    if (type === 'none') return null;

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} />
    );
};

export default WeatherEffects;