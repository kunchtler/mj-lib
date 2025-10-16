import { Euler, Object3D, Vector3 } from "three";
import { HandModel } from "./HandModel";
import { ThreeSyncedPosition, ThreeSyncedRotation, ThreeSyncedScale } from "./ThreeSyncedProperty";

/**
 * Interface for the constructor of JugglerModel.
 */
export type JugglerModelParams = {
    /**
     * The juggler's [leftHand, rightHand].
     */
    hands: [HandModel, HandModel];
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
    readonly hands: [HandModel, HandModel];
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

    readonly _object = new Object3D();

    constructor({ name, hands, position, rotation, scale }: JugglerModelParams) {
        this.hands = hands;
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

    /**
     * The juggler's leftHand.
     */
    get leftHand(): HandModel {
        return this.hands[0];
    }

    set leftHand(hand: HandModel) {
        this.hands[0]
        this.hands[0] = hand;
    }

    /**
     * The juggler's right hand.
     */
    get rightHand(): HandModel {
        return this.hands[1];
    }

    set rightHand(hand: HandModel) {
        this.hands[1] = hand;
    }

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
