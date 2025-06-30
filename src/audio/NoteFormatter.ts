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
