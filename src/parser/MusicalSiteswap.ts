/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { CharStream, CommonTokenStream } from "antlr4";
import MJSiteswapLexer from "./output/MJSiteswapLexer";
import MJSiteswapParser from "./output/MJSiteswapParser";
import MJSiteswapParserVisitor from "./output/MJSiteswapParserVisitor";
import {
    AbsBeatOnlyContext,
    AbsMeasureAndBeatContext,
    AsyncMultiplexContext,
    AsyncTossContext,
    BeatFracContext,
    BeatWholeNumberContext,
    Detailed_tossContext,
    FracContext,
    HeightAccContext,
    HeightBigDigitContext,
    HeightDigitContext,
    MeasureContext,
    NumberContext,
    PatternContext,
    Rel_catchContext,
    Sync_tossContext,
    TossContext,
    TossDetailedContext,
    PatternExpContext,
    PatternParContext,
    PatternTossContext,
    TossVanillaContext
} from "./output/MJSiteswapParser";
import Fraction from "fraction.js";
import { MusicTime } from "../inference/MusicBeatConverter";

//TODO : useRightHand ambiguity : is it in the throws or not ?
// When L/R is specified -> gets fed in the event.
// When sync toss -> gets fed in the toss. RESOLVED. Document somewhere.
//TODO : Make custom class with no mutation ? (but composition)
//By passing time, and returning correct things ?
//TODO : Bug report that tokens may be null and are not marked as null in types.
//TODO : Remove as much as possible from the parser : We can add the tempo later, and filter music / beat later too ?
// What we can do later than parser (possibly changing a bit the format):
// -Check for time requirements (measure and beat / beat)
// -Remove empty events / With height 0 / Caught on same beat as thrown
// What if expend way later on this grammar to add features (inline tempo changes, frac throws etc ?)
//TODO : Get the line / char number also to throw better errors ?
//TODO : Rename MusicTime to smth else ? Measure&Beat ?
//TODO in further checks : Juggler Name + Rel to Abs Beat + Remove empty events (h=0, catchBeat=throwBeat)

export type ParserToss = {
    from: { hand?: "L" | "R" };
    to: { juggler?: string; hand?: "L" | "R" | "x" };
    ball?: { nameOrID: string };
    mode: ParserTossMode;
};

export type ParserTossMode =
    | { type: "Height"; height: number }
    | { type: "AbsBeat"; beat: Fraction }
    | { type: "AbsMeasureBeat"; measureBeat: MusicTime }
    | { type: "RelBeat"; beat: Fraction };

