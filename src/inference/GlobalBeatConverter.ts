import Fraction from "fraction.js";
import {
    FractionDescription,
    GlobalBeatDescription,
    GlobalBeatStartTime
} from "./PerformanceDescription";
import { reference } from "three/tsl";

export type MusicBeat = { bar: number; beat: Fraction };

type TempoChange<FractionType = Fraction> = {
    absoluteBeat: FractionType;
    beatsPerMinute: FractionType;
    timeInSeconds: FractionType;
};

type SignatureChange = {
    absoluteBeat: Fraction;
    signature: Fraction;
    bar: number;
};

type AllInfo = {
    beat: Fraction;
    timeInSeconds: Fraction | null;
    barBeat: {
        bar: number;
        beat: Fraction;
    } | null;
    beatsInBar: Fraction | null;
    beatsPerMinute: Fraction | null;
};

// TODO : Change the global and local descriptions in helpers to allow for completion.
// TODO : Implement the use of the math parser :)

type GlobalBeatDescription2 = {
    beatReference?: {
        beat: FractionDescription;
        timeInSeconds?: FractionDescription;
        barBeat?: { bar: FractionDescription; beat: FractionDescription };
    };
    changes?: {
        startTime: GlobalBeatStartTime;
        beatsInBar?: FractionDescription;
        beatsPerMinute?: FractionDescription;
        // tempoMultiplier?: FractionType;
    }[];
};

export class GlobalBeatConverter {
    signatureChanges: SignatureChange[]; // Maps a beat to the signature change happening on that beat.
    tempoChanges: TempoChange[]; // Maps a beat to a tempo change happening on that beat.

