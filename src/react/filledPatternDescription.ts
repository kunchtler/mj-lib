// import { JSX } from "react";

// // Think of what can be optional .
// // Where to put audiobuffers ?
// //TODO : sound functions params. Function if we want to vary hit sound based on toss strength for instance.
// // What to call template, what not to call template ?
// // Is the ball model in the jugglers rather, as it is already instanciated. No duplicate three mesh !TODO : A tester.
// export type ReactPatternDescription = {
//     balls: {
//         id: string;
//         sounds: {
//             whenCaught: (param: any) => AudioBuffer;
//             whenTossed: (param: any) => AudioBuffer;
//             whileAirborne: (param: any) => AudioBuffer;
//         };
//         mesh: JSX.Element;
//         updateMeshPosition: (param: any) => void;
//     }[];
//     jugglers: {
//         // TODO : Make jugglers also have unique ID instead of name ?
//         name: string;
//         table: JSX.Element;
//         bodyMesh: JSX.Element;
//         rightHandMesh: JSX.Element;
//         leftHandMesh: JSX.Element;
//         updateMeshPosition: (param: any) => void;
//     }[];
// };

// export type Juggler = {
//     name: string;
//     table?: { template: string; ballsOnTable: { ball: string; spot?: string }[] };
//     // defaultTossOrder: ;
//     // defaultCatchOrder: ;
//     pattern: [Fraction, SubPattern];
// };

// export type TableTemplate = { name: string; spots: Map<string, string> };
