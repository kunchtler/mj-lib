// Printing functions for events.
import Fraction from "fraction.js";
import { ParserTossMode } from "../parser/MusicalSiteswap";
import { Hands, LocType, SymbolicTimeline, TossMode } from "../inference/Scheduler";
import { ScoreConverter } from "../inference/ScoreConverter";
import { BallID, JugglerState } from "../inference/Scheduler";
import { TossEvent } from "../model";

type TossType = {
    from: {
        hand?: "L" | "R";
        rightHand?: boolean;
        handIdx?: number;
        ballIdx?: number;
        juggler?: string;
        beat?: Fraction;
    };
    to: {
        hand?: "L" | "R" | "x";
        rightHand?: boolean;
        handIdx?: number;
        ballIdx?: number;
        juggler?: string;
        beat?: Fraction;
    };
    ball?: { name: string; id?: string } | { nameOrID?: string } | string;
    ballID?: string;
    mode?: ParserTossMode | TossMode;
};

//TODO : Find a way to fuse all similar types ?
// type EventType = {
//     tosses?: TossType[];
//     tempo?: Fraction;
//     hands?: Hands<PartialBall> | { old: Hands<PartialBall>; new: Hands<PartialBall> };
//     newDefaultHand?: "L" | "R";
// };

// export function stringifyEvents<T extends EventType>(
//     events: FracSortedList<T> | T[],
//     musicConverter?: ScoreConverter
// ): string {
//     if (events.length === 0) {
//         return "";
//     }
//     let text = "";
//     if (Array.isArray(events[0])) {
//         for (const [beat, ev] of events as FracSortedList<T>) {
//             if (musicConverter === undefined) {
//                 text += `Beat ${stringifyFraction(beat)}`;
//             } else {
//                 const [measure, relBeat] = musicConverter.convertBeatToMeasure(beat);
//                 text += `Measure ${measure}, Beat ${stringifyFraction(relBeat)}`;
//             }
//             text += "\n\t";
//             text += stringifyEvent(ev).split("\n").join("\n\t");
//             text += "\n";
//         }
//         return text;
//     }
//     for (let i = 0; i < events.length; i++) {
//         text += `Time ${i}:`;
//         text += "\n\t";
//         text += stringifyEvent(events[i] as T)
//             .split("\n")
//             .join("\n\t");
//         text += "\n";
//     }
//     return text;
// }

// export function stringifyEvent(ev: EventType): string {
//     if (
//         ev.newDefaultHand === undefined &&
//         ev.tosses === undefined &&
//         ev.hands === undefined &&
//         ev.tempo === undefined
//     ) {
//         return "Empty Event.";
//     }
//     let text = "";
//     if (ev.newDefaultHand !== undefined) {
//         text += `New default hand: ${ev.newDefaultHand}.\n`;
//     }
//     if (ev.tempo !== undefined) {
//         text += `Tempo: ${stringifyFraction(ev.tempo)}.\n`;
//     }
//     if (ev.hands !== undefined) {
//         if (Array.isArray(ev.hands)) {
//             text += `New balls in hand:\n\tLeft: ${stringifyHand(ev.hands[0])}.\n\tRight: ${stringifyHand(ev.hands[1])}.\n`;
//         } else {
//             text += `Old balls in hand:\n\tLeft: ${stringifyHand(ev.hands.old[0])}.\n\tRight: ${stringifyHand(ev.hands.old[1])}.\n`;
//             text += `New balls in hand:\n\tLeft: ${stringifyHand(ev.hands.new[0])}.\n\tRight: ${stringifyHand(ev.hands.new[1])}.\n`;
//         }
//     }
//     if (ev.tosses !== undefined && ev.tosses.length > 0) {
//         text += stringifyTosses(ev.tosses);
//     }
//     return text;
// }