    constructor(description: GlobalBeatDescription) {
        // In changes, the times at which the changes occur can be described by time,
        // beat, or bar&beat. Since at those point in times, we're defining signature changes and
        // tempo changes, we don't have a reliable way of properly computing time -> beat or
        // bar&beat -> beat at initialization.
        // Thus we require and enforce that changes is ordered.
        this.tempoChanges = [];
        this.signatureChanges = [];

        // Compute the point of reference.
        const beatReference = {
            beat: new Fraction(description.beatReference.beat),
            timeInSeconds: new Fraction(description.beatReference.timeInSeconds),
            barBeat: {
                bar: description.beatReference.barBeat.bar,
                beat: new Fraction(description.beatReference.barBeat.beat)
            }
        };

        // Compute the first tempo and barBeat info.
        let firstSignature: Fraction | undefined = undefined;
        for (const { beatsInBar } of description.changes) {
            if (beatsInBar !== undefined) {
                firstSignature = new Fraction(beatsInBar);
                break;
            }
        }

        let firstBpM: Fraction | undefined = undefined;
        for (const { beatsPerMinute } of description.changes) {
            if (beatsPerMinute !== undefined) {
                firstBpM = new Fraction(beatsPerMinute);
                break;
            }
        }

        // Create a list of the changes where :
        // - Everything is turned into a fraction.
        // - we make sure bar beats in start time are not overflowing.
        // - Everything has signature and bpm information filled in if possible.
        // Thus, if a signature or tempo is undefined, it means we can't use it.
        let prevSignature = firstSignature;
        let prevBpM = firstBpM;
        const changes: GlobalBeatDescription<Fraction>["changes"] = [];
        for (const { startTime, beatsInBar, beatsPerMinute } of description.changes) {
            let currentTime: GlobalBeatStartTime<Fraction>;
            if (startTime.type === "byTime") {
                currentTime = { type: "byTime", seconds: new Fraction(startTime.seconds) };
            } else if (startTime.type === "byBarBeat") {
                if (prevSignature === undefined) {
                    this._throwBarBeatError();
                }
                const res = barBeatNoOverflow(
                    startTime.bar,
                    new Fraction(startTime.beatInBar),
                    prevSignature
                );
                if (res.overflow) {
                    console.warn("Bar beat overflows or underflows the number of beats in bar.");
                }
                currentTime = {
                    type: "byBarBeat",
                    bar: res.bar,
                    beatInBar: res.beatInBar
                };
            } else {
                currentTime = { type: "byBeat", beat: new Fraction(startTime.beat) };
            }

            const currentBeatsInBar =
                beatsInBar !== undefined
                    ? new Fraction(beatsInBar)
                    : prevSignature !== undefined
                      ? prevSignature
                      : undefined;
            const currentBeatsPerMinute =
                beatsPerMinute !== undefined
                    ? new Fraction(beatsPerMinute)
                    : prevBpM !== undefined
                      ? prevBpM
                      : undefined;

            // Validate the values of tempo and signature.
            if (currentBeatsInBar?.lte(0)) {
                throw Error("Can't have a number of beats in a bar <= 0.");
            }
            if (currentBeatsPerMinute?.lte(0)) {
                throw Error("Can't have a number of beats per minute <= 0.");
            }

            changes.push({
                startTime: currentTime,
                beatsInBar: currentBeatsInBar,
                beatsPerMinute: currentBeatsPerMinute
            });

            prevSignature = currentBeatsInBar;
            prevBpM = currentBeatsPerMinute;
        }

        // We look for which beat or time or barBeat precedes the reference.
        let idxRef = changes.findIndex(({ startTime: time, beatsInBar }) => {
            if (time.type === "byBeat" && time.beat.gt(beatReference.beat)) {
                return true;
            } else if (time.type === "byTime" && time.seconds.gt(beatReference.timeInSeconds)) {
                return true;
            } else if (time.type === "byBarBeat") {
                // Make sure we can use bars.
                if (beatsInBar === undefined) {
                    this._throwBarBeatError();
                }
                // We need to overflow the reference just to be sure.
                const res = barBeatNoOverflow(
                    beatReference.barBeat.bar,
                    beatReference.barBeat.beat,
                    beatsInBar
                );
                if (
                    time.bar > res.bar ||
                    (time.bar === res.bar && time.beatInBar.gt(res.beatInBar))
                )
                    if (res.overflow) {
                        // Warn for an overflow.
                        console.warn(
                            `The bar beat reference dit overflow the number of beats per bar.`
                        );
                    }
                return true;
            }
            return false;
        });
        idxRef = idxRef === 0 ? 0 : idxRef === -1 ? changes.length - 1 : idxRef - 1;

        // We thus have the signature and bpm at the reference, which happen to be the
        // ones of idxRef.
        // We start doing a search forward, and another backwards, to compute all local and global beats at tempo changes.
        const changesUpFromRef = changes.slice(idxRef + 1, changes.length);
        const changesDownFromRef = changes.slice(0, idxRef).reverse();

        const startingInfo: AllInfo = {
            ...beatReference,
            beatsInBar: changes[idxRef].beatsInBar ?? null,
            beatsPerMinute: changes[idxRef].beatsPerMinute ?? null
        };
        const infosUpFromRef = this.computeMissingInfo(changesUpFromRef, startingInfo).splice(0, 1);
        const infosDownFromRef = this.computeMissingInfo(changesDownFromRef, startingInfo).splice(
            0,
            1
        );

        const infos = [...infosDownFromRef.reverse(), ...infosUpFromRef];

        // Check that everything is in ascending order.
        let needsSorting = false;
        for (let idx = 0; idx < infos.length - 1; idx++) {
            if (infos[idx].beat.gt(infos[idx + 1].beat)) {
                needsSorting = true;
                break;
            }
        }
        if (needsSorting) {
            console.warn("Global beat infos weren't provided in ascending order. May be issues.");
            infos.sort((info1, info2) => info1.beat.compare(info2.beat));
        }

        // Remove redundant information.
        let idxToRemove: number[] = [];
        for (let idx = 0; idx < infos.length - 1; idx++) {
            if (
                infos[idx].beatsPerMinute === infos[idx + 1].beatsPerMinute &&
                infos[idx].beatsInBar === infos[idx + 1].beatsInBar
            ) {
                // Two successive infos are equal, or two successive times are the same.We'll delete the latest one.
                idxToRemove.push(idx + 1);
            }
        }
        for (const idx of idxToRemove) {
            infos.splice(idx, 1);
        }

        // Remove duplicate information on the same beat.
        idxToRemove = [];
        for (let idx = 0; idx < infos.length - 1; idx++) {
            if (infos[idx].beat.equals(infos[idx + 1].beat)) {
                // Two successive beats are the same. Delete the earlier one.
                idxToRemove.push(idx);
            }
        }
        for (const idx of idxToRemove) {
            infos.splice(idx, 1);
        }
    }

