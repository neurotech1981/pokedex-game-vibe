export interface Move {
    id: number;
    name: string;
    type: string;
    power: number;
    accuracy: number;
    pp: number;
    energyCost: number;
    description: string;
    category: 'physical' | 'special' | 'status';
    priority: number;
    effects: {
        type: string;
        value: number;
        duration?: number;
    }[];
}