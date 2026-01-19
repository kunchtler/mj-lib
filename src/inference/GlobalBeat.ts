import Fraction from "fraction.js";
import { Timeline } from "../utils/Timeline";
import { FracTimeline } from "../utils/FracTimeline";
import { GlobalBeatDescription } from "./PerformanceDescription";

// function barDuration(signature: TimeSignature<Fraction>, tempo: MusicTempo<Fraction>): Fraction {
//     return signature.beatDuration
//         .mul(signature.beatsPerBar)
//         .div(tempo.noteDuration)
//         .mul(60)
//         .div(tempo.notesPerMinute);
// }

export type MusicBeat = { bar: number; beat: Fraction };

export class GlobalBeat {
    beatsInBarChanges: FracTimeline<Fraction>; // Maps a beat to the signature change happening on that beat.
    tempoChanges: FracTimeline<Fraction>; // Maps a beat to a tempo change happening on that beat.
    beat0Reference: { beat: Fraction; timeInSeconds: Fraction };

    constructor(description: GlobalBeatDescription) {
        // In description.changes, the times at which the changes occur can be described by time,
        // beat, or bar&beat. Since at those point in times, we're defining signature changes and
        // tempo changes, we don't have a reliable way of properly computing time -> beat or
        // bar&beat -> beat at initialization.
        // Thus we require and enforce that description.changes is ordered.
        this.beatsInBarChanges = new FracTimeline();
        this.tempoChanges = new FracTimeline();

        // TODO : Add possibility for offset.
        for (const elem of description.changes) {
            signatureChangesContainer.push([
                bar,
                {
                    beatDuration:
                        timeSignature.beatDuration instanceof Fraction
                            ? timeSignature.beatDuration
                            : new Fraction(timeSignature.beatDuration),
                    beatsPerBar:
                        timeSignature.beatsPerBar instanceof Fraction
                            ? timeSignature.beatsPerBar
                            : new Fraction(timeSignature.beatsPerBar)
                }
            ]);
        }
        this.beatsInBarChanges = new Timeline({ container: signatureChangesContainer });
        if (this.beatsInBarChanges.empty()) {
            throw Error("Must provide at least one signature.");
        }

        const tempoChangesContainer: [number, MusicTempo<Fraction>][] = [];
        for (const { bar, tempo } of tempoChanges) {
            tempoChangesContainer.push([
                bar,
                {
                    noteDuration:
                        tempo.noteDuration instanceof Fraction
                            ? tempo.noteDuration
                            : new Fraction(tempo.noteDuration),
                    notesPerMinute:
                        tempo.notesPerMinute instanceof Fraction
                            ? tempo.notesPerMinute
                            : new Fraction(tempo.notesPerMinute)
                }
            ]);
        }
        this.tempoChanges = new Timeline({ container: tempoChangesContainer });
        if (this.tempoChanges.empty()) {
            throw Error("Must provide at least one tempo indication.");
        }
    }

    /**
     * Checks if a beat is inside the range of this bar, ie is in [0, signature.beatsPerBar[.
     * @param param0 The [bar, beat] to check for.
     * @returns whether the beat is within the bar or outside.
     */
    isBeatInBar({ bar, beat }: MusicBeat): boolean {
        let beatsInBar = this.beatsInBarChanges.prevEvent(new Fraction(bar), false)[1];
        if (beatsInBar === null) {
            beatsInBar = this.beatsInBarChanges.begin().pointer[1];
        }
        return beat.lt(beatsInBar) && beat.gte(0);
    }

