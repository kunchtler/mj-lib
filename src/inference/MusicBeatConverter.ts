import Fraction from "fraction.js";
import { Timeline } from "../simulator/Timeline";

//TODO : Messages d'erreurs avec position.

/** @constant
The epsilon value to use for comparisons ont the timeline.
Two events apart by less than 0.0001 s are considered to be the same.
*/
const EPSILON = 1e-5;

//TODO : Precise in seconds or in milliseconds ?
// function isApproxEqual(t1: number, t2: number, epsilon = EPSILON): boolean {
//     return Math.abs(t1 - t2) < epsilon;
// }
// function isApproxEqual(f1: Fraction, f2: Fraction, epsilon = EPSILON): boolean {
//     return f1.sub(f2).abs().lt(epsilon);
// }
function timePerMeasure(
    signature: Fraction,
    tempoNote: Fraction,
    tempoBpm: number | Fraction
): Fraction {
    return signature.div(tempoNote).mul(new Fraction(60).div(tempoBpm));
}
//TODO : Make vanilla timeline in utils rather than in simulator folder.
//TODO : Confusion in what a beat is (if sig 3/4 and tempo 1/4. Is beat : 0, 1, 2 or 0/4, 1/4, 2/4 ??)
export type MusicTime = [number, Fraction];
export type MusicTempo = { note: Fraction; bpm: number };

//TODO : Change Name.
//TODO : More efficient to store Measure first beat as key instead of measure number ?
export class MusicBeatConverter {
    readonly signatureChanges: Timeline<number, Fraction>;
    readonly tempoChanges: Timeline<number, MusicTempo>;

    constructor(
        signatureChanges: [number, Fraction | string][],
        tempoChanges: [number, MusicTempo][]
    ) {
        const signatureChangesOnlyFractions = signatureChanges.map(
            ([measure, beat]) =>
                [measure, beat instanceof Fraction ? beat : new Fraction(beat)] as [
                    number,
                    Fraction
                ]
        );
        this.signatureChanges = new Timeline(signatureChangesOnlyFractions);
        if (this.signatureChanges.empty()) {
            throw Error("Must provide at least one signature.");
        }
        const tempoChangesOnlyFraction = tempoChanges.map(
            ([measure, { note, bpm }]) =>
                [
                    measure,
                    { note: note instanceof Fraction ? note : new Fraction(note), bpm: bpm }
                ] as [number, MusicTempo]
        );
        this.tempoChanges = new Timeline(tempoChangesOnlyFraction);
        if (this.tempoChanges.empty()) {
            throw Error("Must provide at least one tempo indication.");
        }
    }

    // Checks if the beat is not outside the range of the measure.
    validateMusicTime([measure, beat]: MusicTime): boolean {
        let signature = this.signatureChanges.prevEvent(measure, false)[1];
        if (signature === null) {
            signature = this.signatureChanges.begin().pointer[1];
        }
        return beat.lt(signature);
    }

    //TODO : Change name.
    convertMeasureToBeat(musicTime: MusicTime): Fraction {
        // Initial validation for sanity.
        if (!this.validateMusicTime(musicTime)) {
            throw Error("Beat is outside of measure.");
        }
        const [measure, beat] = musicTime;

        // In case the measure we search for is before the first documented,
        // we take the initial signature.
        const it = this.signatureChanges.begin();
        let [currentMeasure, currentSignature] = it.pointer;
        if (measure < currentMeasure) {
            return currentSignature.mul(measure).add(beat);
        }

        // General Case.
        let beatAcc = currentSignature.mul(currentMeasure);
        it.next();
        while (it.isAccessible() && it.pointer[0] <= measure) {
            beatAcc = beatAcc.add(currentSignature.mul(it.pointer[0] - currentMeasure));
            [currentMeasure, currentSignature] = it.pointer;
            it.next();
        }
        return beatAcc.add(currentSignature.mul(measure - currentMeasure)).add(beat);
    }

    //TODO : Change name.
    convertBeatToMeasure(beat: Fraction): MusicTime {
        // Case when the beat is under the first known measure.
        const it = this.signatureChanges.begin();
        let [currentMeasure, currentSignature] = it.pointer;
        if (beat.lt(currentSignature.mul(currentMeasure))) {
            const measureAnswer = beat.div(currentSignature).floor().valueOf();
            // Not computing the modulo as it may be negative.
            const beatAnswer = beat.sub(currentSignature.mul(measureAnswer));
            return [measureAnswer, beatAnswer];
        }

        // General Case
        let beatAcc = currentSignature.mul(currentMeasure);
        it.next();
        while (
            it.isAccessible() &&
            beat.sub(beatAcc).gte(currentSignature.mul(it.pointer[0] - currentMeasure))
        ) {
            beatAcc = beatAcc.add(currentSignature.mul(it.pointer[0] - currentMeasure));
            [currentMeasure, currentSignature] = it.pointer;
            it.next();
        }
        const measureAnswer =
            currentMeasure + beat.sub(beatAcc).div(currentSignature).floor().valueOf();
        beatAcc = beatAcc.add(currentSignature.mul(measureAnswer - currentMeasure));
        const beatAnswer = beat.sub(beatAcc);
        return [measureAnswer, beatAnswer];
    }

