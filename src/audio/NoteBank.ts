import noteA0 from "../assets/notes/A0.mp3";
import noteA0s from "../assets/notes/A0s.mp3";
import noteB0 from "../assets/notes/B0.mp3";
import noteC1 from "../assets/notes/C1.mp3";
import noteC1s from "../assets/notes/C1s.mp3";
import noteD1 from "../assets/notes/D1.mp3";
import noteD1s from "../assets/notes/D1s.mp3";
import noteE1 from "../assets/notes/E1.mp3";
import noteF1 from "../assets/notes/F1.mp3";
import noteF1s from "../assets/notes/F1s.mp3";
import noteG1 from "../assets/notes/G1.mp3";
import noteG1s from "../assets/notes/G1s.mp3";
import noteA1 from "../assets/notes/A1.mp3";
import noteA1s from "../assets/notes/A1s.mp3";
import noteB1 from "../assets/notes/B1.mp3";
import noteC2 from "../assets/notes/C2.mp3";
import noteC2s from "../assets/notes/C2s.mp3";
import noteD2 from "../assets/notes/D2.mp3";
import noteD2s from "../assets/notes/D2s.mp3";
import noteE2 from "../assets/notes/E2.mp3";
import noteF2 from "../assets/notes/F2.mp3";
import noteF2s from "../assets/notes/F2s.mp3";
import noteG2 from "../assets/notes/G2.mp3";
import noteG2s from "../assets/notes/G2s.mp3";
import noteA2 from "../assets/notes/A2.mp3";
import noteA2s from "../assets/notes/A2s.mp3";
import noteB2 from "../assets/notes/B2.mp3";
import noteC3 from "../assets/notes/C3.mp3";
import noteC3s from "../assets/notes/C3s.mp3";
import noteD3 from "../assets/notes/D3.mp3";
import noteD3s from "../assets/notes/D3s.mp3";
import noteE3 from "../assets/notes/E3.mp3";
import noteF3 from "../assets/notes/F3.mp3";
import noteF3s from "../assets/notes/F3s.mp3";
import noteG3 from "../assets/notes/G3.mp3";
import noteG3s from "../assets/notes/G3s.mp3";
import noteA3 from "../assets/notes/A3.mp3";
import noteA3s from "../assets/notes/A3s.mp3";
import noteB3 from "../assets/notes/B3.mp3";
import noteC4 from "../assets/notes/C4.mp3";
import noteC4s from "../assets/notes/C4s.mp3";
import noteD4 from "../assets/notes/D4.mp3";
import noteD4s from "../assets/notes/D4s.mp3";
import noteE4 from "../assets/notes/E4.mp3";
import noteF4 from "../assets/notes/F4.mp3";
import noteF4s from "../assets/notes/F4s.mp3";
import noteG4 from "../assets/notes/G4.mp3";
import noteG4s from "../assets/notes/G4s.mp3";
import noteA4 from "../assets/notes/A4.mp3";
import noteA4s from "../assets/notes/A4s.mp3";
import noteB4 from "../assets/notes/B4.mp3";
import noteC5 from "../assets/notes/C5.mp3";
import noteC5s from "../assets/notes/C5s.mp3";
import noteD5 from "../assets/notes/D5.mp3";
import noteD5s from "../assets/notes/D5s.mp3";
import noteE5 from "../assets/notes/E5.mp3";
import noteF5 from "../assets/notes/F5.mp3";
import noteF5s from "../assets/notes/F5s.mp3";
import noteG5 from "../assets/notes/G5.mp3";
import noteG5s from "../assets/notes/G5s.mp3";
import noteA5 from "../assets/notes/A5.mp3";
import noteA5s from "../assets/notes/A5s.mp3";
import noteB5 from "../assets/notes/B5.mp3";
import noteC6 from "../assets/notes/C6.mp3";
import noteC6s from "../assets/notes/C6s.mp3";
import noteD6 from "../assets/notes/D6.mp3";
import noteD6s from "../assets/notes/D6s.mp3";
import noteE6 from "../assets/notes/E6.mp3";
import noteF6 from "../assets/notes/F6.mp3";
import noteF6s from "../assets/notes/F6s.mp3";
import noteG6 from "../assets/notes/G6.mp3";
import noteG6s from "../assets/notes/G6s.mp3";
import noteA6 from "../assets/notes/A6.mp3";
import noteA6s from "../assets/notes/A6s.mp3";
import noteB6 from "../assets/notes/B6.mp3";
import noteC7 from "../assets/notes/C7.mp3";
import noteC7s from "../assets/notes/C7s.mp3";
import noteD7 from "../assets/notes/D7.mp3";
import noteD7s from "../assets/notes/D7s.mp3";
import noteE7 from "../assets/notes/E7.mp3";
import noteF7 from "../assets/notes/F7.mp3";
import noteF7s from "../assets/notes/F7s.mp3";
import noteG7 from "../assets/notes/G7.mp3";
import noteG7s from "../assets/notes/G7s.mp3";
import noteA7 from "../assets/notes/A7.mp3";
import noteA7s from "../assets/notes/A7s.mp3";
import noteB7 from "../assets/notes/B7.mp3";
//TODO : AudioBuffer or AudioBufferSourceNode ?
//TODO : Change sounds so they are shorter + lighter format.
const notesMap = new Map<string, string>([
    ["A0", noteA0],
    ["A0#", noteA0s],
    ["B0", noteB0],
    ["C1", noteC1],
    ["C1#", noteC1s],
    ["D1", noteD1],
    ["D1#", noteD1s],
    ["E1", noteE1],
    ["F1", noteF1],
    ["F1#", noteF1s],
    ["G1", noteG1],
    ["G1#", noteG1s],
    ["A1", noteA1],
    ["A1#", noteA1s],
    ["B1", noteB1],
    ["C2", noteC2],
    ["C2#", noteC2s],
    ["D2", noteD2],
    ["D2#", noteD2s],
    ["E2", noteE2],
    ["F2", noteF2],
    ["F2#", noteF2s],
    ["G2", noteG2],
    ["G2#", noteG2s],
    ["A2", noteA2],
    ["A2#", noteA2s],
    ["B2", noteB2],
    ["C3", noteC3],
    ["C3#", noteC3s],
    ["D3", noteD3],
    ["D3#", noteD3s],
    ["E3", noteE3],
    ["F3", noteF3],
    ["F3#", noteF3s],
    ["G3", noteG3],
    ["G3#", noteG3s],
    ["A3", noteA3],
    ["A3#", noteA3s],
    ["B3", noteB3],
    ["C4", noteC4],
    ["C4#", noteC4s],
    ["D4", noteD4],
    ["D4#", noteD4s],
    ["E4", noteE4],
    ["F4", noteF4],
    ["F4#", noteF4s],
    ["G4", noteG4],
    ["G4#", noteG4s],
    ["A4", noteA4],
    ["A4#", noteA4s],
    ["B4", noteB4],
    ["C5", noteC5],
    ["C5#", noteC5s],
    ["D5", noteD5],
    ["D5#", noteD5s],
    ["E5", noteE5],
    ["F5", noteF5],
    ["F5#", noteF5s],
    ["G5", noteG5],
    ["G5#", noteG5s],
    ["A5", noteA5],
    ["A5#", noteA5s],
    ["B5", noteB5],
    ["C6", noteC6],
    ["C6#", noteC6s],
    ["D6", noteD6],
    ["D6#", noteD6s],
    ["E6", noteE6],
    ["F6", noteF6],
    ["F6#", noteF6s],
    ["G6", noteG6],
    ["G6#", noteG6s],
    ["A6", noteA6],
    ["A6#", noteA6s],
    ["B6", noteB6],
    ["C7", noteC7],
    ["C7#", noteC7s],
    ["D7", noteD7],
    ["D7#", noteD7s],
    ["E7", noteE7],
    ["F7", noteF7],
    ["F7#", noteF7s],
    ["G7", noteG7],
    ["G7#", noteG7s],
    ["A7", noteA7],
    ["A7#", noteA7s],
    ["B7", noteB7]
]);
interface Note1 {
    alteration?: string;
    pitch: string;
    height: number;
}

