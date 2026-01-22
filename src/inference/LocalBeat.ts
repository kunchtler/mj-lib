import Fraction from "fraction.js";
import { JugglingPhrase, JugglingScore, LocalBeatTempo } from "./PerformanceDescription";
import { GlobalBeatConverter } from "./GlobalBeat";
import { ElementOf } from "../utils";

export type MusicBeat = { bar: number; beat: Fraction };

type LocalBeatDescription = {
    firstLocalBeatOffset?: ElementOf<JugglingScore["jugglers"]>["firstLocalBeatOffset"];
    changes: Pick<JugglingPhrase, "startTime" | "localBeatTempo" | "localBeatTempoMultiplier">[];
};

type LocalTempoChanges = {
    localBeat: Fraction;
    localBeatsPerGlobalBeat: Fraction;
    globalBeat: Fraction;
};

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

        //TODO : Handle offset ! (at the end ???)

        // Compute the first beat offset.
        let firstBeatOffset: Fraction;
        if (description.firstLocalBeatOffset === undefined) {
            firstBeatOffset = new Fraction(0);
        } else if (description.firstLocalBeatOffset.type === "byGlobalBeat") {
            firstBeatOffset = new Fraction(description.firstLocalBeatOffset.beat);
        } else if (description.firstLocalBeatOffset.type === "byGlobalBarBeat") {
            firstBeatOffset = this.globalBeatConverter.convertBarBeatToAbsoluteBeat({
                bar: description.firstLocalBeatOffset.bar,
                beat: new Fraction(description.firstLocalBeatOffset.beatInBar)
            });
        } else {
            firstBeatOffset = this.globalBeatConverter.convertSecondsToAbsoluteBeat(
                new Fraction(description.firstLocalBeatOffset.seconds)
            );
        }

        // Gather the first event time.

        if (description.changes[0].startTime.type === "followPrevious") {
            // If the first event is "followPrevious", make it be local beat 0 instead.
            description.changes[0].startTime = { type: "byLocalBeat", beat: 0 };
            //TOCONTINUE : calculer tous la variable "previous". Pas besoin d'appliquer la ligne au dessus car on commence ensuite à l'item 1.
        }

        // We define the starting tempo by looking at the first tempo indication.
        // If not set, we use a generic 1 local beat per global beat.
        let lastTempo: Fraction;
        let lastTempoBeat: Fraction;
        if (
            description.changes.length !== 0 &&
            description.changes[0].localBeatTempo !== undefined
        ) {
            description.changes[0].localBeatTempo = { type: "byLocalBeat", beat: 0 };
        }

        // We look for the first tempo indication
        let firstTempo: NonNullable<ElementOf<LocalBeatDescription["changes"]>> | null = null;
        for (const change of description.changes) {
            if (change.localBeatTempo !== undefined) {
                firstTempo = change;
                break;
            }
            // If a tempo multiplier is used before a tempo value is set,
            // we use the default tempo of 1 beat per global beat (which will be
            // set by setting firstTempo to null);
            if (change.localBeatTempoMultiplier !== undefined) {
                break;
            }
        }

        let lastTempo: Fraction;
        if (firstTempo === null) {
            // If no tempo was provided, we take 1 local beat = 1 global beat.
            lastTempo = new Fraction(1);
        } else if (firstTempo.localBeatTempo!.type === "perGlobalBeat") {
            lastTempo = new Fraction(firstTempo.localBeatTempo!.beatsPerGlobalBeat);
        } else {
            // The tempo is defined in localBeat per minute.
            // The thing is, since we're working in localBeat per globalBeat,
            // If the global beat tempo changes, the local beat tempo does too.
            // So from the first global beat changes up to the moment this last
            // tempo was defined.
            let startBeat: Fraction;
            if (firstTempo.startTime.type === "byLocalBeat") {
                startBeat = new Fraction(firstTempo.startTime.beat);
            } else if (firstTempo.startTime.type === "byGlobalBeat") {
                // Local Beat 0 in on global beat firstBeatOffset.
                // Need to find b
                // startBeatNoOffset = new Fraction
            } else if (firstTempo.startTime.type === "byGlobalBarBeat") {
                this.globalBeatConverter.convertBarBeatToAbsoluteBeat({
                    bar: firstTempo.startTime.bar,
                    beat: new Fraction(firstTempo.startTime.beatInBar)
                });
                // Same as above
            } else if (firstTempo.startTime.type === "byTime") {
                this.globalBeatConverter.convertSecondsToAbsoluteBeat(
                    new Fraction(firstTempo.startTime.seconds)
                );
                // Same as above
            } else {
                // Need to go backwards until we find something that is not "follow".
                // We know from the way we chose
            }
        }

        // First we generate the list of tempos where tempos can be per minute
        // or per global beat.
        const tempos: {
            localBeat: Fraction;
            globalBeat: Fraction;
            tempo: LocalBeatTempo<Fraction>;
        }[] = [];

        // We need to record the base tempo to apply tempo multiplier changes.
        let previous: {
            localBeat: Fraction;
            globalBeat: Fraction;
            baseTempo: LocalBeatTempo<Fraction>;
            trueTempo: LocalBeatTempo<Fraction>;
        } = {}; //TOCONTINUE;
        for (let changeIdx = 1; changeIdx < description.changes.length; changeIdx++) {
            const { startTime, localBeatTempo, localBeatTempoMultiplier } =
                description.changes[changeIdx];
            // First, compute the exact time.
            let currentLocalBeat: Fraction;
            let currentGlobalBeat: Fraction;
            if (startTime.type === "byLocalBeat" || startTime.type === "followPrevious") {
                // Here, we can easily compute the current localBeat, and infer globalbeat from it.
                if (startTime.type === "byLocalBeat") {
                    currentLocalBeat = new Fraction(startTime.beat);
                } else {
                    currentLocalBeat = previous.localBeat.add(1);
                }

                // Compute global beat depending on the tempo.
                if (previous.trueTempo.type === "perGlobalBeat") {
                    currentGlobalBeat = previous.globalBeat.add(
                        currentLocalBeat
                            .sub(previous.localBeat)
                            .div(previous.trueTempo.beatsPerGlobalBeat)
                    );
                } else {
                    const lastTime = this.globalBeatConverter.convertAbsoluteBeatToSeconds(
                        previous.globalBeat
                    );
                    const currentTime = lastTime.add(
                        currentLocalBeat
                            .sub(previous.localBeat)
                            .div(previous.trueTempo.beatsPerMinute)
                    );
                    currentGlobalBeat =
                        this.globalBeatConverter.convertSecondsToAbsoluteBeat(currentTime);
                }
            } else {
                // Here, we can easily compute the current globalBeat, and infer localBeat form it.
                if (startTime.type === "byGlobalBeat") {
                    currentGlobalBeat = new Fraction(startTime.beat);
                } else if (startTime.type === "byGlobalBarBeat") {
                    currentGlobalBeat = this.globalBeatConverter.convertBarBeatToAbsoluteBeat({
                        bar: startTime.bar,
                        beat: new Fraction(startTime.beatInBar)
                    });
                } else {
                    currentGlobalBeat = this.globalBeatConverter.convertSecondsToAbsoluteBeat(
                        new Fraction(startTime.seconds)
                    );
                }

                // Compute local beat depending on the trueTempo.
                if (previous.trueTempo.type === "perGlobalBeat") {
                    currentLocalBeat = previous.localBeat.add(
                        currentGlobalBeat
                            .sub(previous.globalBeat)
                            .mul(previous.trueTempo.beatsPerGlobalBeat)
                    );
                } else {
                    const lastTime = this.globalBeatConverter.convertAbsoluteBeatToSeconds(
                        previous.globalBeat
                    );
                    const currentTime =
                        this.globalBeatConverter.convertAbsoluteBeatToSeconds(currentGlobalBeat);
                    currentLocalBeat = previous.localBeat.add(
                        currentTime.sub(lastTime).mul(previous.trueTempo.beatsPerMinute.div(60))
                    );
                }
            }

            // Now, compute and update the tempo changes.

            // Compute the base tempo.
            let currentBaseTempo: LocalBeatTempo<Fraction>;
            if (localBeatTempo !== undefined) {
                if (localBeatTempo.type === "perGlobalBeat") {
                    currentBaseTempo = {
                        type: "perGlobalBeat",
                        beatsPerGlobalBeat: new Fraction(localBeatTempo.beatsPerGlobalBeat)
                    };
                } else {
                    currentBaseTempo = {
                        type: "perMinute",
                        beatsPerMinute: new Fraction(localBeatTempo.beatsPerMinute)
                    };
                }
            } else {
                currentBaseTempo = previous.baseTempo;
            }
            // Apply the multiplyer.
            let currentTrueTempo: LocalBeatTempo<Fraction>;
            if (currentBaseTempo.type === "perGlobalBeat") {
                currentTrueTempo = {
                    type: "perGlobalBeat",
                    beatsPerGlobalBeat: currentBaseTempo.beatsPerGlobalBeat.mul(
                        localBeatTempoMultiplier ?? 1
                    )
                };
            } else {
                currentTrueTempo = {
                    type: "perMinute",
                    beatsPerMinute: currentBaseTempo.beatsPerMinute.mul(
                        localBeatTempoMultiplier ?? 1
                    )
                };
            }
            // Record the changes only if the base or current tempo have changed.
            if (
                !(
                    areTempoEqual(previous.baseTempo, currentBaseTempo) &&
                    areTempoEqual(previous.trueTempo, currentTrueTempo)
                )
            ) {
                tempos.push({
                    localBeat: currentLocalBeat,
                    globalBeat: currentGlobalBeat,
                    tempo: currentTrueTempo
                });
            }

            // Change the contents of the previous iteration
            previous = {
                localBeat: currentLocalBeat,
                globalBeat: currentGlobalBeat,
                baseTempo: currentBaseTempo,
                trueTempo: currentTrueTempo
            };
        }

        //TODO : Rename beat offset to beat0 offset as it is clearer ?
        //TODO : Handle localBeat0 Or First offset ???

        // Generate a list where we replace all tempo per minute in tempo per global beats.
        for (let changeIdx = 0; changeIdx < tempos.length; changeIdx++) {
            const change = tempos[changeIdx];
            if (change.tempo.type === "perGlobalBeat") {
                this.tempoChanges.push({
                    localBeat: change.localBeat,
                    globalBeat: change.globalBeat,
                    localBeatsPerGlobalBeat: change.tempo.beatsPerGlobalBeat
                });
            } else {
                // We need to make sure all global tempo changes are accounted for.
                // We look for the global beat tempo changes we'll need to account for
                // by searching the smallest concerned idx (idx1) and the largest (idx2).
                // Search for the global beat tempo change index that happens
                // <= beat tempo change.
                let idx1 = this.globalBeatConverter.tempoChanges.findIndex(({ absoluteBeat }) =>
                    absoluteBeat.gt(change.globalBeat)
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

                // Add a first local tempo change using idx1's info, and bump it by
                // 1 to stay relevant.
                const globalBpm = this.globalBeatConverter.tempoChanges[idx1].beatsPerMinute;
                this.tempoChanges.push({
                    localBeat: change.localBeat,
                    globalBeat: change.globalBeat,
                    localBeatsPerGlobalBeat: change.tempo.beatsPerMinute.div(globalBpm)
                });

                for (let _idx = idx1 + 1; _idx < idx2 + 1; _idx++) {
                    const globalBpm = this.globalBeatConverter.tempoChanges[_idx].beatsPerMinute;
                    const globalBeat = this.globalBeatConverter.tempoChanges[_idx].absoluteBeat;
                    const {
                        globalBeat: lastGlobalBeat,
                        localBeat: lastLocalBeat,
                        localBeatsPerGlobalBeat: lastLBpGB
                    } = this.tempoChanges[this.tempoChanges.length - 1];
                    this.tempoChanges.push({
                        localBeat: lastLocalBeat.add(globalBeat.sub(lastGlobalBeat).mul(lastLBpGB)),
                        globalBeat: globalBeat,
                        localBeatsPerGlobalBeat: change.tempo.beatsPerMinute.div(globalBpm)
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
}

function areTempoEqual(
    tempo1: LocalBeatTempo<Fraction>,
    tempo2: LocalBeatTempo<Fraction>
): boolean {
    return (
        (tempo1.type === "perGlobalBeat" &&
            tempo2.type === "perGlobalBeat" &&
            tempo1.beatsPerGlobalBeat.equals(tempo2.beatsPerGlobalBeat)) ||
        (tempo1.type === "perMinute" &&
            tempo2.type === "perMinute" &&
            tempo1.beatsPerMinute.equals(tempo2.beatsPerMinute))
    );
}