export function stringifyEvent(ev: SymbolicTimeline<Fraction>, writeTitle = true): string {
    let text = writeTitle ? `Event Beat ${ev.beat}:\n` : "";
    text += `  Tempo: ${stringifyFraction(ev.tempo)}\n`;
    if (ev.setup !== undefined) {
        text += "  Ball changes:\n";
        for (const move of ev.setup) {
            text += `    Ball ${move.id} `;
            if (move.from.type === "held") {
                text += `in ${move.from.handIdx === 0 ? "right" : "left"} hand (position ${move.from.ballIdx})`;
            } else if (move.from.type === "onTableSpot") {
                text += `on table (spot ${move.from.spotName})`;
            } else {
                text += `on table (no spot)`;
            }

            text += ` goes to `;
            if (move.to.type === "held") {
                text += `${move.to.handIdx === 0 ? "right" : "left"} hand (position ${move.to.ballIdx})`;
            } else if (move.to.type === "onTableSpot") {
                text += `table (spot ${move.to.spotName})`;
            } else {
                text += `table (no spot)`;
            }
            text += ".\n";
        }
    }
    if (ev.tosses.length > 0) {
        text += "  " + indentString(stringifyTosses(ev.tosses), 2, false);
    }
    return text;
}

export function stringifyBall(
    ball: { name?: string; id?: string; nameOrID?: string } | string | undefined
): string {
    if (ball === undefined) {
        return "Ball";
    }
    if (typeof ball === "string") {
        return "Ball " + ball;
    }
    if (ball.nameOrID !== undefined) {
        return ball.nameOrID;
    } else if (ball.name !== undefined) {
        let text = ball.name;
        if (ball.id !== undefined) {
            text += ` (ID: ${ball.id})`;
        }
        return text;
    } else if (ball.id !== undefined) {
        return `(ID: ${ball.id})`;
    }
    return "Ball";
}

export function stringifyHand(hand: BallID[]): string {
    if (hand.length === 0) {
        return "Empty";
    }
    let text = "";
    for (let i = 0; i < hand.length; i++) {
        text += stringifyBall(hand[i]);
        if (i < hand.length - 1) {
            text += ", ";
        }
    }
    return text;
}

export function stringifyFraction(f: Fraction, den?: number): string {
    if (den !== undefined) {
        return `${(Number(f.n) / Number(f.d)) * den}/${den}`;
    }
    if (f.n === 0n) {
        return "0";
    }
    if (f.d === 1n) {
        return f.n.toString();
    }
    return `${f.n}/${f.d}`;
}

export function stringifyHandSide(handSide: "L" | "R" | "x" | number): string {
    if (handSide === "L" || handSide === 0) {
        return "left";
    } else if (handSide === "R" || handSide === 1) {
        return "right";
    } else {
        return "other";
    }
}

export function stringifyToFrom({
    hand,
    rightHand,
    handIdx,
    ballIdx,
    juggler,
    beat
}: {
    hand?: "L" | "R" | "x";
    rightHand?: boolean;
    handIdx?: number;
    ballIdx?: number;
    juggler?: string;
    beat?: Fraction;
}): string {
    let text = "";
    if (juggler !== undefined) {
        text += juggler;
    }
    let handSide: "L" | "R" | "x" | undefined;
    if (rightHand !== undefined) {
        handSide = rightHand ? "R" : "L";
    } else {
        handSide = hand;
    }
    if (handSide !== undefined) {
        const fromJugglerText = text === "" ? "" : "'s";
        text += `${fromJugglerText} ${stringifyHandSide(handSide)} hand`;
    } else if (handIdx !== undefined && ballIdx !== undefined) {
        const fromJugglerText = text === "" ? "" : "'s";
        text += `${fromJugglerText} ${stringifyHandSide(handIdx)} hand pos ${ballIdx}`;
    }
    if (beat !== undefined) {
        text += ` (beat ${beat})`;
    }
    return text;
}

