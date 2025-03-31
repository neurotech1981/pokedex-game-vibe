export interface StatusEffect {
    type: string;
    duration: number;
    value?: number;
    source?: string;
    description: string;
}