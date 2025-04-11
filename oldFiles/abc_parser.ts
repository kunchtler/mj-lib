import abcjs from "abcjs";

// Assumption : Music tempo (bpm) changes and meter signature changes happen at measure scale at the beginning of measure.
// Assumption : abc not can't do accelerando / rallentando.
// Assumption : jumps and repetitions have been "expanded" from
// the music sheet.
// Assumption : Jumps and repetitions happen at the measure bars.
// Assumption : abc ends with a bar.
export interface MeasureInfo {
    signatureNum: number;
    signatureDen: number;
    bpm: number;
    // measureNbOnSheet: number;
    // expandedNb: number; Trivial.
    // startTimeMilliseconds: number;
    startWholeNote: number;
}

export interface NoteInfo {
    pitch: string;
    height: number;
    flat: boolean;
    pitchRawString: string;
    measureNb: number;
    beatNb: number; // in range [0, measure.signature_num[
    trackWholeNote: number;
    // beatNbGlobal: number
    // nbBeatsInMeasure: number;
    timeMilliseconds: number; // As computed by abcjs midi functionnalities for playback
    // timeWholeNotes: number;
    // duration: number; //duration here is only one note, not tied notes.
}

//TODO : Check when first measure is smaller (anacrusis)
//TODO : Check assumptions ?
//TODO other measure attributes.
//TODO : At some point, do with precise fractions for beats ? For now, clip to closest.
export function parseTune(tune: abcjs.TuneObject, voiceNb: number): [NoteInfo[], MeasureInfo[]] {
    const seq = abcjs.synth.sequence(tune, {});
    abcjs.synth.flatten(seq); // This populates seq with more information.
    let measureFirstWholeNote = 0;
    let isNewMeasure = true;
    // We get the initial values using tune methods that give defaults.
    const initMeterFraction = tune.getMeterFraction();
    if (initMeterFraction.den === undefined) {
        throw Error("Initial meter denominator is undefined.");
    }
    let currentSignatureNum: number = initMeterFraction.num;
    let currentSignatureDen: number = initMeterFraction.den;
    let currentBpm: number = tune.getBpm();
    const encountered_repeats = new Map<string, Map<number, number>>();
    const notes: NoteInfo[] = [];
    const measures: MeasureInfo[] = [];
    for (const elem of seq[voiceNb]) {
        if (elem.el_type === "note") {
            if (isNewMeasure) {
                //We freeze measure specific information.
                isNewMeasure = false;
            }
            if (elem.rest === undefined) {
                const midiPitches = elem.elem.midiPitches as unknown as MidiPitches;
                if (midiPitches === undefined) {
                    throw Error("No Midi data for note.");
                }
                // Handles tied notes.
                for (const midiPitch of midiPitches) {
                    const note = abcjs.synth.pitchToNoteName[midiPitch.pitch];
                    if (note === undefined) {
                        throw Error("Unknown Note.");
                    }
                    const pitch = note.slice(0, -1);
                    const height = parseInt(note.charAt(note.length - 1));
                    const flat = note.length > 2 && note.charAt(note.length - 2) === "b";
                    const possible_times: number | number[] = elem.elem.currentTrackMilliseconds;
                    const possible_whole_notes: number | number[] =
                        elem.elem.currentTrackWholeNotes;
                    let trackTime: number;
                    let trackWholeNote = elem.timing;
                    if (typeof possible_times === "number") {
                        trackTime = possible_times;
                        // trackWholeNote = possible_whole_notes as number;
                    } else if (possible_times.length === 1) {
                        trackTime = possible_times[0];
                        // trackWholeNote = (possible_whole_notes as number[])[0];
                    } else {
                        if (!encountered_repeats.has(note)) {
                            encountered_repeats.set(note, new Map<number, number>());
                        }
                        const dict = encountered_repeats.get(note)!;
                        if (!dict.has(possible_times[0])) {
                            dict.set(possible_times[0], 0);
                        }
                        const encounter_idx = dict.get(possible_times[0])!;
                        trackTime = possible_times[encounter_idx];
                        // trackWholeNote = (possible_whole_notes as number[])[encounter_idx];
                        dict.set(possible_times[0], encounter_idx + 1);
                    }
                    notes.push({
                        pitch: pitch,
                        height: height,
                        flat: flat,
                        pitchRawString: note,
                        measureNb: measures.length,
                        beatNb: (trackWholeNote - measureFirstWholeNote) * currentSignatureDen,
                        trackWholeNote: trackWholeNote,
                        timeMilliseconds: trackTime
                    });
                }
            }
        } else if (elem.el_type === "meter") {
            if (isNewMeasure) {
                currentSignatureNum = elem.num;
                currentSignatureDen = elem.den;
            } else {
                throw Error("Signature changes half-way through a measure are forbidden.");
            }
        } else if (elem.el_type === "tempo") {
            if (isNewMeasure) {
                currentBpm = elem.qpm;
            } else {
                throw Error("Tempo changes half-way through a measure are forbidden.");
            }
        } else if (elem.el_type === "bar") {
            measures.push({
                signatureNum: currentSignatureNum,
                signatureDen: currentSignatureDen,
                bpm: currentBpm,
                startWholeNote: measureFirstWholeNote
            });
            //Handle anacrusis
            //TODO : WORKS WITH THE REST ?
            if (measures.length === 1) {
                const pickupLength = tune.getPickupLength();
                for (const note of notes) {
                    note.beatNb =
                        (note.trackWholeNote -
                            measureFirstWholeNote +
                            currentSignatureNum / currentSignatureDen -
                            pickupLength) *
                        currentSignatureDen;
                }
                measureFirstWholeNote += pickupLength;
            } else {
                measureFirstWholeNote += currentSignatureNum / currentSignatureDen;
            }
            isNewMeasure = true;
        } else if (
            [
                "name",
                "key", // Already accounted for by midiPitch
                "transpose",
                "bagpipes",
                "instrument",
                "channel",
                "drum",
                "gchordOn",
                "beat",
                "vol",
                "volinc",
                "beataccents",
                "gchord",
                "bassprog",
                "chordprog",
                "bassvol",
                "chordvol",
                "gchordbars"
            ].includes(elem.el_type)
        ) {
            continue;
        } else {
            throw Error("Unknown element type.");
        }
    }
    return [notes, measures];
}

