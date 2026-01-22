import Fraction from "fraction.js";
import { GlobalBeatDescription, GlobalBeatStartTime } from "./PerformanceDescription";

export type MusicBeat = { bar: number; beat: Fraction };

type TempoChange = {
    absoluteBeat: Fraction;
    beatsPerMinute: Fraction;
    timeInSeconds: Fraction;
};

type SignatureChange = {
    absoluteBeat: Fraction;
    signature: Fraction;
    bar: number;
};

export class GlobalBeatConverter {
    signatureChanges: SignatureChange[]; // Maps a beat to the signature change happening on that beat.
    tempoChanges: TempoChange[]; // Maps a beat to a tempo change happening on that beat.

    constructor(description: GlobalBeatDescription) {
        // In description.changes, the times at which the changes occur can be described by time,
        // beat, or bar&beat. Since at those point in times, we're defining signature changes and
        // tempo changes, we don't have a reliable way of properly computing time -> beat or
        // bar&beat -> beat at initialization.
        // Thus we require and enforce that description.changes is ordered.

        // Note: Beat 0 is the first one of measure 0.

        // TODO : Add possibility for offset.
        this.tempoChanges = [];
        this.signatureChanges = [];
        const beatOffset = new Fraction(description.firstBeatOffsetInSeconds ?? 0);

        // First, we need to gather the initial signature / tempo information we encounter.
        // But it may be complex as the first timeone is introduced may necessitate using iself !
        let firstSignature: { startTime: GlobalBeatStartTime; signature: Fraction } | null = null;
        for (const info of description.changes) {
            if (info.beatsInBar !== undefined) {
                firstSignature = {
                    startTime: info.startTime,
                    signature: new Fraction(info.beatsInBar)
                };
                break;
            }
        }
        let firstTempo: { startTime: GlobalBeatStartTime; tempo: Fraction } | null = null;
        for (const info of description.changes) {
            if (info.beatsPerMinute !== undefined) {
                firstTempo = {
                    startTime: info.startTime,
                    tempo: new Fraction(info.beatsPerMinute)
                };
                break;
            }
        }
        // Now we can try and identify the beats.
        if (firstSignature !== null) {
            let firstSignatureBeat: Fraction;
            if (firstSignature.startTime.type === "byBeat") {
                firstSignatureBeat = new Fraction(firstSignature.startTime.beat);
            } else if (firstSignature.startTime.type === "byBarBeat") {
                const { bar, beat } = firstSignature.startTime;
                if (!new Fraction(beat).equals(0)) {
                    // This is to simplify the bar's computation.
                    throw Error(
                        "Please do not provide first barInBeats in the middle of a measure."
                    );
                }
                firstSignatureBeat = firstSignature.signature.mul(bar).add(beat);
            } else {
                // Quite complex as we can have multiple tempo changes before the first Signature Beat...
                throw Error("Can't specify first beatsInBar while using real time.");
            }
            // Remember : the beat 0 if also beat 0 of measure 0.
            // So having the beat, to get the bar, we just need to multiply.
            const bar = firstSignatureBeat.div(firstSignature.signature).valueOf();
            this.signatureChanges.push({
                absoluteBeat: firstSignatureBeat,
                bar: bar,
                signature: firstSignature.signature
            });
        }
        if (firstTempo !== null) {
            let firstTempoBeat: Fraction;
            if (firstTempo.startTime.type === "byBeat") {
                firstTempoBeat = new Fraction(firstTempo.startTime.beat);
            } else if (firstTempo.startTime.type === "byBarBeat") {
                // Quite complex as we can have multiple signature changes before the first Tempo Beat...
                throw Error("Can't specify first beatsPerMinute while using bars and measures.");
            } else {
                // Remember beat 0 happens at time = offset.
                firstTempoBeat = new Fraction(firstTempo.startTime.seconds)
                    .sub(beatOffset)
                    .div(60)
                    .mul(firstTempo.tempo);
            }
            // With the offset, we can compute the timeInSeconds.
            const time = firstTempoBeat.mul(firstTempo.tempo).div(60).add(beatOffset);
            this.tempoChanges.push({
                absoluteBeat: firstTempoBeat,
                beatsPerMinute: firstTempo.tempo,
                timeInSeconds: time
            });
        }

        // Now gather info about all changes.
        // In doing so, we duplicate the first element of the changes array, but it's no biggies,
        // as we'll erase it at the very end.
        for (const info of description.changes) {
            // Compte the beat of the change.
            let currentBeat: Fraction;
            if (info.startTime.type === "byBeat") {
                // We already have the absolute beat.
                currentBeat = new Fraction(info.startTime.beat);
            } else if (info.startTime.type === "byBarBeat") {
                // Compute absolute beat from bar (alias signature) using cached signature information.
                if (this.signatureChanges.length === 0) {
                    throw Error("TODO Problem if used in first event where bar are defined.");
                }
                const {
                    absoluteBeat: lastSignatureBeat,
                    signature: lastSignature,
                    bar: lastSignatureBar
                } = this.signatureChanges[this.signatureChanges.length - 1];
                if (lastSignature.lte(info.startTime.beat)) {
                    console.warn("Beat surpasses the amount of beats in a bar.");
                }
                currentBeat = lastSignatureBeat
                    .add(lastSignature.mul(info.startTime.bar - lastSignatureBar))
                    .add(info.startTime.beat);
            } else {
                // Compute the absolute beat from real time using cached tempo information.
                if (this.tempoChanges.length === 0) {
                    throw Error("TODO");
                }
                const {
                    absoluteBeat: lastTempoBeat,
                    beatsPerMinute: lastBpm,
                    timeInSeconds: lastTempoTime
                } = this.tempoChanges[this.tempoChanges.length - 1];
                currentBeat = lastTempoBeat.add(
                    new Fraction(info.startTime.seconds).sub(lastTempoTime).div(60).mul(lastBpm)
                );
            }

            // Record new signature if needed.
            if (info.beatsInBar !== undefined) {
                // Check the beat is indeed greater than the previous.
                if (new Fraction(info.beatsInBar).lte(0)) {
                    throw Error("Can't have a number of beats in a bar <= 0.");
                }
                let newBar: number = 0; //TODO
                if (this.signatureChanges.length !== 0) {
                    const {
                        absoluteBeat: signatureBeat,
                        signature: lastSignature,
                        bar: lastBar
                    } = this.signatureChanges[this.signatureChanges.length - 1];
                    // Check we treat events in ascending order.
                    if (currentBeat.lt(signatureBeat)) {
                        throw Error("Can't initialize global beats with non-increasing times.");
                    } else if (currentBeat.equals(signatureBeat)) {
                        // We just need to pop the last element so as not to have duplicate times.
                        this.signatureChanges.pop();
                    }
                    // Compute new bar.
                    newBar =
                        lastBar +
                        currentBeat.sub(signatureBeat).div(lastSignature).ceil().valueOf();
                    if (!currentBeat.sub(signatureBeat).divisible(lastSignature)) {
                        // Changing signature, even if in the middle of a measure, will create a new measure on that beat.
                        console.warn("New measure created midway !");
                        // To achieve mind peace, we modify the last bar to have the computed number of beats.
                        const beatsInLastBar = currentBeat
                            .sub(signatureBeat)
                            .sub(lastSignature.mul(newBar - 1 - lastBar));
                        // But we need to check if it already exists so as to not duplicate it.
                        if (newBar - 1 === lastBar) {
                            this.signatureChanges[this.signatureChanges.length].signature =
                                beatsInLastBar;
                        } else {
                            this.signatureChanges.push({
                                absoluteBeat: currentBeat.sub(beatsInLastBar),
                                bar: newBar - 1,
                                signature: beatsInLastBar
                            });
                        }
                    }
                }
                this.signatureChanges.push({
                    absoluteBeat: currentBeat,
                    signature: new Fraction(info.beatsInBar),
                    bar: newBar
                });
            }

            // Record new tempo if needed.
            if (info.beatsPerMinute !== undefined) {
                if (new Fraction(info.beatsPerMinute).lt(0)) {
                    throw Error("Can't have a number of beats per minute < 0.");
                }
                let newTime = new Fraction(0); // TODO
                if (this.tempoChanges.length !== 0) {
                    const {
                        absoluteBeat: tempoBeat,
                        beatsPerMinute: lastBpm,
                        timeInSeconds: lastTempoTime
                    } = this.tempoChanges[this.tempoChanges.length - 1];
                    // Check we treat events in ascending order.
                    if (currentBeat.lt(tempoBeat)) {
                        throw Error("Can't initialize global beats with non-increasing times.");
                    } else if (currentBeat.equals(tempoBeat)) {
                        // We just need to pop the last element so as not to have duplicate times.
                        this.tempoChanges.pop();
                    }
                    newTime = lastTempoTime.add(currentBeat.sub(tempoBeat).div(60).mul(lastBpm));
                }
                this.tempoChanges.push({
                    absoluteBeat: currentBeat,
                    beatsPerMinute: new Fraction(info.beatsPerMinute),
                    timeInSeconds: newTime
                });
            }
        }

        // The promised erasure :
        // if (this.tempoChanges.length !== 0) {
        //     this.tempoChanges = this.tempoChanges.splice(0, 1);
        // }
        // if (this.signatureChanges.length !== 0) {
        //     this.signatureChanges = this.signatureChanges.splice(0, 1);
        // }
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
}
