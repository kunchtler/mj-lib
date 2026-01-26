import Fraction from "fraction.js";
import {
    FractionDescription,
    JugglingPhrase,
    JugglingScore,
    LocalBeatStartTime,
    LocalTempo
} from "./PerformanceDescription";
import { GlobalBeatConverter, keepOneOn, MusicBeat } from "./GlobalBeatConverter";
import { ElementOf } from "../utils";

type LocalBeatDescription = {
    beatReference: ElementOf<JugglingScore["jugglers"]>["beatReference"];
    changes: Pick<JugglingPhrase, "startTime" | "localBaseTempo" | "localTempoMultiplier">[];
};

type LocalTempoChanges = {
    localBeat: Fraction;
    localBeatsPerGlobalBeat: Fraction;
    globalBeat: Fraction;
};

type LocalGlobalTempo = {
    localBeat: Fraction;
    globalBeat: Fraction;
    tempo: SimpleTempo;
};

type SimpleTime = { type: "local" | "global"; beat: Fraction };
type SimpleTempo = { type: "perGlobalBeat" | "perMinute"; value: Fraction };

export class LocalBeatConverter {
    globalBeatConverter: GlobalBeatConverter;
    tempoChanges: LocalTempoChanges[];

    constructor(description: LocalBeatDescription, globalBeatConverter: GlobalBeatConverter) {
        this.globalBeatConverter = globalBeatConverter;
        this.tempoChanges = [];

        // Return early if needed.
        if (description.changes.length === 0) {
            return;
        }

        // Compute the references.
        const localReference = new Fraction(description.beatReference.jugglerBeat);
        const globalReference = makeGlobalBeat(
            description.beatReference.globalTime,
            this.globalBeatConverter
        );

        // To make handling of description.change easier, we :
        // - transform all BarBeats en Seconds Times into GlobalBeats.
        // - fuse all tempo multipliers with the base tempo.
        // - compute all "followPrevious" times into Beats or GlobalBeats (depending on what precedes it.)
        // - Remove all beats adding no additional information to the tempo.

        // In order to do that, we look for the initial value of the tempo and the beat it occurs on.
        let firstTime: SimpleTime;
        if (description.changes[0].startTime.type === "followPrevious") {
            // If we start with previous follow, we chose to start at the reference beat.
            firstTime = { type: "local", beat: localReference };
        } else if (description.changes[0].startTime.type === "byLocalBeat") {
            firstTime = {
                type: "local",
                beat: new Fraction(description.changes[0].startTime.beat)
            };
        } else {
            firstTime = {
                type: "global",
                beat: makeGlobalBeat(description.changes[0].startTime, this.globalBeatConverter)
            };
        }

        // The initial local tempo is the first one we find.
        let firstBaseTempo: SimpleTempo | null = null;
        for (const { localBaseTempo } of description.changes) {
            if (localBaseTempo !== undefined) {
                firstBaseTempo = makeTempoFraction(localBaseTempo);
                break;
            }
        }
        if (firstBaseTempo === null) {
            firstBaseTempo = { type: "perGlobalBeat", value: new Fraction(1) };
        }

        // The multiplier is not looked for forwards (it wouldn't make much sense as the default is 1.)
        const firstMultiplier = new Fraction(description.changes[0].localTempoMultiplier ?? 1);
        const firstTrueTempo = makeTrueTempo(firstBaseTempo, firstMultiplier);

        const partialTempos: {
            time: SimpleTime;
            tempo: SimpleTempo;
        }[] = [];
        let previousInfo: {
            time: SimpleTime;
            baseTempo: SimpleTempo;
            multiplier: Fraction;
            trueTempo: SimpleTempo;
        } = {
            time: firstTime,
            baseTempo: firstBaseTempo,
            multiplier: firstMultiplier,
            trueTempo: firstTrueTempo
        };

        partialTempos.push({ time: previousInfo.time, tempo: previousInfo.trueTempo });

        for (let changeIdx = 1; changeIdx < description.changes.length; changeIdx++) {
            const { startTime, localBaseTempo, localTempoMultiplier } =
                description.changes[changeIdx];
            let currentTime: SimpleTime;
            // Transforme the time into either local or global beats.
            if (startTime.type === "byLocalBeat") {
                currentTime = { type: "local", beat: new Fraction(startTime.beat) };
            } else if (startTime.type === "followPrevious") {
                if (previousInfo.time.type === "local") {
                    currentTime = { type: "local", beat: previousInfo.time.beat.add(1) };
                } else if (previousInfo.trueTempo.type === "perGlobalBeat") {
                    // The previous time is based on global beats.
                    // The previous tempo in local beats per global beats.
                    // We add to the last global beat as much global beats that are
                    // in one local beat.
                    currentTime = {
                        type: "global",
                        beat: previousInfo.time.beat.add(previousInfo.trueTempo.value.inverse())
                    };
                } else {
                    // The previous time is based on global beats.
                    // The previous tempo in local beats per minute.
                    // We add to the last time in sec as much sec that are
                    // in one local beat, and then convert to global beats.
                    const lastTimeSeconds = this.globalBeatConverter.convertAbsoluteBeatToSeconds(
                        previousInfo.time.beat
                    );
                    const currentTimeSeconds = lastTimeSeconds.add(
                        previousInfo.trueTempo.value.inverse()
                    );
                    currentTime = {
                        type: "global",
                        beat: this.globalBeatConverter.convertSecondsToAbsoluteBeat(
                            currentTimeSeconds
                        )
                    };
                }
            } else {
                currentTime = {
                    type: "global",
                    beat: makeGlobalBeat(startTime, this.globalBeatConverter)
                };
            }
            const currentBaseTempo: SimpleTempo =
                localBaseTempo === undefined
                    ? previousInfo.baseTempo
                    : makeTempoFraction(localBaseTempo);
            let currentMultiplier: Fraction;
            if (localBaseTempo === undefined) {
                // Tempo hasen't changed. We take the new multiplier if there is one, else the previous.
                if (localTempoMultiplier === undefined) {
                    currentMultiplier = previousInfo.multiplier;
                } else {
                    currentMultiplier = new Fraction(localTempoMultiplier);
                }
            } else {
                // Tempo has changed, we take one by default if no multiplier has been specified.
                if (localTempoMultiplier === undefined) {
                    currentMultiplier = new Fraction(1);
                } else {
                    currentMultiplier = new Fraction(localTempoMultiplier);
                }
            }
            const currentTrueTempo = makeTrueTempo(currentBaseTempo, currentMultiplier);

            // Record the changes only if the base or current tempo have changed.
            if (
                !(
                    areTempoEqual(previousInfo.baseTempo, currentBaseTempo) &&
                    areTempoEqual(previousInfo.trueTempo, currentTrueTempo)
                )
            ) {
                partialTempos.push({
                    time: currentTime,
                    tempo: currentTrueTempo
                });
            }

            // Change the contents of the previous iteration
            previousInfo = {
                time: currentTime,
                baseTempo: currentBaseTempo,
                multiplier: currentMultiplier,
                trueTempo: currentTrueTempo
            };
        }

        // We can now look for which beat or global beat precedes the one that is the reference.
        let idxRef = partialTempos.findIndex(
            ({ time }) =>
                (time.type === "local" && time.beat.gt(localReference)) ||
                (time.type === "global" && time.beat.gt(globalReference))
        );
        idxRef = idxRef === 0 ? 0 : idxRef === -1 ? partialTempos.length - 1 : idxRef - 1;

        // We thus have the tempo at that point, and precise local and global beat.
        // We start doing a search forward, and another backwards, to compute all local and global beats at tempo changes.

        const coolTemposUpFromRef = partialTempos.slice(idxRef + 1, partialTempos.length);
        const coolTemposDownFromRef = partialTempos.slice(0, idxRef + 1);

        const startingInfo: LocalGlobalTempo = {
            localBeat: localReference,
            globalBeat: globalReference,
            tempo: partialTempos[idxRef].tempo
        };
        const temposUpFromRef = this.computeLocalGlobalTempo(
            coolTemposUpFromRef,
            startingInfo,
            true,
            this.globalBeatConverter
        ).slice(1);
        const temposDownFromRef = this.computeLocalGlobalTempo(
            coolTemposDownFromRef,
            startingInfo,
            false,
            this.globalBeatConverter
        ).slice(1);

        let tempos = [...temposDownFromRef.reverse(), ...temposUpFromRef];

        // Check that tempo is in ascending order, or sort it (or else the rest wouldn't work).
        let needsSorting = false;
        for (let idx = 0; idx < tempos.length - 1; idx++) {
            if (tempos[idx].globalBeat.gt(tempos[idx + 1].globalBeat)) {
                needsSorting = true;
                break;
            }
        }
        if (needsSorting) {
            console.warn("Tempos weren't provided in ascending order. May be issues.");
            tempos.sort((info1, info2) => info1.globalBeat.compare(info2.globalBeat));
        }

        // If we have to events on the same beat, forget about the earlier ones and fuse them.
        tempos = keepOneOn(tempos, false, (tempo1, tempo2) =>
            tempo1.globalBeat.equals(tempo2.globalBeat)
        );

        // Finally, replace all tempo per minute in tempo per global beats.
        const globalTempoChanges = this.globalBeatConverter.tempoChanges;
        for (let changeIdx = 0; changeIdx < tempos.length; changeIdx++) {
            const { localBeat, globalBeat, tempo } = tempos[changeIdx];
            if (tempo.type === "perGlobalBeat") {
                this.tempoChanges.push({
                    localBeat: localBeat,
                    globalBeat: globalBeat,
                    localBeatsPerGlobalBeat: tempo.value
                });
            } else {
                if (globalTempoChanges.length === 0) {
                    throw Error("Global beat converter has no tempo change.");
                }
                // We need to make sure all global tempo changes are accounted for.
                // We look for the global beat tempo changes we'll need to account for
                // by searching the smallest concerned idx (idx1) and the largest (idx2).
                // Search for the global beat tempo change index that happens
                // <= beat tempo
                let idx1 = globalTempoChanges.findIndex(({ absoluteBeat }) =>
                    absoluteBeat.gt(globalBeat)
                );
                idx1 = idx1 === 0 ? 0 : idx1 === -1 ? globalTempoChanges.length - 1 : idx1 - 1;
                // Search for the global beat tempo change index that happens
                // < the NEXT local beat tempo change (or if does not exist, we go
                // till the end).
                let idx2: number;
                if (changeIdx + 1 >= tempos.length) {
                    idx2 = globalTempoChanges.length - 1;
                } else {
                    idx2 = globalTempoChanges.findIndex(({ absoluteBeat }) =>
                        absoluteBeat.gte(tempos[changeIdx + 1].globalBeat)
                    );
                    idx2 = idx2 === 0 ? 0 : idx2 === -1 ? globalTempoChanges.length - 1 : idx2 - 1;
                }

                // Add a first local tempo change using idx1's info but at the current time.
                // tempo in global beats per minute.
                const tempoGBpM = globalTempoChanges[idx1].beatsPerMinute;
                this.tempoChanges.push({
                    localBeat: localBeat,
                    globalBeat: globalBeat,
                    localBeatsPerGlobalBeat: tempo.value.div(tempoGBpM)
                });

                for (let _idx = idx1 + 1; _idx <= idx2; _idx++) {
                    const tempoGBpM = globalTempoChanges[_idx].beatsPerMinute;
                    const globalBeat = globalTempoChanges[_idx].absoluteBeat;
                    const {
                        globalBeat: lastGlobalBeat,
                        localBeat: lastLocalBeat,
                        localBeatsPerGlobalBeat: lastLBpGB
                    } = this.tempoChanges[this.tempoChanges.length - 1];
                    this.tempoChanges.push({
                        localBeat: lastLocalBeat.add(globalBeat.sub(lastGlobalBeat).mul(lastLBpGB)),
                        globalBeat: globalBeat,
                        localBeatsPerGlobalBeat: tempo.value.div(tempoGBpM)
                    });
                }
            }
        }
    }

