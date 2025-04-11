// Generated from MJSiteswapParser.g4 by ANTLR 4.13.2

import {ParseTreeVisitor} from 'antlr4';


import { PatternContext } from "./MJSiteswapParser.js";
import { PatternTossContext } from "./MJSiteswapParser.js";
import { PatternExpContext } from "./MJSiteswapParser.js";
import { PatternParContext } from "./MJSiteswapParser.js";
import { NumberContext } from "./MJSiteswapParser.js";
import { HeightDigitContext } from "./MJSiteswapParser.js";
import { HeightBigDigitContext } from "./MJSiteswapParser.js";
import { HeightAccContext } from "./MJSiteswapParser.js";
import { TossVanillaContext } from "./MJSiteswapParser.js";
import { TossDetailedContext } from "./MJSiteswapParser.js";
import { AsyncTossContext } from "./MJSiteswapParser.js";
import { AsyncMultiplexContext } from "./MJSiteswapParser.js";
import { Sync_tossContext } from "./MJSiteswapParser.js";
import { TossContext } from "./MJSiteswapParser.js";
import { MeasureContext } from "./MJSiteswapParser.js";
import { FracContext } from "./MJSiteswapParser.js";
import { BeatFracContext } from "./MJSiteswapParser.js";
import { BeatWholeNumberContext } from "./MJSiteswapParser.js";
import { AbsMeasureAndBeatContext } from "./MJSiteswapParser.js";
import { AbsBeatOnlyContext } from "./MJSiteswapParser.js";
import { Rel_catchContext } from "./MJSiteswapParser.js";
import { Detailed_tossContext } from "./MJSiteswapParser.js";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `MJSiteswapParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class MJSiteswapParserVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.pattern`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPattern?: (ctx: PatternContext) => Result;
	/**
	 * Visit a parse tree produced by the `PatternToss`
	 * labeled alternative in `MJSiteswapParser.pattern_atom`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPatternToss?: (ctx: PatternTossContext) => Result;
	/**
	 * Visit a parse tree produced by the `PatternExp`
	 * labeled alternative in `MJSiteswapParser.pattern_atom`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPatternExp?: (ctx: PatternExpContext) => Result;
	/**
	 * Visit a parse tree produced by the `PatternPar`
	 * labeled alternative in `MJSiteswapParser.pattern_atom`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitPatternPar?: (ctx: PatternParContext) => Result;
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.number`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNumber?: (ctx: NumberContext) => Result;
	/**
	 * Visit a parse tree produced by the `HeightDigit`
	 * labeled alternative in `MJSiteswapParser.height`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitHeightDigit?: (ctx: HeightDigitContext) => Result;
	/**
	 * Visit a parse tree produced by the `HeightBigDigit`
	 * labeled alternative in `MJSiteswapParser.height`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitHeightBigDigit?: (ctx: HeightBigDigitContext) => Result;
	/**
	 * Visit a parse tree produced by the `HeightAcc`
	 * labeled alternative in `MJSiteswapParser.height`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitHeightAcc?: (ctx: HeightAccContext) => Result;
	/**
	 * Visit a parse tree produced by the `TossVanilla`
	 * labeled alternative in `MJSiteswapParser.toss_info`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTossVanilla?: (ctx: TossVanillaContext) => Result;
	/**
	 * Visit a parse tree produced by the `TossDetailed`
	 * labeled alternative in `MJSiteswapParser.toss_info`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTossDetailed?: (ctx: TossDetailedContext) => Result;
	/**
	 * Visit a parse tree produced by the `AsyncToss`
	 * labeled alternative in `MJSiteswapParser.async_toss`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAsyncToss?: (ctx: AsyncTossContext) => Result;
	/**
	 * Visit a parse tree produced by the `AsyncMultiplex`
	 * labeled alternative in `MJSiteswapParser.async_toss`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAsyncMultiplex?: (ctx: AsyncMultiplexContext) => Result;
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.sync_toss`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSync_toss?: (ctx: Sync_tossContext) => Result;
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.toss`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitToss?: (ctx: TossContext) => Result;
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.measure`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitMeasure?: (ctx: MeasureContext) => Result;
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.frac`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitFrac?: (ctx: FracContext) => Result;
	/**
	 * Visit a parse tree produced by the `BeatFrac`
	 * labeled alternative in `MJSiteswapParser.beat`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeatFrac?: (ctx: BeatFracContext) => Result;
	/**
	 * Visit a parse tree produced by the `BeatWholeNumber`
	 * labeled alternative in `MJSiteswapParser.beat`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBeatWholeNumber?: (ctx: BeatWholeNumberContext) => Result;
	/**
	 * Visit a parse tree produced by the `AbsMeasureAndBeat`
	 * labeled alternative in `MJSiteswapParser.abs_catch`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAbsMeasureAndBeat?: (ctx: AbsMeasureAndBeatContext) => Result;
	/**
	 * Visit a parse tree produced by the `AbsBeatOnly`
	 * labeled alternative in `MJSiteswapParser.abs_catch`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitAbsBeatOnly?: (ctx: AbsBeatOnlyContext) => Result;
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.rel_catch`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRel_catch?: (ctx: Rel_catchContext) => Result;
	/**
	 * Visit a parse tree produced by `MJSiteswapParser.detailed_toss`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDetailed_toss?: (ctx: Detailed_tossContext) => Result;
}

