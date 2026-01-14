import { DeepRequired, ElementOf } from "../utils";
import {
    HandDescription,
    MiseEnSceneHelper,
    MiseEnScene,
    SpotDescription
} from "./PerformanceDescription";
import {
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_RADIUS,
    DEFAULT_JUGGLER_CUBE_COLOR,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_VISIBILITY,
    DEFAULT_JUGGLER_CUBE_WIDTH,
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_WIDTH,
    DEFAULT_JUGGLER_HAND_LENGTH,
    DEFAULT_JUGGLER_HAND_WIDTH,
    DEFAULT_JUGGLER_HAND_DEPTH,
    DEFAULT_JUGGLER_HAND_VISIBILITY,
    DEFAULT_TABLE_VISIBILITY
} from "../constants/miseEnSceneDefaultValues";

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
    const sideSign = params.isRightHand ? +1 : -1;
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

export function completeMiseEnScene(miseEnScene: MiseEnSceneHelper): MiseEnScene {
    const newMiseEnScene: MiseEnScene = { ballTemplates: [], jugglers: [] };

    for (const template of miseEnScene.ballTemplates) {
        newMiseEnScene.ballTemplates.push({
            ...template,
            color: template.color ?? DEFAULT_BALL_COLOR,
            radius: template.radius ?? DEFAULT_BALL_RADIUS
        });
    }
    for (let i = 0; i < miseEnScene.jugglers.length; i++) {
        const juggler = miseEnScene.jugglers[i];

        // Complete body arguments
        const newBody = {
            color: juggler.body?.color ?? DEFAULT_JUGGLER_CUBE_COLOR,
            depth: juggler.body?.depth ?? DEFAULT_JUGGLER_CUBE_DEPTH,
            height: juggler.body?.height ?? DEFAULT_JUGGLER_CUBE_HEIGHT,
            width: juggler.body?.width ?? DEFAULT_JUGGLER_CUBE_WIDTH,
            visible: juggler.body?.visible ?? DEFAULT_JUGGLER_CUBE_VISIBILITY
        };

        // Complete transform information
        // Used for the position and rotation.
        const alpha = i / (miseEnScene.jugglers.length - 1);
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
        const newLength = juggler.handBuilder?.length ?? DEFAULT_JUGGLER_HAND_LENGTH;
        const newWidth = juggler.handBuilder?.width ?? DEFAULT_JUGGLER_HAND_WIDTH;
        const newDepth = juggler.handBuilder?.depth ?? DEFAULT_JUGGLER_HAND_DEPTH;
        const newVisibility = juggler.handBuilder?.visible ?? DEFAULT_JUGGLER_HAND_VISIBILITY;
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
                position: [0, newDepth / 2, newLength / 2],
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
        const newRightHand: DeepRequired<HandDescription> = {
            ...newRightSpots,
            length: newLength,
            width: newWidth,
            depth: newDepth,
            visible: newVisibility,
            heldSpots: newHeldSpots
        };
        const newLeftHand: DeepRequired<HandDescription> = {
            ...newLeftSpots,
            length: newLength,
            width: newWidth,
            depth: newDepth,
            visible: newVisibility,
            heldSpots: newHeldSpots
        };

        // Complete table information.
        let newTable: ElementOf<MiseEnScene["jugglers"]>["table"];
        if (juggler.table === undefined) {
            newTable = undefined;
        } else {
            const tableTemplate = miseEnScene.tableTemplates?.find(
                (template) => template.name === juggler.table?.template
            );
            if (tableTemplate === undefined) {
                console.error("Unrecognized table template");
                continue;
            }
            const newTableHeight = tableTemplate.height ?? DEFAULT_TABLE_HEIGHT;
            const newSpots = tableTemplate.spots.map((spot) => {
                return {
                    ...spot,
                    rotation: spot.rotation ?? [0, 0, 0]
                };
            });
            const newUnknownSpot = {
                position: tableTemplate.unknownSpot?.position ?? [0, newTableHeight, 0],
                rotation: tableTemplate.unknownSpot?.rotation ?? [0, 0, 0]
            };
            newTable = {
                id: "// TODO",
                height: newTableHeight,
                width: tableTemplate.width ?? DEFAULT_TABLE_WIDTH,
                depth: tableTemplate.depth ?? DEFAULT_TABLE_DEPTH,
                visible: juggler.table.visible ?? DEFAULT_TABLE_VISIBILITY,
                color: juggler.table.color ?? DEFAULT_TABLE_COLOR,
                position: juggler.table.position ?? [
                    newJugglerPosition[0] + 1,
                    newJugglerPosition[1],
                    newJugglerRotation[2]
                ],
                rotation: juggler.table.rotation ?? [0, Math.PI, 0],
                scale: juggler.table.scale ?? [1, 1, 1],
                spots: newSpots,
                unknownSpot: newUnknownSpot
            };
        }
        newMiseEnScene.jugglers.push({
            name: juggler.name,
            position: newJugglerPosition,
            rotation: newJugglerRotation,
            scale: newScale,
            body: newBody,
            leftHand: newLeftHand,
            rightHand: newRightHand,
            table: newTable
        });
    }
    return newMiseEnScene;
}