    private _throwBarBeatError(): never {
        throw Error("Can't work with bars if no beatInBar info specified.");
    }

    private _throwTempoError(): never {
        throw Error("Can't work with real time if no tossesPerMinute specified.");
    }

    convertBarBeatToAbsoluteBeat({ bar, beat }: MusicBeat): Fraction {
        if (this.signatureChanges.length === 0) {
            this._throwBarBeatError();
        }

        // Hypothesis : The signatures are sorted.
        let idx = this.signatureChanges.findIndex(({ bar: lastBar }) => lastBar > bar);
        // The true index is one less that the current idx.
        // If current idx is 0, then it means that the searched bar was before any of the list.
        // Thus we use the first info we know of.
        // If current idx is -1, then it means the searched bar is bigger than any of the list.
        // This we take the last info we know of.
        idx = idx === 0 ? 0 : idx === -1 ? this.signatureChanges.length - 1 : idx - 1;

        const {
            absoluteBeat: lastSignatureBeat,
            bar: lastBar,
            signature: lastSignature
        } = this.signatureChanges[idx];

        if (beat.gte(lastSignature)) {
            console.warn("Beat is bigger than what allowed in measure.");
        }

        return lastSignatureBeat.add(lastSignature.mul(bar - lastBar)).add(beat);
    }

    convertSecondsToAbsoluteBeat(timeInSeconds: Fraction): Fraction {
        if (this.tempoChanges.length === 0) {
            this._throwTempoError();
        }

        let idx = this.tempoChanges.findIndex(
            ({ timeInSeconds: lastTime }) => lastTime > timeInSeconds
        );
        idx = idx === 0 ? 0 : idx === -1 ? this.tempoChanges.length - 1 : idx - 1;

        const {
            absoluteBeat: lastTempoBeat,
            beatsPerMinute: lastBpm,
            timeInSeconds: lastTempoTime
        } = this.tempoChanges[idx];

        return lastTempoBeat.add(
            new Fraction(timeInSeconds).sub(lastTempoTime).div(60).mul(lastBpm)
        );
    }

    convertAbsoluteBeatToBarBeat(beat: Fraction): MusicBeat {
        if (this.signatureChanges.length === 0) {
            this._throwBarBeatError();
        }

        let idx = this.signatureChanges.findIndex(({ absoluteBeat: lastBeat }) =>
            lastBeat.gt(beat)
        );
        idx = idx === 0 ? 0 : idx === -1 ? this.signatureChanges.length - 1 : idx - 1;

        const {
            absoluteBeat: lastSignatureBeat,
            bar: lastBar,
            signature: lastSignature
        } = this.signatureChanges[idx];

        const bar = lastBar + beat.sub(lastSignatureBeat).div(lastSignature).floor().valueOf();
        const remainingBeats = beat.sub(lastSignatureBeat).sub(lastSignature.mul(bar - lastBar));

        return { bar, beat: remainingBeats };
    }

    convertAbsoluteBeatToSeconds(beat: Fraction): Fraction {
        if (this.tempoChanges.length === 0) {
            this._throwTempoError();
        }

        let idx = this.tempoChanges.findIndex(({ absoluteBeat: lastBeat }) => lastBeat.gt(beat));
        idx = idx === 0 ? 0 : idx === -1 ? this.tempoChanges.length - 1 : idx - 1;

        const {
            absoluteBeat: lastTempoBeat,
            beatsPerMinute: lastBpm,
            timeInSeconds: lastTempoTime
        } = this.tempoChanges[idx];

        return lastTempoTime.add(lastBpm.div(60).mul(beat.sub(lastTempoBeat)));
    }

