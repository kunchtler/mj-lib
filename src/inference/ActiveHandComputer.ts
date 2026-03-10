import Fraction from "fraction.js";

export class ActiveHandComputer {
    defaultHandChanges: { localBeat: Fraction; handIdx: number }[];

    constructor(
        handChanges: {
            localBeat: Fraction;
            defaultHand?: "L" | "R";
        }[]
    ) {
        this.defaultHandChanges = [];

        // Gather all events that have a change of hand.
        for (const change of handChanges) {
            if (change.defaultHand !== undefined) {
                this.defaultHandChanges.push({
                    localBeat: change.localBeat,
                    handIdx: change.defaultHand === "L" ? 0 : 1
                });
            }
        }

        // If no event default hand was found, never, give it a default one (right hand).
        if (this.defaultHandChanges.length === 0) {
            this._createFirstHand(handChanges.length === 0 ? new Fraction(0) : handChanges[0].localBeat)
        }
    }

    private _createFirstHand(localBeat: Fraction) {
        this.defaultHandChanges.push({
            localBeat,
            handIdx: 1
        });
    }

    defaultHandAtLocalBeat(localBeat: Fraction): { handIdx: number; offbeat: boolean } {
        if (this.defaultHandChanges.length === 0) {
            console.error(
                "No hand info to infer hand from. This shouldn't happen unless \
                the class has been messed up with after initialization."
            );
            this._createFirstHand(new Fraction(0));
        }
        let idx = this.defaultHandChanges.findIndex((info) => info.localBeat.gt(localBeat));
        idx = idx === 0 ? 0 : idx === -1 ? this.defaultHandChanges.length - 1 : idx - 1;

        const { localBeat: lastLocalBeat, handIdx: lastHandIdx } = this.defaultHandChanges[idx];

        const nbSteps = localBeat.sub(lastLocalBeat);
        return {
            handIdx: nbSteps.floor().divisible(2) ? lastHandIdx : (lastHandIdx + 1) % 2,
            offbeat: !nbSteps.divisible(1)
        };
    }
}
