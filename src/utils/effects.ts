import { FloatingInfo } from '../types/pokemon';

let nextFloatingInfoId = 1;

export const addFloatingInfo = (
    targetId: number,
    text: string,
    color: string,
    type: 'damage' | 'status' | 'effectiveness'
): FloatingInfo => {
    return {
        id: nextFloatingInfoId++,
        targetId,
        text,
        color,
        type
    };
};