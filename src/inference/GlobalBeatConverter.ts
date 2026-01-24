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
    beatsInBar: Fraction;
    barBeat: { bar: number; beat: Fraction };
};

type AllInfo = {
    beat: Fraction;
    signature: { barBeat: { bar: number; beat: Fraction }; beatsInBar: Fraction } | null;
    tempo: { timeInSeconds: Fraction; beatsPerMinute: Fraction } | null;
};

// TODO : Change the global and local descriptions in helpers to allow for completion.
// TODO : Implement the use of the math parser :)

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

        // Return early if there are no changes.
        if (description.changes.length === 0) {
            return;
        }

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
                ) {
                    if (res.overflow) {
                        // Warn for an overflow.
                        console.warn(
                            `The bar beat reference dit overflow the number of beats per bar.`
                        );
                    }
                    return true;
                }
            }
            return false;
        });
        idxRef = idxRef === 0 ? 0 : idxRef === -1 ? changes.length - 1 : idxRef - 1;

        // We thus have the signature and bpm at the reference, which happen to be the
        // ones of idxRef.
        // We start doing a search forward, and another backwards, to compute all local and global beats at tempo changes.
        const changesUpFromRef = changes.slice(idxRef + 1, changes.length);
        const changesDownFromRef = changes.slice(0, idxRef + 1);

        const referenceBeatsInBar = changes[idxRef].beatsInBar;
        const referenceBeatsPerMinute = changes[idxRef].beatsPerMinute;

        const startingInfo: AllInfo = {
            beat: beatReference.beat,
            signature:
                referenceBeatsInBar === undefined
                    ? null
                    : { barBeat: beatReference.barBeat, beatsInBar: referenceBeatsInBar },
            tempo:
                referenceBeatsPerMinute === undefined
                    ? null
                    : {
                          timeInSeconds: beatReference.timeInSeconds,
                          beatsPerMinute: referenceBeatsPerMinute
                      }
        };
        const infosUpFromRef = this.computeMissingInfo(changesUpFromRef, startingInfo, true).slice(
            1
        );
        const infosDownFromRef = this.computeMissingInfo(
            changesDownFromRef,
            startingInfo,
            false
        ).slice(1);

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

        // Select signature and tempo changes separately.
        for (const { beat, signature, tempo } of infos) {
            if (tempo !== null) {
                this.tempoChanges.push({ ...tempo, absoluteBeat: beat });
            }
            if (signature !== null) {
                this.signatureChanges.push({ ...signature, absoluteBeat: beat });
            }
        }

        // Remove redundant information.
        this.tempoChanges = keepOneOn(this.tempoChanges, true, (tempo1, tempo2) =>
            tempo1.beatsPerMinute.equals(tempo2.beatsPerMinute)
        );
        this.signatureChanges = keepOneOn(this.signatureChanges, true, (sig1, sig2) =>
            sig1.beatsInBar.equals(sig2.beatsInBar)
        );

        // Remove duplicate information on the same beat.
        this.tempoChanges = keepOneOn(this.tempoChanges, false, (tempo1, tempo2) =>
            tempo1.absoluteBeat.equals(tempo2.absoluteBeat)
        );
        this.signatureChanges = keepOneOn(this.signatureChanges, false, (sig1, sig2) =>
            sig1.absoluteBeat.equals(sig2.absoluteBeat)
        );
    }

    private _throwBarBeatError(): never {
        throw Error("Can't work with bars if no beatInBar info specified.");
    }

    private _throwTempoError(): never {
        throw Error("Can't work with real time if no tossesPerMinute specified.");
    }

    convertBarBeatToAbsoluteBeat(barBeat: MusicBeat): Fraction {
        if (this.signatureChanges.length === 0) {
            this._throwBarBeatError();
        }

        // Hypothesis : The signatures are sorted.
        let idx = this.signatureChanges.findIndex(
            ({ barBeat: { bar: lastBar, beat: lastBeat } }) =>
                lastBar > barBeat.bar || (lastBar === barBeat.bar && lastBeat.gt(barBeat.beat))
        );
        // The true index is one less that the current idx.
        // If current idx is 0, then it means that the searched bar was before any of the list.
        // Thus we use the first info we know of.
        // If current idx is -1, then it means the searched bar is bigger than any of the list.
        // This we take the last info we know of.
        idx = idx === 0 ? 0 : idx === -1 ? this.signatureChanges.length - 1 : idx - 1;

        const {
            absoluteBeat: lastSignatureBeat,
            barBeat: lastBarBeat,
            beatsInBar: lastSignature
        } = this.signatureChanges[idx];

        if (barBeat.beat.gte(lastSignature)) {
            console.warn("Beat is bigger than what allowed in measure.");
        }

        return computeBeatFromPrevBarBeatInfo(
            lastSignatureBeat,
            lastBarBeat,
            lastSignature,
            barBeat
        );
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

        return lastTempoBeat.add(timeInSeconds.sub(lastTempoTime).div(60).mul(lastBpm));
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
            barBeat: lastBarBeat,
            beatsInBar: lastSignature
        } = this.signatureChanges[idx];

        return computeBarBeatFromPrevBeatInfo(lastSignatureBeat, lastBarBeat, lastSignature, beat);
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

        return lastTempoTime.add(beat.sub(lastTempoBeat).div(lastBpm).mul(60));
    }

    private computeMissingInfo(
        partialInfo: GlobalBeatDescription<Fraction>["changes"],
        startingInfo: AllInfo,
        goUp: boolean
    ): AllInfo[] {
        const changes: AllInfo[] = [startingInfo];
        for (let infoIdx = 0; infoIdx < partialInfo.length; infoIdx++) {
            // The name for these variables make sense when going up.
            // In the case when we're going down, they're simply having the right values
            // to make it work.
            let previousBeat: Fraction;
            let previousTempo: AllInfo["tempo"];
            let previousSignature: AllInfo["signature"];
            let currentStartTime: GlobalBeatStartTime<Fraction>;
            let currentBeatsPerMinute: Fraction | null;
            let currentBeatsInBar: Fraction | null;
            if (goUp) {
                const current = partialInfo[infoIdx];
                const previous = changes[changes.length - 1];
                previousBeat = previous.beat;
                previousTempo = previous.tempo;
                previousSignature = previous.signature;
                currentStartTime = current.startTime;
                currentBeatsPerMinute = current.beatsPerMinute ?? null;
                currentBeatsInBar = current.beatsInBar ?? null;
            } else {
                const current = partialInfo[partialInfo.length - 1 - infoIdx];
                const previous = changes[changes.length - 1];
                previousBeat = previous.beat;
                if (previous.tempo === null || current.beatsPerMinute === undefined) {
                    previousTempo = null;
                    currentBeatsPerMinute = null;
                } else {
                    previousTempo = {
                        timeInSeconds: previous.tempo.timeInSeconds,
                        beatsPerMinute: current.beatsPerMinute
                    };
                    currentBeatsPerMinute = current.beatsPerMinute;
                }
                if (previous.signature === null || current.beatsInBar === undefined) {
                    previousSignature = null;
                    currentBeatsInBar = null;
                } else {
                    previousSignature = {
                        barBeat: previous.signature.barBeat,
                        beatsInBar: current.beatsInBar
                    };
                    currentBeatsInBar = current.beatsInBar;
                }
                currentStartTime = current.startTime;
            }

            let currentBeat: Fraction;
            let currentTempo: AllInfo["tempo"] | "uncomputed" = "uncomputed";
            let currentSignature: AllInfo["signature"] | "uncomputed" = "uncomputed";
            // We know calling this function that if current info is null, it means it
            // can't be computed.

            // Compute currentBeat, and other easy computable things.
            if (currentStartTime.type === "byBeat") {
                currentBeat = currentStartTime.beat;
            } else if (currentStartTime.type === "byTime") {
                if (currentBeatsPerMinute === null || previousTempo === null) {
                    this._throwTempoError();
                }
                const currentTime = currentStartTime.seconds;
                currentTempo = {
                    timeInSeconds: currentTime,
                    beatsPerMinute: currentBeatsPerMinute
                };
                currentBeat = previousBeat.add(
                    currentTime
                        .sub(previousTempo.timeInSeconds)
                        .div(60)
                        .mul(previousTempo.beatsPerMinute)
                );
            } else {
                if (currentBeatsInBar === null || previousSignature === null) {
                    this._throwBarBeatError();
                }
                const currentBarBeat = {
                    bar: currentStartTime.bar,
                    beat: currentStartTime.beatInBar
                };
                currentSignature = { barBeat: currentBarBeat, beatsInBar: currentBeatsInBar };
                currentBeat = computeBeatFromPrevBarBeatInfo(
                    previousBeat,
                    previousSignature.barBeat,
                    previousSignature.beatsInBar,
                    currentBarBeat
                );
            }

            // Compute what is missing.
            if (currentTempo === "uncomputed") {
                if (previousTempo === null || currentBeatsPerMinute === null) {
                    currentTempo = null;
                } else {
                    currentTempo = {
                        timeInSeconds: previousTempo.timeInSeconds.add(
                            currentBeat.sub(previousBeat).div(previousTempo.beatsPerMinute).mul(60)
                        ),
                        beatsPerMinute: currentBeatsPerMinute
                    };
                }
            }
            if (currentSignature === "uncomputed") {
                if (previousSignature === null || currentBeatsInBar === null) {
                    currentSignature = null;
                } else {
                    currentSignature = {
                        barBeat: computeBarBeatFromPrevBeatInfo(
                            previousBeat,
                            previousSignature.barBeat,
                            previousSignature.beatsInBar,
                            currentBeat
                        ),
                        beatsInBar: currentBeatsInBar
                    };
                }
            }

            // Add it to the array and keep going !
            changes.push({
                beat: currentBeat,
                signature: currentSignature,
                tempo: currentTempo
            });
        }
        return changes;
    }
}


