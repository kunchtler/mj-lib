import { HandModel } from "./HandModel";
import { TableModel } from "./TableModel";
export interface JugglerParamConstructor {
    hands?: [HandModel, HandModel];
    name?: string;
    defaultTable?: TableModel;
}

export class JugglerModel {
    /**
     * Contains a juggler [leftHand, rightHand].
     * Can also be accessed with the attributes leftHand and rightHand.
     *
     * Tip to remember : the hands are in the same order in the array as your own hands.
     * The left one is on the left, the right one on the right.
     */
    readonly hands: [HandModel, HandModel];
    name: string;
    defaultTable?: TableModel;

    constructor({ defaultTable, name, hands }: JugglerParamConstructor = {}) {
        this.hands = hands ?? [new HandModel(), new HandModel()];
        this.name = name ?? "NoName";
        this.defaultTable = defaultTable;
    }

    get leftHand(): HandModel {
        return this.hands[0];
    }

    set leftHand(hand: HandModel) {
        this.hands[0] = hand;
    }

    get rightHand(): HandModel {
        return this.hands[1];
    }

    set rightHand(hand: HandModel) {
        this.hands[1] = hand;
    }

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