    private _throwTempoError(): never {
        throw Error("Can't work with local beats if no tempo specified.");
    }

    convertGlobalBeatToLocalBeat(globalBeat: Fraction): Fraction {
        if (this.tempoChanges.length === 0) {
            this._throwTempoError();
        }

        let idx = this.tempoChanges.findIndex(({ globalBeat: lastGlobalBeat }) =>
            lastGlobalBeat.gt(globalBeat)
        );
        idx = idx === 0 ? 0 : idx === -1 ? this.tempoChanges.length - 1 : idx - 1;

        const {
            localBeat: lastLocalBeat,
            localBeatsPerGlobalBeat: lastTempo,
            globalBeat: lastGlobalBeat
        } = this.tempoChanges[idx];

        return lastLocalBeat.add(globalBeat.sub(lastGlobalBeat).mul(lastTempo));
    }

    convertLocalBeatToGlobalBeat(localBeat: Fraction): Fraction {
        if (this.tempoChanges.length === 0) {
            this._throwTempoError();
        }

        let idx = this.tempoChanges.findIndex(({ localBeat: lastLocalBeat }) =>
            lastLocalBeat.gt(localBeat)
        );
        idx = idx === 0 ? 0 : idx === -1 ? this.tempoChanges.length - 1 : idx - 1;

        const {
            localBeat: lastLocalBeat,
            localBeatsPerGlobalBeat: lastTempo,
            globalBeat: lastGlobalBeat
        } = this.tempoChanges[idx];

        return lastGlobalBeat.add(localBeat.sub(lastLocalBeat).div(lastTempo));
    }