function computeBarBeatFromPrevBeatInfo(
    prevBeat: Fraction,
    prevBarBeat: MusicBeat,
    prevBeatsInBar: Fraction,
    targetBeat: Fraction
): MusicBeat {
    const beatsDiff = targetBeat.sub(prevBeat);
    const { bar, beatInBar } = barBeatNoOverflow(
        prevBarBeat.bar,
        prevBarBeat.beat.add(beatsDiff),
        prevBeatsInBar
    );
    return { bar, beat: beatInBar };
}

function computeBeatFromPrevBarBeatInfo(
    prevBeat: Fraction,
    prevBarBeat: MusicBeat,
    prevBeatsInBar: Fraction,
    targetBarBeat: MusicBeat
): Fraction {
    const toAdd1 = prevBeatsInBar.mul(targetBarBeat.bar - prevBarBeat.bar);
    const toAdd2 = targetBarBeat.beat.sub(prevBarBeat.beat);
    return prevBeat.add(toAdd1).add(toAdd2);
}

// TODO : Hide the export.
export function barBeatNoOverflow(
    bar: number,
    beatInBar: Fraction,
    nbBeatsInBar: Fraction
): { bar: number; beatInBar: Fraction; overflow: boolean } {
    const bonusBars = beatInBar.div(nbBeatsInBar).floor().valueOf();
    let newBeat = beatInBar.mod(nbBeatsInBar);
    if (newBeat.lt(0)) {
        newBeat = newBeat.add(nbBeatsInBar);
    }
    return {
        bar: bar + bonusBars,
        beatInBar: newBeat,
        overflow: bonusBars !== 0
    };
}

