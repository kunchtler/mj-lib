import { DeepRequired } from "../utils";
import {
    HandMeshDescription,
    HandMiseEnSceneDescription,
    PerformanceLayout,
    PerformanceMeshesDescription,
    SpotDescription
} from "./PerformanceDescription";
import {
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_RADIUS,
    DEFAULT_CUBE_BODY_COLOR,
    DEFAULT_CUBE_BODY_DEPTH,
    DEFAULT_CUBE_BODY_HEIGHT,
    DEFAULT_CUBE_BODY_VISIBILITY,
    DEFAULT_CUBE_BODY_WIDTH,
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_WIDTH,
    DEFAULT_CUBE_HAND_LENGTH,
    DEFAULT_CUBE_HAND_WIDTH,
    DEFAULT_CUBE_HAND_DEPTH,
    DEFAULT_HAND_VISIBILITY,
    DEFAULT_TABLE_VISIBILITY,
    DEFAULT_HAND_COLOR
} from "../constants/miseEnSceneDefaultValues";
import { PerformanceLayoutAndMeshHelper } from "./PerformanceDescriptionHelpers";

export function createHandSpots(params: {
    catchTossDistance: number;
    spotsHeight: number;
    distanceToMirroringLine: number;
    jugglingPlaneDistanceFromJuggler: number;
    isRightHand: boolean;
}): {
    tossSpot: Required<SpotDescription>;
    catchSpot: Required<SpotDescription>;
    restSpot: Required<SpotDescription>;
    swapSpot: Required<SpotDescription>;
} {
    // the toss spot is always closer to the juggler than the catch spot.
    // isRightHand allows to order them correctly.
    const sideSign = params.isRightHand ? 1 : -1;
    const tossSpotPos: [number, number, number] = [
        params.jugglingPlaneDistanceFromJuggler,
        params.spotsHeight,
        sideSign * params.distanceToMirroringLine
    ];
    const restSpotPos: [number, number, number] = [
        tossSpotPos[0],
        tossSpotPos[1],
        tossSpotPos[2] + params.catchTossDistance / 2
    ];
    const catchSpotPos: [number, number, number] = [
        tossSpotPos[0],
        tossSpotPos[1],
        tossSpotPos[2] + params.catchTossDistance
    ];
    const swapSpotPos: [number, number, number] = [
        restSpotPos[0] + params.catchTossDistance / 2,
        restSpotPos[1] + params.catchTossDistance / 2,
        restSpotPos[2]
    ];
    return {
        tossSpot: { position: tossSpotPos, rotation: [0, 0, 0] },
        catchSpot: { position: catchSpotPos, rotation: [0, 0, 0] },
        restSpot: { position: restSpotPos, rotation: [0, 0, 0] },
        swapSpot: { position: swapSpotPos, rotation: [0, 0, 0] }
    };
}