    convertBarBeatToAbsoluteBeat(barBeat: MusicBeat): Fraction {
        // Initial validation for sanity.
        if (!this.isBeatInBar(barBeat)) {
            throw Error("Beat is outside of bar.");
        }
        const { bar, beat } = barBeat;

        // In case the bar we search for is before the first documented,
        // we take the initial signature.
        const it = this.beatsInBarChanges.begin();
        let [currentBar, { beatsPerBar: currentBeatsPerBar }] = it.pointer;
        if (bar < currentBar) {
            return currentBeatsPerBar.mul(bar).add(beat);
        }

        // General Case.
        let beatAcc = currentBeatsPerBar.mul(currentBar);
        it.next();
        while (it.isAccessible() && it.pointer[0] <= bar) {
            beatAcc = beatAcc.add(currentBeatsPerBar.mul(it.pointer[0] - currentBar));
            [currentBar, { beatsPerBar: currentBeatsPerBar }] = it.pointer;
            it.next();
        }
        return beatAcc.add(currentBeatsPerBar.mul(bar - currentBar)).add(beat);
    }

    convertAbsoluteBeatToBarBeat(beat: Fraction): MusicBeat {
        // Case when the beat is under the first known bar.
        const it = this.beatsInBarChanges.begin();
        let [currentBar, { beatsPerBar: currentBeatsPerBar }] = it.pointer;
        if (beat.lt(currentBeatsPerBar.mul(currentBar))) {
            const barAnswer = beat.div(currentBeatsPerBar).floor().valueOf();
            // Not computing the modulo as it may be negative.
            const beatAnswer = beat.sub(currentBeatsPerBar.mul(barAnswer));
            return { bar: barAnswer, beat: beatAnswer };
        }

        // General Case
        let beatAcc = currentBeatsPerBar.mul(currentBar);
        it.next();
        while (
            it.isAccessible() &&
            beat.sub(beatAcc).gte(currentBeatsPerBar.mul(it.pointer[0] - currentBar))
        ) {
            beatAcc = beatAcc.add(currentBeatsPerBar.mul(it.pointer[0] - currentBar));
            [currentBar, { beatsPerBar: currentBeatsPerBar }] = it.pointer;
            it.next();
        }
        const barAnswer = currentBar + beat.sub(beatAcc).div(currentBeatsPerBar).floor().valueOf();
        beatAcc = beatAcc.add(currentBeatsPerBar.mul(barAnswer - currentBar));
        const beatAnswer = beat.sub(beatAcc);
        return { bar: barAnswer, beat: beatAnswer };
    }

    beatToSeconds(beat: Fraction): Fraction {
        const barBeat = this.convertAbsoluteBeatToBarBeat(beat);

        const itTempo = this.tempoChanges.begin();
        const firstTempoBar = itTempo.pointer[0];
        let currentTempo = itTempo.pointer[1];
        const itSignature = this.beatsInBarChanges.begin();
        const firstSignatureBar = itSignature.pointer[0];
        let currentSignature = itSignature.pointer[1];

        const minBar = firstTempoBar < firstSignatureBar ? firstTempoBar : firstSignatureBar;

        let time = barDuration(currentSignature, currentTempo).mul(minBar);

        // Case where the beat is before the first documented bar.
        if (barBeat.bar < minBar) {
            const lastBarTime = barDuration(currentSignature, currentTempo);
            time = time.add(barBeat.beat.div(currentSignature.beatsPerBar).mul(lastBarTime));
            return time;
        }

        // General Case
        for (let barIdx = minBar; barIdx < barBeat.bar + 1; barIdx++) {
            if (itTempo.isAccessible() && itTempo.pointer[0] === barIdx) {
                currentTempo = itTempo.pointer[1];
                itTempo.next();
            }
            if (itSignature.isAccessible() && itSignature.pointer[0] === barIdx) {
                currentSignature = itSignature.pointer[1];
                itSignature.next();
            }
            time = time.add(barDuration(currentSignature, currentTempo));
        }
        // We've overshot the time by a bit (counting a full bar instead of only the beat).
        const lastBarTime = barDuration(currentSignature, currentTempo);
        time = time.add(barBeat.beat.div(currentSignature.beatsPerBar).sub(1).mul(lastBarTime));
        return time;
    }

    getTempo(beat: Fraction): MusicTempo<Fraction> {
        const bar = this.convertAbsoluteBeatToBarBeat(beat).bar;
        const tempo = this.tempoChanges.prevEvent(bar)[1];
        return tempo ?? this.tempoChanges.begin().pointer[1];
    }
}
