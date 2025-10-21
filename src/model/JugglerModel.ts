import { Euler, Object3D, Vector3 } from "three";
import { HandModel } from "./HandModel";
import { ThreeSyncedPosition, ThreeSyncedRotation, ThreeSyncedScale } from "./ThreeSyncedProperty";
import { MapCallbacks } from "./MapCallbacks";
import { PerformanceModelRef } from "./PerformanceChild";
import { SpotModel } from "./SpotModel";

/**
 * Interface for the constructor of JugglerModel.
 */
export type JugglerModelParams = {
    /**
     * The juggler's [leftHand, rightHand].
     */
    hands: [HandModel, HandModel];
    /**
     * The place where the hand is when the other hand takes a ball from it.
     */
    swapPos: Vector3;
    /**
     * The juggler's name.
     */
    name: string;
    /**
     * The juggler's position.
     */
    position: Vector3;
    /**
     * The juggler's rotation.
     */
    rotation: Euler;
    /**
     * The juggler's scale.
     */
    scale: Vector3;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...)  representing a juggler.
 */
export class JugglerModel {
    /**
     * The juggler's [leftHand, rightHand].
     * Can also be accessed with the attributes leftHand and rightHand.
     *
     * Tip to remember : the left-most element of the array is the left hand.
     */
    // readonly hands: [HandModel, HandModel];
    private readonly _handsMap: MapCallbacks<number, HandModel>;
    /**
     * The juggler's name.
     */
    name: string;
    /**
     * The juggler's position.
     */
    position: ThreeSyncedPosition;
    /**
     * The juggler's rotation.
     */
    rotation: ThreeSyncedRotation;
    /**
     * The juggler's scale.
     */
    scale: ThreeSyncedScale;
    /**
     * The place where the hand is when the other hand takes a ball from it.
     */
    swapSpot: SpotModel;

    performance: PerformanceModelRef;

    readonly _object = new Object3D();

    constructor({ name, hands, position, rotation, scale, swapPos }: JugglerModelParams) {
        this.performance = new PerformanceModelRef();
        this.swapSpot = new SpotModel({ position: swapPos });

        const threeObj = this._object;
        const onHandSet = (handIdx: number, handModel: HandModel) => {
            handModel.performance.set(this.performance.get());
            threeObj.add(handModel._dummyObject.get());
            threeObj.add(handModel.catchSpot._object);
            threeObj.add(handModel.restSpot._object);
            threeObj.add(handModel.tossSpot._object);
        };
        const onHandDelete = (handIdx: number, handModel?: HandModel) => {
            if (handModel !== undefined) {
                handModel.performance.set(undefined);
                threeObj.remove(handModel._dummyObject.get());
                threeObj.remove(handModel.catchSpot._object);
                threeObj.remove(handModel.restSpot._object);
                threeObj.remove(handModel.tossSpot._object);
            }
        };
        const errorMessageHands = (handIdx: number) => `Unknown hand index ${handIdx}`;

        this._handsMap = new MapCallbacks({
            onSetElement: onHandSet,
            onDeleteElement: onHandDelete,
            errorMessageGet: errorMessageHands,
            entries: [
                [0, hands[0]],
                [1, hands[1]]
            ]
        });

        this.name = name;

        // Sync the table's postional properties with the object.
        this.position = new ThreeSyncedPosition(this._object, position);
        this.rotation = new ThreeSyncedRotation(this._object, rotation);
        this.scale = new ThreeSyncedScale(this._object, scale);

        // Add the hands as child of this object.
        for (const hand of this.hands) {
            this._object.add(hand.catchSpot._object);
            this._object.add(hand.restSpot._object);
            this._object.add(hand.tossSpot._object);
        }
    }

    get hands(): [HandModel, HandModel] {
        return [this._handsMap.getSurely(0), this._handsMap.getSurely(1)];
    }

    /**
     * The juggler's leftHand.
     */
    get leftHand(): HandModel {
        return this.hands[0];
    }

    // set leftHand(hand: HandModel) {
    //     this.hands[0] = hand;
    // }

    /**
     * The juggler's right hand.
     */
    get rightHand(): HandModel {
        return this.hands[1];
    }

    // set rightHand(hand: HandModel) {
    //     this.hands[1] = hand;
    // }

    /**
     * Returns the first and last event times in both hands of the juggler's timeline.
     * @returns
     * - [null, null] if there are no events.
     * - [startTime, endTime] otherwise.
     */
    patternTimeBounds(): [number, number] | [null, null] {
        let startTime: number | null = null;
        let endTime: number | null = null;
        for (const hand of this.hands) {
            const [handStartTime, handEndTime] = hand.timeline.timeBounds();
            if (startTime === null || (handStartTime !== null && startTime > handStartTime)) {
                startTime = handStartTime;
            }
            if (endTime === null || (handEndTime !== null && endTime > handEndTime)) {
                endTime = handEndTime;
            }
        }
        // @ts-expect-error startTime is null if and only if endTime is null too.
        return [startTime, endTime];
    }
}