    private computeMissingInfo(
        partialInfo: GlobalBeatDescription<Fraction>["changes"],
        startingInfo: AllInfo
    ): AllInfo[] {
        const changes: AllInfo[] = [startingInfo];
        for (const current of partialInfo) {
            const previous = changes[changes.length - 1];

            let currentBeat: Fraction;
            let currentBarBeat: { bar: number; beat: Fraction } | null | "uncomputed" =
                "uncomputed";
            let currentTime: Fraction | null | "uncomputed" = "uncomputed";
            // We know calling this function that if current info is null, it means it
            // can't be computed.
            const currentBeatsPerMinute: Fraction | null = current.beatsPerMinute ?? null;
            const currentBeatsInBar: Fraction | null = current.beatsInBar ?? null;

            // Compute currentBeat, and other easy computable things.
            if (current.startTime.type === "byBeat") {
                currentBeat = current.startTime.beat;
            } else if (current.startTime.type === "byTime") {
                currentTime = current.startTime.seconds;
                if (previous.timeInSeconds === null || previous.beatsPerMinute === null) {
                    this._throwTempoError();
                }
                currentBeat = previous.beat.add(
                    currentTime.sub(previous.timeInSeconds).div(60).mul(previous.beatsPerMinute)
                );
            } else {
                currentBarBeat = {
                    bar: current.startTime.bar,
                    beat: current.startTime.beatInBar
                };
                if (previous.beatsInBar === null || previous.barBeat === null) {
                    this._throwBarBeatError();
                }
                const barToBarCount = previous.beatsInBar.mul(
                    currentBarBeat.bar - previous.barBeat.bar
                );
                const toSub = previous.beatsInBar.sub(previous.barBeat.beat);
                const toAdd = currentBarBeat.beat;
                currentBeat = barToBarCount.add(toAdd).sub(toSub);
            }

            // Compute what is missing.
            if (currentTime === "uncomputed") {
                if (previous.beatsPerMinute === null || previous.timeInSeconds === null) {
                    this._throwTempoError();
                }
                currentTime = previous.timeInSeconds.add(
                    currentBeat.sub(previous.beat).div(previous.beatsPerMinute).mul(60)
                );
            }
            if (currentBarBeat === "uncomputed") {
                if (previous.beatsInBar === null || previous.barBeat === null) {
                    this._throwTempoError();
                }
                const beatsDiff = currentBeat.sub(previous.beat);
                const { bar: barsToAdd, beatInBar } = barBeatNoOverflow(
                    previous.barBeat.bar,
                    previous.barBeat.beat.add(beatsDiff),
                    previous.beatsInBar
                );
                currentBarBeat = { bar: previous.barBeat.bar + barsToAdd, beat: beatInBar };
            }

            // Add it to the array and keep going !
            changes.push({
                beat: currentBeat,
                barBeat: currentBarBeat,
                timeInSeconds: currentTime,
                beatsInBar: currentBeatsInBar,
                beatsPerMinute: currentBeatsPerMinute
            });
        }
        return changes;
    }
}

// TODO : Test with negative beats to see if underflow also works.
function barBeatNoOverflow(
    bar: number,
    beatInBar: Fraction,
    nbBeatsInBar: Fraction
): { bar: number; beatInBar: Fraction; overflow: boolean } {
    const bonusBars = beatInBar.div(nbBeatsInBar).floor().valueOf();
    return {
        bar: bar + bonusBars,
        beatInBar: beatInBar.mod(nbBeatsInBar),
        overflow: bonusBars !== 0
    };
}



// Tests (TODO : move into designated test file later)
// TODO : Also support beats per second ?

// const converter1 = new GlobalBeatConverter({ beatOffsetInSeconds: 0, changes: [] });
// const converter2 = new GlobalBeatConverter({ beatOffsetInSeconds: 3, changes: [] });
// const converter3 = new GlobalBeatConverter({
//     beatOffsetInSeconds: 0,
//     changes: [
//         { startTime: { type: "byTime", seconds: -10 }, beatsPerMinute: 24 },
//         { startTime: { type: "byTime", seconds: 0 }, beatsPerMinute: 10 },
//         { startTime: { type: "byTime", seconds: 12 }, beatsPerMinute: 60 }
//     ]
// });

// const tempoChanges3: TempoChange<FractionDescription>[] = [
//     { absoluteBeat: -4, beatsPerMinute: 24, timeInSeconds: -10 },
//     { absoluteBeat: 0, beatsPerMinute: 10, timeInSeconds: 0 },
//     { absoluteBeat: 2, beatsPerMinute: 60, timeInSeconds: 12 }
// ];

// console.log("Over");