    convertBarBeatToLocalBeat(barBeat: MusicBeat): Fraction {
        const globalBeat = this.globalBeatConverter.convertBarBeatToAbsoluteBeat(barBeat);
        return this.convertGlobalBeatToLocalBeat(globalBeat);
    }

    convertLocalBeatToBarBeat(localBeat: Fraction): MusicBeat {
        const globalBeat = this.convertLocalBeatToGlobalBeat(localBeat);
        return this.globalBeatConverter.convertAbsoluteBeatToBarBeat(globalBeat);
    }

    convertSecondsToLocalBeat(timeInSeconds: Fraction): Fraction {
        const globalBeat = this.globalBeatConverter.convertSecondsToAbsoluteBeat(timeInSeconds);
        return this.convertGlobalBeatToLocalBeat(globalBeat);
    }

    convertLocalBeatToSeconds(localBeat: Fraction): Fraction {
        const globalBeat = this.convertLocalBeatToGlobalBeat(localBeat);
        return this.globalBeatConverter.convertAbsoluteBeatToSeconds(globalBeat);
    }

    // getTempoAtLocalBeat(localBeat: Fraction): Fraction {
    //     if (this.tempoChanges.length === 0) {
    //         this._throwTempoError();
    //     }

    //     let idx = this.tempoChanges.findIndex(({ localBeat: lastLocalBeat }) =>
    //         lastLocalBeat.gt(localBeat)
    //     );
    //     idx = idx === 0 ? 0 : idx === -1 ? this.tempoChanges.length - 1 : idx - 1;