export function stringifyToss(toss: TossType): string {
    let text = "";
    if (toss.ball !== undefined) {
        text += stringifyBall(toss.ball);
    } else if (toss.ballID !== undefined) {
        text += stringifyBall(toss.ballID);
    } else {
        text += "Ball";
    }
    if (toss.mode === undefined) {
        text += "";
    } else if (toss.mode.type === "Height") {
        text += ` tossed at height ${toss.mode.height}`;
    } else if (toss.mode.type === "AbsBeat" || toss.mode.type === "Beat") {
        text += ` tossed to beat ${stringifyFraction(toss.mode.beat)}`;
    } else if (toss.mode.type === "AbsMeasureBeat") {
        const [measure, beat] = toss.mode.measureBeat;
        text += ` tossed to measure ${measure} beat ${stringifyFraction(beat)}`;
    } else {
        text += ` tossed to be caught in ${stringifyFraction(toss.mode.beat)} beats`;
    }
    const textFrom = stringifyToFrom(toss.from);
    if (textFrom !== "") {
        text += `\n    from ${textFrom}`;
    }
    const textTo = stringifyToFrom(toss.to);
    if (textTo !== "") {
        text += `\n    to ${textTo}`;
    }
    return text;
}

export function stringifyTosses(tosses: TossType[], showIdx = false): string {
    let text = "";
    text += "Tosses:\n";
    for (let i = 0; i < tosses.length; i++) {
        const toss = tosses[i];
        text += "  ";
        if (showIdx) {
            text += `Toss ${i}: `;
        }
        text += `${stringifyToss(toss)}.`;
        if (i < tosses.length - 1) {
            text += "\n";
        }
    }
    return text;
}

export function stringifyTable(table: {
    namedSpot: Map<string, BallID | undefined>;
    unknown: Set<BallID>;
}): string {
    let text = "";
    // Use this array to sport alphabetically the spots names.
    const spotsArr: [string, string | undefined][] = [];
    for (const [spot, ball] of table.namedSpot) {
        spotsArr.push([spot, ball]);
    }
    spotsArr.sort((a, b) => {
        if (a[0] === b[0]) {
            return 0;
        } else if (a[0] > b[0]) {
            return 1;
        } else {
            return -1;
        }
    });

    for (const [spot, ball] of spotsArr) {
        text += `Spot ${spot}: `;
        if (ball !== undefined) {
            text += `${stringifyBall(ball)}\n`;
        } else {
            text += "/";
        }
    }
    text = text.slice(0, -1);
    if (table.unknown.size !== 0) {
        text += "\nUnnamed spot: ";
        for (const ball of table.unknown) {
            text += `${stringifyBall(ball)}, `;
        }
        text = text.slice(0, -2);
        // text += ".";
    }
    return text;
}

/**
 * Add tabulations at the start of each line of a string.
 * @param text the string to add tabs to.
 * @param spaceAmount the number of tabs to insert.
 * @param onFirstLine whether the first line of text should be tabulated.
 * @returns the tabulated string.
 */
export function indentString(text: string, spaceAmount: number, onFirstLine: boolean): string {
    return (
        " ".repeat(onFirstLine ? spaceAmount : 0) +
        text.split("\n").join("\n" + " ".repeat(spaceAmount))
    );
}

export function stringifyState(
    state: JugglerState,
    beat: Fraction | number,
    writeTitle = true
): string {
    if (typeof beat === "number") {
        beat = new Fraction(beat);
    }
    let text = writeTitle ? `State Beat ${beat.toString()}:\n` : "";
    if (state.airborne.size !== 0) {
        text += "  Airborne:\n";
        for (const [ballID, { catchBeat, toRightHand }] of state.airborne) {
            text += `    Ball ${ballID} at height ${catchBeat.sub(beat).toString()} (to ${toRightHand ? "right" : "left"} hand)\n`;
        }
    }
    text += `  Left hand: ${stringifyHand(state.held[0])}\n  Right hand: ${stringifyHand(state.held[1])}\n`;
    if (state.table !== undefined) {
        text += `  Table:\n${indentString(stringifyTable(state.table), 4, true)}`;
    }
    return text;
}

export function stringifyStateEvent(
    beat: Fraction,
    state?: JugglerState,
    ev?: SymbolicTimeline<Fraction>
): string {
    let text = `On beat ${beat.toString()}:\n`;
    if (state === undefined && ev === undefined) {
        text += "  Nothing.";
        return text;
    }
    if (state !== undefined) {
        text += `State:\n${stringifyState(state, beat, false)}\n`;
    }
    if (ev !== undefined) {
        text += `Events:\n${stringifyEvent(ev, false)}`;
    }
    return text;
}
