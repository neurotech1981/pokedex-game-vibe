export interface Film {
    title: string;
    // Add other properties if needed
}

export interface Species {
    name: string;
    // Add other properties if needed
}

export interface Vehicle {
    name: string;
    // Add other properties if needed
}

export interface Starship {
    name: string;
    // Add other properties if needed
}
export interface Person {
    name: string;
    height: string;
    mass: string;
    hair_color: string;
    skin_color: string;
    eye_color: string;
    birth_year: string;
    gender: string;
    homeworld: string;
    films: Film[];
    species: Species[];
    vehicles: Vehicle[];
    starships: Starship[];
    created: string;
    edited: string;
    url: string;
}