    //     return this.tempoChanges[idx].localBeatsPerGlobalBeat;
    // }

    // Compute the tempo, local and global beats of an array having only one of the two.
    // We start by feeding the array som starting information.
    private computeLocalGlobalTempo(
        partialInfo: {
            time: SimpleTime;
            tempo: SimpleTempo;
        }[],
        startingInfo: LocalGlobalTempo,
        goUp: boolean,
        globalBeatConverter: GlobalBeatConverter
    ): LocalGlobalTempo[] {
        const changes: LocalGlobalTempo[] = [startingInfo];
        for (let infoIdx = 0; infoIdx < partialInfo.length; infoIdx++) {
            // The name for these variables make sense when going up.
            // In the case when we're going down, they're simply having the right values
            // to make it work.
            let lastLocalBeat: Fraction;
            let lastGlobalBeat: Fraction;
            let lastTempo: SimpleTempo;
            let currentTempo: SimpleTempo;
            let currentTime: SimpleTime;
            if (goUp) {
                const current = partialInfo[infoIdx];
                const previous = changes[changes.length - 1];
                lastLocalBeat = previous.localBeat;
                lastGlobalBeat = previous.globalBeat;
                lastTempo = previous.tempo;
                currentTime = current.time;
                currentTempo = current.tempo;
            } else {
                const current = partialInfo[partialInfo.length - 1 - infoIdx];
                const previous = changes[changes.length - 1];
                lastLocalBeat = previous.localBeat;
                lastGlobalBeat = previous.globalBeat;
                lastTempo = current.tempo;
                currentTime = current.time;
                currentTempo = current.tempo;
            }

            let currentLocalBeat: Fraction;
            let currentGlobalBeat: Fraction;
            if (currentTime.type === "local") {
                // The current time is in local beats.
                currentLocalBeat = currentTime.beat;
                // Compute global beat depending on the tempo.
                if (lastTempo.type === "perGlobalBeat") {
                    // The tempo is in local beats per global beats.
                    currentGlobalBeat = lastGlobalBeat.add(
                        currentLocalBeat.sub(lastLocalBeat).div(lastTempo.value)
                    );
                } else {
                    // The tempo is in local beats per minute.
                    const lastTime =
                        globalBeatConverter.convertAbsoluteBeatToSeconds(lastGlobalBeat);
                    const currentTime = lastTime.add(
                        currentLocalBeat.sub(lastLocalBeat).div(lastTempo.value)
                    );
                    currentGlobalBeat =
                        globalBeatConverter.convertSecondsToAbsoluteBeat(currentTime);
                }
            } else {
                // The current time is in global beats.
                currentGlobalBeat = new Fraction(currentTime.beat);
                if (lastTempo.type === "perGlobalBeat") {
                    currentLocalBeat = lastLocalBeat.add(
                        currentGlobalBeat.sub(lastGlobalBeat).mul(lastTempo.value)
                    );
                } else {
                    const lastTime =
                        globalBeatConverter.convertAbsoluteBeatToSeconds(lastGlobalBeat);
                    const currentTime =
                        globalBeatConverter.convertAbsoluteBeatToSeconds(currentGlobalBeat);
                    currentLocalBeat = lastLocalBeat.add(
                        currentTime.sub(lastTime).mul(lastTempo.value.div(60))
                    );
                }
            }

            changes.push({
                localBeat: currentLocalBeat,
                globalBeat: currentGlobalBeat,
                tempo: currentTempo
            });
        }
        return changes;
    }
}

