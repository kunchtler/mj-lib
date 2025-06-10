import { HandModel } from "./HandModel";
import { TableModel } from "./TableModel";

/**
 * Interface for the constructor of JugglerModel.
 */
export interface JugglerModelParams {
    /**
     * The juggler's [leftHand, rightHand].
     */
    hands?: [HandModel, HandModel];
    /**
     * The juggler's name.
     */
    name?: string;
    /**
     * A table the juggler puts props onto (if they have one).
     */
    defaultTable?: TableModel;
}

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
     * A table the juggler puts props onto (if they have one).
     */
    defaultTable?: TableModel;

    constructor({ defaultTable, name, hands }: JugglerModelParams = {}) {
        this.hands = hands ?? [new HandModel({ juggler: this }), new HandModel({ juggler: this })];
        this.name = name ?? "NoName";
        this.defaultTable = defaultTable;
    }

    /**
     * The juggler's leftHand.
     */
    get leftHand(): HandModel {
        return this.hands[0];
    }

    set leftHand(hand: HandModel) {
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
