import Fraction from "fraction.js";
import {
    FractionDescription,
    JugglingPhrase,
    JugglingScore,
    LocalBeatStartTime,
    LocalTempo
} from "./PerformanceDescription";
import { GlobalBeatConverter, keepOneOn } from "./GlobalBeatConverter";
import { ElementOf } from "../utils";

export type MusicBeat = { bar: number; beat: Fraction };

type LocalBeatDescription = {
    beatReference: ElementOf<JugglingScore["jugglers"]>["beatReference"];
    changes: Pick<JugglingPhrase, "startTime" | "localBaseTempo" | "localTempoMultiplier">[];
};

type LocalTempoChanges = {
    localBeat: Fraction;
    localBeatsPerGlobalBeat: Fraction;
    globalBeat: Fraction;
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

        const firstBaseTempo: SimpleTempo =
            description.changes[0].localBaseTempo === undefined
                ? { type: "perGlobalBeat", value: new Fraction(1) }
                : makeTempoFraction(description.changes[0].localBaseTempo);
        const firstTrueTempo = makeTrueTempo(
            firstBaseTempo,
            new Fraction(description.changes[0].localTempoMultiplier ?? 1)
        );

        const partialTempos: {
            time: SimpleTime;
            tempo: SimpleTempo;
        }[] = [];
        let previousInfo: {
            time: SimpleTime;
            baseTempo: SimpleTempo;
            trueTempo: SimpleTempo;
        } = { time: firstTime, baseTempo: firstBaseTempo, trueTempo: firstTrueTempo };

        partialTempos.push({ time: previousInfo.time, tempo: previousInfo.trueTempo });

        for (let changeIdx = 1; changeIdx < description.changes.length; changeIdx++) {
            const {
                startTime,
                localBaseTempo: localBeatTempo,
                localTempoMultiplier: localBeatTempoMultiplier
            } = description.changes[changeIdx];
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
                localBeatTempo === undefined
                    ? previousInfo.baseTempo
                    : makeTempoFraction(localBeatTempo);
            const currentTrueTempo = makeTrueTempo(
                currentBaseTempo,
                new Fraction(localBeatTempoMultiplier ?? 1)
            );

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
        ).slice(0, 1);
        const temposDownFromRef = this.computeLocalGlobalTempo(
            coolTemposDownFromRef,
            startingInfo,
            false,
            this.globalBeatConverter
        ).slice(0, 1);

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
        tempos = keepOneOn(tempos, false, (tempo1, tempo2) => tempo1.globalBeat.equals(tempo2.globalBeat))

        // Finally, replace all tempo per minute in tempo per global beats.
        for (let changeIdx = 0; changeIdx < tempos.length; changeIdx++) {
            const { localBeat, globalBeat, tempo } = tempos[changeIdx];
            if (tempo.type === "perGlobalBeat") {
                this.tempoChanges.push({
                    localBeat: localBeat,
                    globalBeat: globalBeat,
                    localBeatsPerGlobalBeat: tempo.value
                });
            } else {
                // We need to make sure all global tempo changes are accounted for.
                // We look for the global beat tempo changes we'll need to account for
                // by searching the smallest concerned idx (idx1) and the largest (idx2).
                // Search for the global beat tempo change index that happens
                // <= beat tempo
                let idx1 = this.globalBeatConverter.tempoChanges.findIndex(({ absoluteBeat }) =>
                    absoluteBeat.gt(globalBeat)
                );
                idx1 = idx1 === 0 ? 0 : idx1 === -1 ? this.tempoChanges.length - 1 : idx1 - 1;
                // Search for the global beat tempo change index that happens
                // < the NEXT local beat tempo change (or if does not exist, we go
                // till the end).
                let idx2: number;
                if (changeIdx + 1 >= tempos.length) {
                    idx2 = this.globalBeatConverter.tempoChanges.length - 1;
                } else {
                    idx2 = this.globalBeatConverter.tempoChanges.findIndex(({ absoluteBeat }) =>
                        absoluteBeat.gte(tempos[changeIdx + 1].globalBeat)
                    );
                    idx2 = idx2 === 0 ? 0 : idx2 === -1 ? this.tempoChanges.length - 1 : idx2 - 1;
                }

                // Add a first local tempo change using idx1's info but at the current time.
                // tempo in global beats per minute.
                const tempoGBpM = this.globalBeatConverter.tempoChanges[idx1].beatsPerMinute;
                this.tempoChanges.push({
                    localBeat: localBeat,
                    globalBeat: globalBeat,
                    localBeatsPerGlobalBeat: tempo.value.div(tempoGBpM)
                });

                for (let _idx = idx1 + 1; _idx < idx2 + 1; _idx++) {
                    const tempoGBpM = this.globalBeatConverter.tempoChanges[_idx].beatsPerMinute;
                    const globalBeat = this.globalBeatConverter.tempoChanges[_idx].absoluteBeat;
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

    getTempoAtLocalBeat(localBeat: Fraction): Fraction {
        if (this.tempoChanges.length === 0) {
            this._throwTempoError();
        }

        let idx = this.tempoChanges.findIndex(({ localBeat: lastLocalBeat }) =>
            lastLocalBeat.gt(localBeat)
        );
        idx = idx === 0 ? 0 : idx === -1 ? this.tempoChanges.length - 1 : idx - 1;

        return this.tempoChanges[idx].localBeatsPerGlobalBeat;
    }

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
                lastLocalBeat = previous.globalBeat;
                lastGlobalBeat = previous.globalBeat;
                lastTempo = previous.tempo;
                currentTime = current.time;
                currentTempo = current.tempo;
            } else {
                const current = partialInfo[partialInfo.length - 1 - infoIdx];
                const previous = changes[changes.length - 1];
                lastLocalBeat = previous.globalBeat;
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

type LocalGlobalTempo = {
    localBeat: Fraction;
    globalBeat: Fraction;
    tempo: SimpleTempo;
};