// Returns true if tempos hold the same information.
function areTempoEqual(tempo1: SimpleTempo, tempo2: SimpleTempo): boolean {
    return tempo1.type === tempo2.type && tempo1.value.equals(tempo2.value);
}

// Transforms a beat in global time into global beat.
function makeGlobalBeat(
    globalBeat: Extract<
        LocalBeatStartTime,
        { type: "byGlobalBeat" | "byGlobalBarBeat" | "byTime" }
    >,
    globalBeatConverter: GlobalBeatConverter
): Fraction {
    if (globalBeat.type === "byGlobalBeat") {
        return new Fraction(globalBeat.beat);
    } else if (globalBeat.type === "byGlobalBarBeat") {
        return globalBeatConverter.convertBarBeatToAbsoluteBeat({
            bar: globalBeat.bar,
            beat: new Fraction(globalBeat.beatInBar)
        });
    } else {
        return globalBeatConverter.convertSecondsToAbsoluteBeat(new Fraction(globalBeat.seconds));
    }
}

// Make a tempo description use fractions (where they used strings)
function makeTempoFraction(tempo: LocalTempo<FractionDescription>): SimpleTempo {
    if (tempo.type === "perGlobalBeat") {
        return {
            type: "perGlobalBeat",
            value: new Fraction(tempo.beatsPerGlobalBeat)
        };
    } else {
        return {
            type: "perMinute",
            value: new Fraction(tempo.beatsPerMinute)
        };
    }
}