//TODO : Do not export this function to the public API.
export function keepOneOn<T>(arr: T[], keepFirst: boolean, compare: (a: T, b: T) => boolean): T[] {
    const idxToRemove = [];
    for (let idx = 0; idx < arr.length - 1; idx++) {
        if (compare(arr[idx], arr[idx+1])) {
            idxToRemove.push(keepFirst ? idx + 1 : idx);
        }
    }
    const newArr: T[] = [];
    let removeIdx = 0;
    for (let idx = 0; idx < arr.length; idx++) {
        if (removeIdx < idxToRemove.length && idx === idxToRemove[removeIdx]) {
            removeIdx++;
        } else {
            newArr.push(arr[idx])
        }
    }
    return newArr
}

// Tests (TODO : move into designated test file later)
// const res1 = barBeatNoOverflow(2, new Fraction(3), new Fraction(10));
// const res2 = barBeatNoOverflow(2, new Fraction(0), new Fraction(10));
// const res3 = barBeatNoOverflow(-2, new Fraction(51.5), new Fraction(10));
// const res4 = barBeatNoOverflow(1, new Fraction(10), new Fraction(10));
// const res5 = barBeatNoOverflow(1, new Fraction(-3), new Fraction(10));
// const res6 = barBeatNoOverflow(1, new Fraction(-23), new Fraction(10));