interface Note2 {
    isSharp: boolean;
    pitch: string;
    height: number;
}

const pitchMap = new Map<string, string>([
    ["Do", "C"],
    ["Re", "D"],
    ["Mi", "E"],
    ["Fa", "F"],
    ["Sol", "G"],
    ["La", "A"],
    ["Si", "B"],
    ["a", "A"],
    ["b", "B"],
    ["c", "C"],
    ["d", "D"],
    ["e", "E"],
    ["f", "F"],
    ["g", "G"],
    ["A", "A"],
    ["B", "B"],
    ["C", "C"],
    ["D", "D"],
    ["E", "E"],
    ["F", "F"],
    ["G", "G"]
]);

const pianoKeys = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];

const alterations = ["bb", "b", "=", "#", "##", ""];
const heights = ["0", "1", "2", "3", "4", "5", "6", "7"];

//TODO : Add support for abc notation with E e e' e, ...
function gatherNoteInfo(note: string): Note1 | undefined {
    let abcAlteration = false;
    let abcHeight: boolean | undefined = undefined;
    // Phase meanings
    // 0 : ABC Notation alteration (__, _, =, ^, ^^)
    // 1 : Note Pitch (Do, Re, Mi, ...) or ABC Pitch (A, B, a, b, ...)
    // 2 : Normal alteration (bb, b, #, ##)
    // 3 : Height (number or ABC : ' '' , ,, ...)
    let phase = 0;
    let alteration = "";
    let pitch = "";
    let height = 0;

    for (let i = 0; i < note.length; i++) {
        const letter = note[i];
        if (phase === 0) {
            if (letter === "_") {
                abcAlteration = true;
                alteration += "b";
            } else if (letter === "=") {
                abcAlteration = true;
                alteration += "=";
            } else if (letter === "^") {
                abcAlteration = true;
                alteration += "#";
            } else {
                phase = 1;
            }
        }
        if (phase === 1) {
            if (pitchMap.has(note.slice(i, i + 3))) {
                pitch = pitchMap.get(note.slice(i, i + 3))!;
                height = 4;
                i = i + 2;
            } else if (pitchMap.has(note.slice(i, i + 2))) {
                pitch = pitchMap.get(note.slice(i, i + 2))!;
                height = 4;
                i = i + 1;
            } else if (pitchMap.has(note.slice(i, i + 1))) {
                pitch = pitchMap.get(note.slice(i, i + 1))!;
                height = pitch === pitch.toUpperCase() ? 4 : 5;
            } else {
                return undefined;
            }
            phase = 2;
            continue;
        }
        if (phase === 2) {
            if (letter === "b" && !abcAlteration) {
                alteration += "b";
            } else if (letter === "=" && !abcAlteration) {
                alteration += "=";
            } else if (letter === "#" && !abcAlteration) {
                alteration += "#";
            } else {
                phase = 3;
            }
        }
        if (phase === 3) {
            if (abcHeight === undefined) {
                if (letter === "'" || letter === ",") {
                    abcHeight = true;
                } else if (heights.includes(letter)) {
                    abcHeight = false;
                    height = parseInt(letter);
                    continue;
                } else {
                    return undefined;
                }
            }
            if (abcHeight) {
                if (letter === "'") {
                    height++;
                } else if (letter === ",") {
                    height--;
                } else {
                    return undefined;
                }
            } else {
                return undefined;
            }
        }
    }

    if (!alterations.includes(alteration)) {
        return undefined;
    }
    return {
        height: height,
        pitch: pitch,
        alteration: alteration === "=" || alteration === "" ? undefined : alteration
    };
}