// Compute the tempo factoring in the multiplier.
function makeTrueTempo(baseTempo: SimpleTempo, tempoMultiplier: Fraction): SimpleTempo {
    return {
        type: baseTempo.type,
        value: baseTempo.value.mul(tempoMultiplier)
    };
}


// TODO : Make tests from example and move them to designated folder.
// // Tests global converter setup.
// const emptyGlobalConverter = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: []
// });
// const simpleGlobalConverter = new GlobalBeatConverter({
//     beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//     changes: [{ startTime: { type: "byBeat", beat: 0 }, beatsInBar: 4, beatsPerMinute: 60 }]
// });
// const complexGlobalConverter = new GlobalBeatConverter({
//     beatReference: { beat: 2, barBeat: { bar: 0, beat: 0 }, timeInSeconds: -2 },
//     changes: [
//         { startTime: { type: "byBeat", beat: 0 }, beatsInBar: 4, beatsPerMinute: 60 }, //B0 B-1B2 S-4
//         { startTime: { type: "byBeat", beat: 6 }, beatsInBar: 3, beatsPerMinute: 120 } //B6 B1B0 S2
//     ]
// });
// Test - Empty converter.
// const converter1 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: []
//     },
//     emptyGlobalConverter
// );
// Test - 1 tempo change.
// const converter2 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byGlobalBeat", beat: -1 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 }
//             }
//         ]
//     },
//     simpleglobalConverter
// );
// const x21 = converter2.convertGlobalBeatToLocalBeat(new Fraction(2)); //4
// const x22 = converter2.convertLocalBeatToGlobalBeat(new Fraction(2)); //1
// Test - Global beat tempo change perGlobalBeat
// const converter3 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byGlobalBeat", beat: -2 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 } //B-4 GB-2
//             },
//             {
//                 startTime: { type: "byGlobalBeat", beat: 0 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 3 } //B0 GB0
//             },
//             {
//                 startTime: { type: "byGlobalBeat", beat: 2 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 4 } //B6 GB2
//             }
//         ]
//     },
//     simpleglobalConverter
// );
// // Test - Global beat tempo change perMinute
// const converter4 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byGlobalBeat", beat: -2 },
//                 localBaseTempo: { type: "perMinute", beatsPerMinute: 120 } //B-4 GB-2
//             },
//             {
//                 startTime: { type: "byGlobalBeat", beat: 0 },
//                 localBaseTempo: { type: "perMinute", beatsPerMinute: 180 } //B0 GB0
//             },
//             {
//                 startTime: { type: "byGlobalBeat", beat: 2 },
//                 localBaseTempo: { type: "perMinute", beatsPerMinute: 30 } //B2 GB2
//             }
//         ]
//     },
//     simpleGlobalConverter
// );
// // Test - local tempo change.
// const converter5 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byLocalBeat", beat: -4 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 } //B-2 GB-4
//             },
//             {
//                 startTime: { type: "byLocalBeat", beat: 0 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 3 } //B0 GB0
//             },
//             {
//                 startTime: { type: "byLocalBeat", beat: 6 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 4 } //B6 GB2
//             }
//         ]
//     },
//     simpleGlobalConverter
// );
// // Test - Global bar beat tempo change.
// const converter6 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byGlobalBarBeat", bar: -2, beatInBar: 0 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 } //B-16 GB-8
//             },
//             {
//                 startTime: { type: "byGlobalBarBeat", bar: 0, beatInBar: 0 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 4 } //B0 GB0
//             },
//             {
//                 startTime: { type: "byGlobalBarBeat", bar: 1, beatInBar: 3 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 3 } //B28 GB7
//             }
//         ]
//     },
//     simpleGlobalConverter
// );
// // Test - time tempo change.
// const converter7 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byTime", seconds: -2 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 } //B-4 GB-2
//             },
//             {
//                 startTime: { type: "byTime", seconds: 0 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 3 } //B0 GB0
//             },
//             {
//                 startTime: { type: "byTime", seconds: 2 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 4 } //B6 GB2
//             }
//         ]
//     },
//     simpleGlobalConverter
// );
// // Test - follow tempo change and tempo offset.
// const converter8 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: -4, globalTime: { type: "byGlobalBeat", beat: -2 } },
//         changes: [
//             {
//                 startTime: { type: "byLocalBeat", beat: -4 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 } //B-4 GB-2
//             },
//             {
//                 startTime: { type: "followPrevious" } //B-3 GB-1.5
//             },
//             {
//                 startTime: { type: "followPrevious" } //B-2 GB1
//             },
//             {
//                 startTime: { type: "followPrevious" },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 3 } //B-1 GB-1/2
//             },
//             {
//                 startTime: { type: "followPrevious" } //B0 GB-1/6
//             },
//             {
//                 startTime: { type: "followPrevious" },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 4 } //B1 GB+1/6
//             }
//         ]
//     },
//     simpleGlobalConverter
// );
// // Test - tempo multiplier. //TODO : CHECK THAT INDEED THE TEMPO MULT GETS RESET ON NEW TEMPO.
// const converter9 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byLocalBeat", beat: -8 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 }, //B-8 GB-2 T4
//                 localTempoMultiplier: 2
//             },
//             {
//                 startTime: { type: "byLocalBeat", beat: 0 }, //B0 GB0 T1
//                 localTempoMultiplier: "1/2"
//             },
//             {
//                 startTime: { type: "byLocalBeat", beat: 4 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 3 } //B4 GB4 T3
//             },
//             {
//                 startTime: { type: "byLocalBeat", beat: 10 }, //B10 GB6 T6
//                 localTempoMultiplier: 2
//             }
//         ]
//     },
//     simpleGlobalConverter
// );
// // Test - tempo inference at start. //TODO : Is this the default we want, even if there is a tempo later ? Kind of unconsistent with globalbeat converter.
// const converter10 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: 0, globalTime: { type: "byGlobalBeat", beat: 0 } },
//         changes: [
//             {
//                 startTime: { type: "byLocalBeat", beat: -4 } //B-4 GB-4 T1
//             }
//         ]
//     },
//     simpleGlobalConverter
// );
// // Test - complex example and convert.
// const converter11 = new LocalBeatConverter(
//     {
//         beatReference: { jugglerBeat: -8, globalTime: { type: "byTime", seconds: -5 } },
//         changes: [
//             {
//                 startTime: { type: "byLocalBeat", beat: -8 },
//                 localBaseTempo: { type: "perMinute", beatsPerMinute: 120 } //B-8 GB-1 T2
//             },
//             { // B6 GB6 T1
//                 startTime: { type: "byTime", seconds: 4 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 3 }, //B10 GB10 T4.5
//                 localTempoMultiplier: 1.5
//             },
//             {
//                 startTime: { type: "byGlobalBarBeat", bar: 3, beatInBar: 1 }, //B23.5 GB13 T6
//                 localTempoMultiplier: 2
//             },
//             {
//                 startTime: { type: "followPrevious" }, //B24.5 GB13+1/6 T3
//                 localTempoMultiplier: 1
//             },
//             {
//                 startTime: { type: "byGlobalBeat", beat: 20 },
//                 localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 1 } //B45 GB20 T1
//             }
//         ]
//     },
//     complexGlobalConverter
// );

// // TODO : Test offset.
// // TODO : Test starting with followPrevious.
// // TODO : Test warning if out of order.

// console.log("Fini");