// Function test

// const danube = `X:1
// T:Untitled score
// C:Composer / arranger
// L:1/4
// Q:1/4=80
// M:4/4
// K:G
// %%stretchlast true
// V:1 treble nm="Flute" snm="Fl."
// %%MIDI program 73
// V:1
//  f z d z |[K:Bb][Q:1/4=180] f z e z |[M:2/4][Q:1/2=180] A d |]
// `;
// const danube2 = `X:1
// L:1/4
// M:4/4
// Q:1/2=100
// K:C
// V:1 treble nm="Flute" snm="Fl."
// V:1
//  |: B c z e :| F G A F |]
// `;
// export function tmp();
// const danube = `X:1
// T:Danube Bleu
// C:Composer / arranger
// %%score [ 1 2 ]
// L:1/4
// Q:1/4=160
// M:3/4
// K:C
// %%stretchlast true
// V:1 treble transpose=12 nm="Juggler 1" snm="J1"
// %%MIDI program 112
// V:2 treble transpose=12 nm="Juggler 2" snm="J2"
// %%MIDI program 112
// V:1
//  C | C E G | G z z | z3 |
//  z z C | C E G | G z z | z3 |
//  z z D | D F A | A z z | z3 |
//  z z D | D F A | A z z | z3 |
//  z z C | C E G | c z z | z3 |
//  z z C | C E G | c z z | z3 |
//  z z D | D F A | A z z | z3 |
//  z3 | z c E | E z z | z3 |
//  z z/ C/ C | C z z | z c B | B A A |
//  z3 | z3 | z D D | E z D |
//  z D D | A z G | z3 | z3 |
//  z A B | d c c | z3 | z3 |
//  z z/ E/ C/A,/ | E/E/ E z | z3 | !arpeggio![Gdg] z z |]
// V:2
//  z | z3 | z z G | G z E |
//  E z z | z3 | z z G | G z F |
//  F z z | z3 | z z A | A z F |
//  F z z | z3 | z z A | A z E |
//  E z z | z3 | z z c | c z G |
//  G z z | z3 | z z c | c z A |
//  A z z | z3 | z3 | z ^F G |
//  e z z | z3 | z z D | A z G |
//  C z z | z3 | z3 | z3 |
//  z A ^G | ^G A A | z3 | z3 |
//  z3 | z3 | z c B | B A A |
//  z3 | z3 | z ^F A | A z G |
//  ^F z z | z z D | G, z z | !arpeggio![G,D] z z |]
// `;
// const danube = `X:1
// T:Untitled score
// C:Composer / arranger
// %%score [ 1 2 ]
// L:1/4
// Q:1/4=160
// M:3/4
// K:C
// %%stretchlast true
// V:1 treble transpose=12 nm="Juggler 1" snm="J1"
// %%MIDI program 112
// V:2 treble transpose=12 nm="Juggler 2" snm="J2"
// %%MIDI program 112
// V:1
//  C | C E G | G z z | z3 |
//  z z C | C E G | G z z | z3 |
//  z z D | D F A | A z z | z3 |
//  z z D | D F A | A z z | z3 |
//  z z C | C E G | c z z | z3 |
//  z z C | C E G | c z z | z3 |
//  z z D | D F A | A z z | z3 |
//  z3 | z c E | E z z | z3 |
//  z z/ C/ C | C z z | z c B | B A A |
//  z3 | z3 | z D D | E z D |
//  z D D | A z G | z3 | z3 |
//  z A B | d c c | z3 | z3 |
//  z z/ E/ C/A,/ | E/E/ E z | z3 | !arpeggio![Gdg] z z |]
// V:2
//  z | z3 | z z G | G z E |
//  E z z | z3 | z z G | G z F |
//  F z z | z3 | z z A | A z F |
//  F z z | z3 | z z A | A z E |
//  E z z | z3 | z z c | c z G |
//  G z z | z3 | z z c | c z A |
//  A z z | z3 | z3 | z ^F G |
//  e z z | z3 | z z D | A z G |
//  C z z | z3 | z3 | z3 |
//  z A ^G | ^G A A | z3 | z3 |
//  z3 | z3 | z c B | B A A |
//  z3 | z3 | z ^F A | A z G |
//  ^F z z | z z D | G, z z | !arpeggio![G,D] z z |]
// `;
// // const danube = `X:1
// // T:Untitled score
// // C:Composer / arranger
// // L:1/4
// // M:4/4
// // Q:1/2=100
// // K:C
// // %%stretchlast true
// // V:1 treble nm="Flute" snm="Fl."
// // %%MIDI program 73
// // V:1
// //  B- | B c- c z |]
// // `

// const tuneObject = abcjs.parseOnly(danube)[0];
// const seq = abcjs.synth.sequence(tuneObject, {});
// console.log(seq);

// // const b = abcjs.synth.flatten(seq);
// // console.log(b);

// // const tuneObject2 = abcjs.parseOnly(danube2)[0];
// // const seq2 = abcjs.synth.sequence(tuneObject2, {});
// // console.log(seq2);

// // const b2 = abcjs.synth.flatten(seq2);
// // console.log(b2);

// const [notes, measures] = parseTune(tuneObject, 0);
// console.log(notes);
// console.log(measures);
// console.log("Fin");