function alterationsToSharp(note: Note1 | undefined): Note2 | undefined {
    if (note === undefined) {
        return undefined;
    }
    let idx = pianoKeys.indexOf(note.pitch);
    if (note.alteration === "bb") {
        idx -= 2;
    } else if (note.alteration === "b") {
        idx -= 1;
    } else if (note.alteration === "#") {
        idx += 1;
    } else if (note.alteration === "##") {
        idx += 2;
    } else if (note.alteration !== undefined) {
        return undefined;
    }
    let height = note.height;
    if (idx >= pianoKeys.length) {
        idx -= pianoKeys.length;
        height += 1;
    } else if (idx < 0) {
        idx += pianoKeys.length;
        height -= 1;
    }
    if (idx < 0 || idx >= pianoKeys.length || height < 0 || height >= 8) {
        return undefined;
    }
    const pianoNote = pianoKeys[idx];
    return { height: height, isSharp: pianoNote.length === 2, pitch: pianoNote[0] };
}

function noteToString(note: Note2 | undefined): string {
    if (note === undefined) {
        return "";
    }
    return `${note.pitch}${note.height}${note.isSharp ? "#" : ""}`;
}

export function formatNote(note: string): string {
    return noteToString(alterationsToSharp(gatherNoteInfo(note)));
}

export async function getNoteBuffer(
    note: string,
    audioContext: AudioContext
): Promise<AudioBuffer | undefined> {
    const formattedNote = formatNote(note);
    if (formattedNote === "") {
        console.error(`Name ${note} is not a valid known note name.`);
        return undefined;
    }
    try {
        const response = await fetch(notesMap.get(formattedNote)!);
        return await audioContext.decodeAudioData(await response.arrayBuffer());
    } catch (err) {
        console.error(`Unable to fetch the audio file. Error: ${err}`);
        return undefined;
    }
}

// console.log(formatNote("C"));
// console.log(formatNote("Do"));
// console.log(formatNote("Re5"));
// console.log(formatNote("Mi#5"));
// console.log(formatNote("Fabb5"));
// console.log(formatNote("^E5"));
// console.log(formatNote("__F5"));
// console.log(formatNote("La''"));
// console.log(formatNote("Si,,"));