// // Test - Empty converter.
// const converter1 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: []
// });
// // Test - 1 tempo change by time.
// const converter2 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [{ startTime: { type: "byTime", seconds: 0 }, beatsPerMinute: 60 }]
// });
// // Test - multiple tempo change by time.
// const converter3 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byTime", seconds: -10 }, beatsPerMinute: 24 },
//         { startTime: { type: "byTime", seconds: 0 }, beatsPerMinute: 10 },
//         { startTime: { type: "byTime", seconds: 18 }, beatsPerMinute: 60 }
//     ]
// });
// // Test - multiple tempo change by beat.
// const converter4 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byBeat", beat: -4 }, beatsPerMinute: 24 },
//         { startTime: { type: "byBeat", beat: 0 }, beatsPerMinute: 10 },
//         { startTime: { type: "byBeat", beat: 2 }, beatsPerMinute: 60 }
//     ]
// });
// // Test - time/beat offset.
// const converter5 = new GlobalBeatConverter({
//     beatReference: { beat: 1, barBeat: { bar: 0, beat: 0 }, timeInSeconds: -2.5 },
//     changes: [
//         { startTime: { type: "byTime", seconds: -10 }, beatsPerMinute: 24 },
//         { startTime: { type: "byTime", seconds: 0 }, beatsPerMinute: 10 },
//         { startTime: { type: "byTime", seconds: 18 }, beatsPerMinute: 60 }
//     ]
// });
// // Test - 1 signature change by bar beat.
// const converter6 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [{ startTime: { type: "byBarBeat", bar: 0, beatInBar: 0 }, beatsInBar: 4 }]
// });
// // Test - multiple signature change by bar beat.
// const converter7 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byBarBeat", bar: -1, beatInBar: 0 }, beatsInBar: 5 },
//         { startTime: { type: "byBarBeat", bar: 0, beatInBar: 0 }, beatsInBar: 2 },
//         { startTime: { type: "byBarBeat", bar: 3, beatInBar: 0 }, beatsInBar: 3 }
//     ]
// });
// // Test - Signature change in middle of measure.
// const converter8 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byBarBeat", bar: 0, beatInBar: 0 }, beatsInBar: 4 }, //B0
//         { startTime: { type: "byBarBeat", bar: 1, beatInBar: 3 }, beatsInBar: 5 }, //B7
//         { startTime: { type: "byBarBeat", bar: 3, beatInBar: 0 }, beatsInBar: 4 }, //B14
//         { startTime: { type: "byBarBeat", bar: 4, beatInBar: 3 }, beatsInBar: 2 }, //B21
//         { startTime: { type: "byBarBeat", bar: 6, beatInBar: 0 }, beatsInBar: 4 } //B22
//     ]
// });
// // Test - signature offset.
// const converter9 = new GlobalBeatConverter({
//     beatReference: { beat: -1, barBeat: { bar: -2, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byBarBeat", bar: -1, beatInBar: 0 }, beatsInBar: 5 },
//         { startTime: { type: "byBarBeat", bar: 0, beatInBar: 0 }, beatsInBar: 2 },
//         { startTime: { type: "byBarBeat", bar: 3, beatInBar: 0 }, beatsInBar: 3 }
//     ]
// });
// // Test - mix signature defined with time in seconds, and tempo defined with barbeat.
// const converter9 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byTime", seconds: -10 }, beatsInBar: 5 }, //B-20
//         { startTime: { type: "byBarBeat", bar: -2, beatInBar: 0 }, beatsPerMinute: 120 }, //B-10
//         { startTime: { type: "byTime", seconds: 5 }, beatsInBar: 3 }, //B+10
//         { startTime: { type: "byBarBeat", bar: 4, beatInBar: 0 }, beatsPerMinute: 90 } //B+16
//     ]
// });
// // Test - Redundant information removal.
// const converter10 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byBeat", beat: 0 }, beatsInBar: 5, beatsPerMinute: 20 }, 
//         { startTime: { type: "byBeat", beat: 3 }, beatsInBar: 5, beatsPerMinute: 40 }, 
//         { startTime: { type: "byBeat", beat: 6 }, beatsInBar: 3, beatsPerMinute: 40 }
//     ]
// });
// // Test - Out of order.
// const converter11 = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [
//         { startTime: { type: "byBeat", beat: 1 }, beatsPerMinute: 40 }, 
//         { startTime: { type: "byTime", seconds: -1 }, beatsPerMinute: 60 }, 
//     ]
// });
// // Test - Complex example and convert methods.
// const converter12 = new GlobalBeatConverter({
//     beatReference: { beat: 1, barBeat: { bar: 2, beat: 0 }, timeInSeconds: 3 },
//     changes: [
//         { startTime: {type: "byBeat", beat: 0}, beatsInBar: 3, beatsPerMinute: 60}, //B0
//         { startTime: { type: "byTime", seconds: 7 }, beatsPerMinute: 120 }, //B5
//         { startTime: { type: "byBarBeat", bar: 5, beatInBar: 0 }, beatsInBar: 4 }, //B10
//     ]
// });
// const x1 = converter12.convertAbsoluteBeatToBarBeat(new Fraction(2));
// const x2 = converter12.convertBarBeatToAbsoluteBeat({bar: 0, beat: new Fraction(1)});
// const x3 = converter12.convertAbsoluteBeatToSeconds(new Fraction(10));
// const x4 = converter12.convertSecondsToAbsoluteBeat(new Fraction(7));

// console.log("Over");

// TODO : Make warning for barbeat change if not at measure beginning of measure ? Same for seconds ??
// TODO : Decide on behaviour when tempo change half way through a second and measure change half way through a measure. DOes it cut, or smoothly transition. For now it transitions smoothly. Document it.
// TODO : More helpful "out of order message".

