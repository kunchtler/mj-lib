const danube = {
    ballTemplates: [{
        name: "Do", soundOnCatch: "Do4"
    }, {
        name: "Re", soundOnCatch: "Re4"
    }, {
        name: "Mi", soundOnCatch: "Mi4"
    }, {
        name: "Fa", soundOnCatch: "Fa4"
    }, {
        name: "Sol", soundOnCatch: "Sol4"
    }, {
        name: "La", soundOnCatch: "La4"
    }, {
        name: "Si", soundOnCatch: "Si4"
    }, {
        name: "Do'", soundOnCatch: "Do5"
    }],
    tables: [
        {
            id: "TableAlice",
            spots: [{
                acceptedBallTemplate: "Do",
                intialBall: true,
            },
            {
                acceptedBallTemplate: "Re",
            },
            {
                acceptedBallTemplate: "Mi"
            },
            {
                acceptedBallTemplate: "Fa"
            },
            {
                acceptedBallTemplate: "Sol"
            },
            {
                acceptedBallTemplate: "La"
            },
            {
                acceptedBallTemplate: "Si"
            },
            {
                acceptedBallTemplate: "Do'"
            },
    ]
        }
    ]
    jugglers: {
        name: "Alice",
        table: 
    },
    tables: 
}


export type JugglingScore = {
    ballTemplates: {
        name: string;
        soundOnCatch?: BallSound;
        soundOnToss?: BallSound;
    }[];
    jugglers: {
        name: string;
        table?: {
            id: string;
            ballsOnTableAtStart: {
                id: string;
                name: string; // Todo : differentiate template name from sound category ?
                spot?: string;
            }[];
            spots: {
                name: string;
                acceptedBallName: string;
            }[];
        };
        ballsHeldAtStart: [
            (Required<BallDescription> | undefined)[],
            (Required<BallDescription> | undefined)[]
        ];
        beatReference: JugglerBeatReference;
        jugglingPhrases: JugglingPhrase[];
    }[];
    globalBeat: GlobalBeatDescription;
};

// TODO : Check if scale is working correctly.
// TODO : Move sounds back to mise en scene (they shouldn't be in score).
export type PerformanceLayout = {
    ballTemplates: {
        name: string;
        radius: number;
    }[];
    jugglers: {
        name: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
        leftHand: DeepRequired<HandMiseEnSceneDescription>;
        rightHand: DeepRequired<HandMiseEnSceneDescription>;
        table?: {
            id: string;
            position: [number, number, number];
            rotation: [number, number, number];
            scale: [number, number, number];
            spots: {
                name: string;
                position: [number, number, number];
                rotation: [number, number, number];
            }[];
            unknownSpot: {
                position: [number, number, number];
                rotation: [number, number, number];
            };
        };
    }[];
};

export type PerformanceMeshDefinitions = {
    ballTemplates: {
        name: string;
        color: ColorDescription;
        radius: number;
    }[];
    jugglers: {
        name: string;
        leftHand: HandMeshDescription;
        rightHand: HandMeshDescription;
        body: BodyMeshDescription;
        table?: TableMeshDescription;
    }[];
};