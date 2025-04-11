// Printing functions for events.
import Fraction from "fraction.js";
import { ParserTossMode } from "../parser/MusicalSiteswap";
import { FracSortedList, Hands, PartialBall, PartialTossMode } from "../inference/Scheduler";
import { MusicBeatConverter } from "../inference/MusicBeatConverter";

type TossType = {
    from: { hand?: "L" | "R"; rightHand?: boolean; juggler?: string; beat?: Fraction };
    to: { hand?: "L" | "R" | "x"; rightHand?: boolean; juggler?: string; beat?: Fraction };
    ball?: { name: string; id?: string } | { nameOrID?: string };
    mode?: ParserTossMode | PartialTossMode;
};

//TODO : Find a way to fuse all similar types ?
type EventType = {
    tosses?: TossType[];
    tempo?: Fraction;
    hands?: Hands<PartialBall> | { old: Hands<PartialBall>; new: Hands<PartialBall> };
    newDefaultHand?: "L" | "R";
};

export function stringifyEvents<T extends EventType>(
    events: FracSortedList<T> | T[],
    musicConverter?: MusicBeatConverter
): string {
    if (events.length === 0) {
        return "";
    }
    let text = "";
    if (Array.isArray(events[0])) {
        for (const [beat, ev] of events as FracSortedList<T>) {
            if (musicConverter === undefined) {
                text += `Beat ${stringifyFraction(beat)}`;
            } else {
                const [measure, relBeat] = musicConverter.convertBeatToMeasure(beat);
                text += `Measure ${measure}, Beat ${stringifyFraction(relBeat)}`;
            }
            text += "\n\t";
            text += stringifyEvent(ev).split("\n").join("\n\t");
            text += "\n";
        }
        return text;
    }
    for (let i = 0; i < events.length; i++) {
        text += `Time ${i}:`;
        text += "\n\t";
        text += stringifyEvent(events[i] as T)
            .split("\n")
            .join("\n\t");
        text += "\n";
    }
    return text;
}

export function stringifyEvent(ev: EventType): string {
    if (
        ev.newDefaultHand === undefined &&
        ev.tosses === undefined &&
        ev.hands === undefined &&
        ev.tempo === undefined
    ) {
        return "Empty Event.";
    }
    let text = "";
    if (ev.newDefaultHand !== undefined) {
        text += `New default hand: ${ev.newDefaultHand}.\n`;
    }
    if (ev.tempo !== undefined) {
        text += `Tempo: ${stringifyFraction(ev.tempo)}.\n`;
    }
    if (ev.hands !== undefined) {
        if (Array.isArray(ev.hands)) {
            text += `New balls in hand:\n\tLeft: ${stringifyHand(ev.hands[0])}.\n\tRight: ${stringifyHand(ev.hands[1])}.\n`;
        } else {
            text += `Old balls in hand:\n\tLeft: ${stringifyHand(ev.hands.old[0])}.\n\tRight: ${stringifyHand(ev.hands.old[1])}.\n`;
            text += `New balls in hand:\n\tLeft: ${stringifyHand(ev.hands.new[0])}.\n\tRight: ${stringifyHand(ev.hands.new[1])}.\n`;
        }
    }
    if (ev.tosses !== undefined && ev.tosses.length > 0) {
        text += stringifyTosses(ev.tosses);
    }
    return text;
}

export function stringifyBall(
    ball: { name?: string; id?: string; nameOrID?: string } | undefined
): string {
    if (ball === undefined) {
        return "Ball";
    }
    if (ball.nameOrID !== undefined) {
        return ball.nameOrID;
    } else if (ball.name !== undefined) {
        let text = ball.name;
        if (ball.id !== undefined) {
            text += ` (ID : ${ball.id})`;
        }
        return text;
    } else if (ball.id !== undefined) {
        return `(ID : ${ball.id})`;
    }
    return "Ball";
}

export function stringifyHand(hand: PartialBall[]): string {
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

export function stringifyHandSide(handSide: "L" | "R" | "x"): string {
    if (handSide === "L") {
        return "left";
    } else if (handSide === "R") {
        return "right";
    } else {
        return "other";
    }
}

export function stringifyToFrom({
    hand,
    rightHand,
    juggler,
    beat
}: {
    hand?: "L" | "R" | "x";
    rightHand?: boolean;
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
    }
    if (beat !== undefined) {
        text += ` (beat ${beat})`;
    }
    return text;
}

export function stringifyToss(toss: TossType): string {
    let text = stringifyBall(toss.ball);
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
        text += ` from ${textFrom}`;
    }
    const textTo = stringifyToFrom(toss.to);
    if (textTo !== "") {
        text += ` to ${textTo}`;
    }
    return text;
}

export function stringifyTosses(tosses: TossType[], showIdx = false): string {
    let text = "";
    text += "Tosses:\n";
    for (let i = 0; i < tosses.length; i++) {
        const toss = tosses[i];
        text += "\t";
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

export function stringifyTable(
    balls: Map<string, { name?: string; id?: string; nameOrID?: string }>
): string {
    let text = "";
    for (const ball of balls.values()) {
        text += `${stringifyBall(ball)}, `;
    }
    return text;
}