export type ParserJugglingEvent = {
    newDefaultHand?: "L" | "R";
    tosses?: ParserToss[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MJSVisitor extends MJSiteswapParserVisitor<any> {
    events: ParserJugglingEvent[] = [];
    private _lastTossSyncRhythm = false;

    addTossToEvents(tosses: ParserToss[], newDefaultHand?: "L" | "R"): void {
        this.events.push({ newDefaultHand: newDefaultHand, tosses: tosses });
        if (this._lastTossSyncRhythm) {
            this.events.push({});
        }
        this._lastTossSyncRhythm = false;
    }

    visitPattern = (ctx: PatternContext): void => {
        for (const patternAtom of ctx.pattern_atom_list()) {
            this.visit(patternAtom);
        }
    };

    visitPatternToss = (ctx: PatternTossContext): void => {
        this.visit(ctx.toss());
    };

    visitPatternExp = (ctx: PatternExpContext): void => {
        const exp = this.visitNumber(ctx.number_());
        for (let i = 0; i < exp; i++) {
            this.visit(ctx.pattern_atom());
        }
    };

    visitPatternPar = (ctx: PatternParContext): void => {
        for (const patternAtomCtx of ctx.pattern_atom_list()) {
            this.visit(patternAtomCtx);
        }
    };

    visitNumber = (ctx: NumberContext): number => {
        const digits = ctx.DIGIT_list().reverse();
        let acc = 0;
        for (let i = 0; i < digits.length; i++) {
            acc += 10 ** i * parseInt(digits[i].getText());
        }
        return acc;
    };

    visitHeightDigit = (ctx: HeightDigitContext): number => {
        return parseInt(ctx.DIGIT().getText());
    };

    visitHeightBigDigit = (ctx: HeightBigDigitContext): number => {
        // 97 is the ASCII / Unicode code for "a".
        // We map "a" to 10, "b" to 11, ...
        return ctx.BIG_HEIGHT_DIGIT().getText().charCodeAt(0) - 87;
    };

    visitHeightAcc = (ctx: HeightAccContext): number => {
        return this.visitNumber(ctx.number_());
    };

    visitTossVanilla = (ctx: TossVanillaContext): ParserToss => {
        const ballNameOrID: string | undefined = ctx.NAME()?.getText();
        const toHand = ctx.X_MOD() !== null ? "x" : undefined;
        const height = this.visit(ctx.height()) as number;
        return {
            from: {},
            to: { hand: toHand },
            ball: { nameOrID: ballNameOrID },
            mode: { type: "Height", height: height }
        };
    };

    visitTossDetailed = (ctx: TossDetailedContext): ParserToss => {
        return this.visit(ctx.detailed_toss()) as ParserToss;
    };

    visitAsyncToss = (ctx: AsyncTossContext): ParserToss[] => {
        return [this.visit(ctx.toss_info()) as ParserToss];
    };

    visitAsyncMultiplex = (ctx: AsyncMultiplexContext): ParserToss[] => {
        const tosses: ParserToss[] = [];
        for (const toss of ctx.toss_info_list()) {
            tosses.push(this.visit(toss) as ParserToss);
        }
        return tosses;
    };

    visitSync_toss = (ctx: Sync_tossContext): ParserToss[] => {
        const asyncTossLeft = this.visit(ctx.async_toss(0)) as ParserToss[];
        const asyncTossRight = this.visit(ctx.async_toss(1)) as ParserToss[];
        this._lastTossSyncRhythm = ctx.EXCL() === null;
        for (const toss of asyncTossLeft) {
            toss.from.hand = "L";
        }
        for (const toss of asyncTossRight) {
            toss.from.hand = "R";
        }
        return asyncTossLeft.concat(asyncTossRight);
    };

    visitToss = (ctx: TossContext): void => {
        const newDefaultHand = ctx.HAND_MOD()?.getText() as undefined | "L" | "R";
        const tosses = this.visit(ctx.getChild(ctx.getChildCount() - 1)) as ParserToss[];
        this.addTossToEvents(tosses, newDefaultHand);
    };

    visitMeasure = (ctx: MeasureContext): number => {
        return this.visit(ctx.number_()) as number;
    };

    visitFrac = (ctx: FracContext): Fraction => {
        const num = this.visit(ctx.number_(0)) as number;
        const den = this.visit(ctx.number_(1)) as number;
        return new Fraction(num, den);
    };

    visitBeatFrac = (ctx: BeatFracContext): Fraction => {
        return this.visit(ctx.frac()) as Fraction;
    };

    visitBeatWholeNumber = (ctx: BeatWholeNumberContext): Fraction => {
        return new Fraction(this.visit(ctx.number_()) as number);
    };

    visitAbsMeasureAndBeat = (ctx: AbsMeasureAndBeatContext): MusicTime => {
        const measure = this.visit(ctx.measure()) as number;
        const beat = this.visit(ctx.beat()) as Fraction;
        return [measure, beat];
    };

    visitAbsBeatOnly = (ctx: AbsBeatOnlyContext): Fraction => {
        return this.visit(ctx.beat()) as Fraction;
    };

    visitRel_catch = (ctx: Rel_catchContext): Fraction => {
        return this.visit(ctx.beat()) as Fraction;
    };

    visitDetailed_toss = (ctx: Detailed_tossContext): ParserToss => {
        const names = ctx.NAME_list();
        let namesIdx = 0;
        let ballNameOrID: string | undefined = undefined;
        let toJuggler: string | undefined = undefined;
        if (ctx._ball !== undefined) {
            ballNameOrID = names[namesIdx].getText();
            namesIdx++;
        }
        if (ctx._toJuggler !== undefined) {
            toJuggler = names[namesIdx].getText();
            namesIdx++;
        }
        let tossMode: ParserTossMode;
        if (ctx.height() !== null) {
            tossMode = { type: "Height", height: this.visit(ctx.height()) as number };
        } else if (ctx.abs_catch() !== null) {
            const absTime = this.visit(ctx.abs_catch()) as Fraction | MusicTime;
            if (Array.isArray(absTime)) {
                tossMode = { type: "AbsMeasureBeat", measureBeat: absTime };
            } else {
                tossMode = { type: "AbsBeat", beat: absTime };
            }
        } else {
            tossMode = { type: "RelBeat", beat: this.visit(ctx.rel_catch()) as Fraction };
        }
        let toHand: "L" | "R" | "x" | undefined;
        if (ctx.HAND_MOD() !== null) {
            toHand = ctx.HAND_MOD().getText() as "L" | "R";
        } else if (ctx.X_MOD() !== null) {
            toHand = "x";
        } else {
            toHand = undefined;
        }
        return {
            from: {},
            to: { hand: toHand, juggler: toJuggler },
            ball: ballNameOrID === undefined ? undefined : { nameOrID: ballNameOrID },
            mode: tossMode
        };
    };
}

export function parseMusicalSiteswap(pattern: string): ParserJugglingEvent[] {
    const chars = new CharStream(pattern); // replace this with a FileStream as required
    const lexer = new MJSiteswapLexer(chars);
    const tokens = new CommonTokenStream(lexer);
    const parser = new MJSiteswapParser(tokens);
    const tree = parser.pattern();
    const visitor = new MJSVisitor();
    tree.accept(visitor);
    return visitor.events;
}

// Testing
// import { stringifyEvents } from "../../utils/stringifyEvent";
// const input = "3";
// const input = "L404[Sol4 Do'5]1";
// const input = "{Do B5/4 Vincent x} {Do +B3/4 Vincent x} {Re 3 L}";
// const input = "R3 (1x {12} e)^3 (4,[82x]) (1, 0)! L5x 7";
// const input = "{M1B1/4}303{Do M3B1/3}";
// console.log(stringifyEvents(parseMusicalSiteswap(input)));
