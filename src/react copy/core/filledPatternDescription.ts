import { JSX } from "react";

// Think of what can be optional .
// Where to put audiobuffers ?
//TODO : sound functions params. Function if we want to vary hit sound based on toss strength for instance.
// What to call template, what not to call template ?
// Is the ball model in the jugglers rather, as it is already instanciated. No duplicate three mesh !TODO : A tester.
export type ReactPatternDescription = {
    balls: {
        name: string;
        sounds: {
            whenCaught: (param: any) => string; // Return audiobuffer ?
            whenTossed: (param: any) => string;
            whileAirborne: (param: any) => string;
        };
        mesh: JSX.Element;
        updateMesh: (param: any) => void;
    }[];
    soundBuffers: { name: string; buffer: AudioBuffer }[];
    tables: {}[];
    jugglers: {
        table: { template: string };
        initialBalls: {};
        mesh: JSX.Element;
        updateMesh: (param: any) => void;
    }[];
};

export type Juggler = {
    name: string;
    table?: { template: string; ballsOnTable: { ball: string; spot?: string }[] };
    // defaultTossOrder: ;
    // defaultCatchOrder: ;
    pattern: [Fraction, SubPattern];
};

export type TableTemplate = { name: string; spots: Map<string, string> };