export function completeMiseEnSceneAndMeshDescriptions(
    helper: PerformanceLayoutAndMeshHelper,
    ballIDs: Map<string, string>
): { layout: PerformanceLayout; meshesDescription: PerformanceMeshesDescription } {
    const newLayout: PerformanceLayout = { balls: [], jugglers: [], tables: [] };
    const newMeshesDescription: PerformanceMeshesDescription = {
        balls: [],
        jugglers: [],
        tables: []
    };

    for (const [ballID, ballTemplate] of ballIDs) {
        const template = helper.ballTemplates.find(
            (template) => template.name === ballTemplate
        ) ?? { name: "", color: undefined, radius: undefined };
        newLayout.balls.push({
            id: ballID,
            radius: template.radius ?? DEFAULT_BALL_RADIUS
        });
        newMeshesDescription.balls.push({
            id: ballID,
            color: template.color ?? DEFAULT_BALL_COLOR,
            radius: template.radius ?? DEFAULT_BALL_RADIUS
        });
    }

    for (let i = 0; i < helper.jugglers.length; i++) {
        const juggler = helper.jugglers[i];

        // Complete body arguments
        const newBody = {
            depth: juggler.body?.depth ?? DEFAULT_CUBE_BODY_DEPTH,
            height: juggler.body?.height ?? DEFAULT_CUBE_BODY_HEIGHT,
            width: juggler.body?.width ?? DEFAULT_CUBE_BODY_WIDTH,
            color: juggler.body?.color ?? DEFAULT_CUBE_BODY_COLOR,
            visible: juggler.body?.visible ?? DEFAULT_CUBE_BODY_VISIBILITY
        };

        // Complete transform information
        // Used for the position and rotation.
        const alpha = i / (helper.jugglers.length - 1);
        const angle = (((1 - alpha) * 9) / 10) * Math.PI + ((alpha * 11) / 10) * Math.PI;
        const newJugglerPosition = juggler.position ?? [
            4 + 4 * Math.cos(angle),
            0,
            4 * Math.cos(angle)
        ];
        const newJugglerRotation =
            juggler.rotation ??
            (juggler.position === undefined ? [0, 0, 0] : [0, -(angle - Math.PI), 0]);
        const newScale = juggler.scale ?? [1, 1, 1];

        // Complete hands information.
        // If some information is available to one of the hands, we duplicate it for the other hand.
        const newHandLength = juggler.handBuilder?.length ?? DEFAULT_CUBE_HAND_LENGTH;
        const newHandWidth = juggler.handBuilder?.width ?? DEFAULT_CUBE_HAND_WIDTH;
        const newHandDepth = juggler.handBuilder?.depth ?? DEFAULT_CUBE_HAND_DEPTH;
        const params = {
            catchTossDistance: juggler.handBuilder?.spotsBuild?.catchTossDistance ?? newBody.width,
            spotsHeight: juggler.handBuilder?.spotsBuild?.spotsHeight ?? (newBody.height * 6) / 10,
            distanceToMirroringLine:
                juggler.handBuilder?.spotsBuild?.distanceToMirroringLine ?? (newBody.width * 1) / 4,
            jugglingPlaneDistanceFromJuggler:
                juggler.handBuilder?.spotsBuild?.jugglingPlaneDistanceFromJuggler ?? newBody.depth
        };
        const newRightSpots = createHandSpots({ ...params, isRightHand: true });
        const newLeftSpots = createHandSpots({ ...params, isRightHand: false });

        const newHeldSpots: DeepRequired<SpotDescription>[] = [];
        if (juggler.handBuilder?.heldSpots === undefined) {
            newHeldSpots.push({
                position: [0, newHandDepth / 2, newHandLength / 2],
                rotation: [0, 0, 0]
            });
        } else {
            for (const spot of juggler.handBuilder!.heldSpots) {
                newHeldSpots.push({
                    position: spot.position,
                    rotation: spot.rotation ?? [0, 0, 0]
                });
            }
        }
        const newRightHandLayout: DeepRequired<HandMiseEnSceneDescription> = {
            ...newRightSpots,
            heldSpots: newHeldSpots
        };
        const newLeftHandLayout: DeepRequired<HandMiseEnSceneDescription> = {
            ...newLeftSpots,
            heldSpots: newHeldSpots
        };
        const newHandMesh: DeepRequired<HandMeshDescription> = {
            length: newHandLength,
            width: newHandWidth,
            depth: newHandDepth,
            visible: juggler.handBuilder?.visible ?? DEFAULT_HAND_VISIBILITY,
            color: juggler.handBuilder?.color ?? DEFAULT_HAND_COLOR
        };
        newLayout.jugglers.push({
            name: juggler.name,
            position: newJugglerPosition,
            rotation: newJugglerRotation,
            scale: newScale,
            leftHand: newLeftHandLayout,
            rightHand: newRightHandLayout
        });
        newMeshesDescription.jugglers.push({
            name: juggler.name,
            body: newBody,
            leftHand: newHandMesh,
            rightHand: newHandMesh
        });
    }

    for (const table of helper.tables ?? []) {
        // Complete table information.
        const newTableHeight = table.height ?? DEFAULT_TABLE_HEIGHT;
        const newTableWidth = table.width ?? DEFAULT_TABLE_WIDTH;
        const newTableDepth = table.depth ?? DEFAULT_TABLE_DEPTH;
        const newSpots = table.spots.map((spot) => {
            return {
                ...spot,
                rotation: spot.rotation ?? [0, 0, 0]
            };
        });
        const newUnknownSpot = {
            position: table.unknownSpot?.position ?? [0, newTableHeight, 0],
            rotation: table.unknownSpot?.rotation ?? [0, 0, 0]
        };
        let newTablePosition: [number, number, number];
        let newTableRotation: [number, number, number];
        if (table.position !== undefined) {
            newTablePosition = table.position;
            newTableRotation = table.rotation ?? [0, 0, 0];
        } else {
            newTablePosition = [0, 0, 0];
            newTableRotation = [0, 0, 0];
            // Look if the table is used by a juggler, and put it in front of them.
            // const jugglerName = helper.jugglers.find((juggler) => juggler.defaultTableID === table.id)?.name;
            // if (jugglerName === undefined) {
            //     position = [0, 0, 0]
            //     rotation = [0, 0, 0]
            // } else {
            //     const juggler = newLayout.jugglers.find((juggler) => juggler.name === jugglerName)!;
            //     position = [juggler.position[0] + juggler.rotation[0]]
            // }
        }
        newLayout.tables.push({
            id: table.id,
            position: newTablePosition,
            rotation: newTableRotation,
            scale: table.scale ?? [1, 1, 1],
            spots: newSpots,
            unknownSpot: newUnknownSpot
        });
        newMeshesDescription.tables.push({
            id: table.id,
            height: newTableHeight,
            width: newTableWidth,
            depth: newTableDepth,
            color: table.color ?? DEFAULT_TABLE_COLOR,
            visible: table.visible ?? DEFAULT_TABLE_VISIBILITY
        });
    }

    return { layout: newLayout, meshesDescription: newMeshesDescription };
}