    convertBeatToRealTime(beat: Fraction): Fraction {
        const musicTime = this.convertBeatToMeasure(beat);

        const itTempo = this.tempoChanges.begin();
        const firstTempoMeasure = itTempo.pointer[0];
        let currentTempo = itTempo.pointer[1];
        const itSignature = this.signatureChanges.begin();
        const firstSignatureMeasure = itSignature.pointer[0];
        let currentSignature = itSignature.pointer[1];

        const minMeasure =
            firstTempoMeasure < firstSignatureMeasure ? firstTempoMeasure : firstSignatureMeasure;

        let time = timePerMeasure(currentSignature, currentTempo.note, currentTempo.bpm).mul(
            minMeasure
        );

        // Case where the beat is before the first documented measure.
        if (musicTime[0] < minMeasure) {
            const lastMeasureTime = timePerMeasure(
                currentSignature,
                currentTempo.note,
                currentTempo.bpm
            );
            time = time.add(musicTime[1].div(currentSignature).mul(lastMeasureTime));
            return time;
        }

        // General Case
        for (let measureIdx = minMeasure; measureIdx < musicTime[0] + 1; measureIdx++) {
            if (itTempo.isAccessible() && itTempo.pointer[0] === measureIdx) {
                currentTempo = itTempo.pointer[1];
                itTempo.next();
            }
            if (itSignature.isAccessible() && itSignature.pointer[0] === measureIdx) {
                currentSignature = itSignature.pointer[1];
                itSignature.next();
            }
            time = time.add(timePerMeasure(currentSignature, currentTempo.note, currentTempo.bpm));
        }
        // We've overshot the time by a bit (counting a full measure instead of only the beat).
        const lastMeasureTime = timePerMeasure(
            currentSignature,
            currentTempo.note,
            currentTempo.bpm
        );
        time = time.add(musicTime[1].div(currentSignature).sub(1).mul(lastMeasureTime));
        return time;
    }

    getTempo(beat: Fraction): MusicTempo {
        const measure = this.convertBeatToMeasure(beat)[0];
        const tempo = this.tempoChanges.prevEvent(measure)[1];
        return tempo ?? this.tempoChanges.begin().pointer[1];
    }

    // convertRealTimeToBeat(time: number, epsilon = EPSILON): Fraction {
    //     const fracTime = new Fraction(time);

    //     const itTempo = this.tempoChanges.begin();
    //     const firstTempoMeasure = itTempo.pointer[0];
    //     let currentTempo = itTempo.pointer[1];
    //     const itSignature = this.signatureChanges.begin();
    //     const firstSignatureMeasure = itSignature.pointer[0];
    //     let currentSignature = itSignature.pointer[1];

    //     const minMeasure =
    //         firstTempoMeasure < firstSignatureMeasure ? firstTempoMeasure : firstSignatureMeasure;
    //     const timeAcc = timePerMeasure(currentSignature, currentTempo.note, currentTempo.bpm)
    //         .mul(minMeasure)
    //         .valueOf();
    //     while (timeAcc <= time) {
    //         if (itTempo.isAccessible() && itTempo.pointer[0] === measureIdx) {
    //             currentTempo = itTempo.pointer[1];
    //             itTempo.next();
    //         }
    //         if (itSignature.isAccessible() && itSignature.pointer[0] === measureIdx) {
    //             currentSignature = itSignature.pointer[1];
    //             itSignature.next();
    //         }
    //     }

    //     // Case where the time is before the first known measure.

    //     // General Case

    //     // return new Fraction("0");
    //     throw new Error("Not Implementsd");
    // }
}

//TODO : Use testing library ? Vitest ?
//TODO : Change prettier max char per line (100 is... big !)

// Testing
// console.log("Tests start.");
// const converter = new MusicBeatConverter([
//     [1, new Fraction("3/4")],
//     [3, new Fraction("1/2")],
//     [4, new Fraction("3/7")]
// ]);

// const validateTests: [MusicTime, boolean][] = [
//     [[-1, new Fraction("0")], true],
//     [[0, new Fraction("4/4")], false],
//     [[2, new Fraction("2/5")], true],
//     [[2, new Fraction("3/4")], false]
// ];
// for (const [time, answer] of validateTests) {
//     if (converter.validateMusicTime(time) !== answer) {
//         console.log("Error in validate.");
//     }
// }

// const convertTests: [MusicTime, Fraction][] = [
//     [[-1, new Fraction("0")], new Fraction("-3/4")],
//     [[1, new Fraction("0")], new Fraction("3/4")],
//     [[2, new Fraction("0")], new Fraction("6/4")],
//     [[3, new Fraction("0")], new Fraction("9/4")],
//     [[4, new Fraction("0")], new Fraction("11/4")],
//     [[5, new Fraction("0")], new Fraction("89/28")],
//     [[6, new Fraction("0")], new Fraction("101/28")],
//     [[-1, new Fraction("1/4")], new Fraction("-2/4")],
//     [[2, new Fraction("1/4")], new Fraction("7/4")],
//     [[6, new Fraction("1/7")], new Fraction("105/28")]
// ];
// for (const [time, absBeat] of convertTests) {
//     if (!converter.convertMeasureBeat(time).equals(absBeat)) {
//         console.log("Error in convertMeasureBeat.");
//     }
//     const answer = converter.convertAbsoluteBeat(absBeat);
//     if (!(answer[0] === time[0] && answer[1].equals(time[1]))) {
//         console.log("Error in convertMeasureBeat.");
//     }
// }
// console.log("Tests end.");
