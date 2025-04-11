// Generated from MJSiteswapParser.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
import MJSiteswapParserVisitor from "./MJSiteswapParserVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class MJSiteswapParser extends Parser {
	public static readonly DIGIT = 1;
	public static readonly BIG_HEIGHT_DIGIT = 2;
	public static readonly LCUR = 3;
	public static readonly RCUR = 4;
	public static readonly REP = 5;
	public static readonly LPAR = 6;
	public static readonly RPAR = 7;
	public static readonly LSQU = 8;
	public static readonly RSQU = 9;
	public static readonly X_MOD = 10;
	public static readonly HAND_MOD = 11;
	public static readonly COMMA = 12;
	public static readonly EXCL = 13;
	public static readonly PLUS = 14;
	public static readonly BEAT = 15;
	public static readonly MEASURE = 16;
	public static readonly COMMENT = 17;
	public static readonly DIV = 18;
	public static readonly NAME = 19;
	public static readonly WS = 20;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_pattern = 0;
	public static readonly RULE_pattern_atom = 1;
	public static readonly RULE_number = 2;
	public static readonly RULE_height = 3;
	public static readonly RULE_toss_info = 4;
	public static readonly RULE_async_toss = 5;
	public static readonly RULE_sync_toss = 6;
	public static readonly RULE_toss = 7;
	public static readonly RULE_measure = 8;
	public static readonly RULE_frac = 9;
	public static readonly RULE_beat = 10;
	public static readonly RULE_abs_catch = 11;
	public static readonly RULE_rel_catch = 12;
	public static readonly RULE_detailed_toss = 13;
	public static readonly literalNames: (string | null)[] = [ null, null, 
                                                            null, "'{'", 
                                                            "'}'", "'^'", 
                                                            "'('", "')'", 
                                                            "'['", "']'", 
                                                            "'x'", null, 
                                                            "','", "'!'", 
                                                            "'+'", "'B'", 
                                                            "'M'", null, 
                                                            "'/'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "DIGIT", 
                                                             "BIG_HEIGHT_DIGIT", 
                                                             "LCUR", "RCUR", 
                                                             "REP", "LPAR", 
                                                             "RPAR", "LSQU", 
                                                             "RSQU", "X_MOD", 
                                                             "HAND_MOD", 
                                                             "COMMA", "EXCL", 
                                                             "PLUS", "BEAT", 
                                                             "MEASURE", 
                                                             "COMMENT", 
                                                             "DIV", "NAME", 
                                                             "WS" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"pattern", "pattern_atom", "number", "height", "toss_info", "async_toss", 
		"sync_toss", "toss", "measure", "frac", "beat", "abs_catch", "rel_catch", 
		"detailed_toss",
	];
	public get grammarFileName(): string { return "MJSiteswapParser.g4"; }
	public get literalNames(): (string | null)[] { return MJSiteswapParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return MJSiteswapParser.symbolicNames; }
	public get ruleNames(): string[] { return MJSiteswapParser.ruleNames; }
	public get serializedATN(): number[] { return MJSiteswapParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, MJSiteswapParser._ATN, MJSiteswapParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public pattern(): PatternContext {
		let localctx: PatternContext = new PatternContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, MJSiteswapParser.RULE_pattern);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 31;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 526670) !== 0)) {
				{
				{
				this.state = 28;
				this.pattern_atom(0);
				}
				}
				this.state = 33;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public pattern_atom(): Pattern_atomContext;
	public pattern_atom(_p: number): Pattern_atomContext;
	// @RuleVersion(0)
	public pattern_atom(_p?: number): Pattern_atomContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: Pattern_atomContext = new Pattern_atomContext(this, this._ctx, _parentState);
		let _prevctx: Pattern_atomContext = localctx;
		let _startState: number = 2;
		this.enterRecursionRule(localctx, 2, MJSiteswapParser.RULE_pattern_atom, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 44;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 2, this._ctx) ) {
			case 1:
				{
				localctx = new PatternTossContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 35;
				this.toss();
				}
				break;
			case 2:
				{
				localctx = new PatternParContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 36;
				this.match(MJSiteswapParser.LPAR);
				this.state = 38;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				do {
					{
					{
					this.state = 37;
					this.pattern_atom(0);
					}
					}
					this.state = 40;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				} while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 526670) !== 0));
				this.state = 42;
				this.match(MJSiteswapParser.RPAR);
				}
				break;
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 57;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					{
					localctx = new PatternExpContext(this, new Pattern_atomContext(this, _parentctx, _parentState));
					this.pushNewRecursionContext(localctx, _startState, MJSiteswapParser.RULE_pattern_atom);
					this.state = 46;
					if (!(this.precpred(this._ctx, 1))) {
						throw this.createFailedPredicateException("this.precpred(this._ctx, 1)");
					}
					this.state = 47;
					this.match(MJSiteswapParser.REP);
					this.state = 53;
					this._errHandler.sync(this);
					switch (this._input.LA(1)) {
					case 1:
						{
						this.state = 48;
						this.number_();
						}
						break;
					case 6:
						{
						this.state = 49;
						this.match(MJSiteswapParser.LPAR);
						this.state = 50;
						this.number_();
						this.state = 51;
						this.match(MJSiteswapParser.RPAR);
						}
						break;
					default:
						throw new NoViableAltException(this);
					}
					}
					}
				}
				this.state = 59;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public number_(): NumberContext {
		let localctx: NumberContext = new NumberContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, MJSiteswapParser.RULE_number);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 61;
			this._errHandler.sync(this);
			_alt = 1;
			do {
				switch (_alt) {
				case 1:
					{
					{
					this.state = 60;
					this.match(MJSiteswapParser.DIGIT);
					}
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				this.state = 63;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 5, this._ctx);
			} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public height(): HeightContext {
		let localctx: HeightContext = new HeightContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, MJSiteswapParser.RULE_height);
		try {
			this.state = 71;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 1:
				localctx = new HeightDigitContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 65;
				this.match(MJSiteswapParser.DIGIT);
				}
				break;
			case 2:
				localctx = new HeightBigDigitContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 66;
				this.match(MJSiteswapParser.BIG_HEIGHT_DIGIT);
				}
				break;
			case 3:
				localctx = new HeightAccContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 67;
				this.match(MJSiteswapParser.LCUR);
				this.state = 68;
				this.number_();
				this.state = 69;
				this.match(MJSiteswapParser.RCUR);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public toss_info(): Toss_infoContext {
		let localctx: Toss_infoContext = new Toss_infoContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, MJSiteswapParser.RULE_toss_info);
		let _la: number;
		try {
			this.state = 81;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 9, this._ctx) ) {
			case 1:
				localctx = new TossVanillaContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 74;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===19) {
					{
					this.state = 73;
					this.match(MJSiteswapParser.NAME);
					}
				}

				this.state = 76;
				this.height();
				this.state = 78;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 8, this._ctx) ) {
				case 1:
					{
					this.state = 77;
					this.match(MJSiteswapParser.X_MOD);
					}
					break;
				}
				}
				break;
			case 2:
				localctx = new TossDetailedContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 80;
				this.detailed_toss();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public async_toss(): Async_tossContext {
		let localctx: Async_tossContext = new Async_tossContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, MJSiteswapParser.RULE_async_toss);
		let _la: number;
		try {
			this.state = 92;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 1:
			case 2:
			case 3:
			case 19:
				localctx = new AsyncTossContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 83;
				this.toss_info();
				}
				break;
			case 8:
				localctx = new AsyncMultiplexContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				{
				this.state = 84;
				this.match(MJSiteswapParser.LSQU);
				this.state = 86;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				do {
					{
					{
					this.state = 85;
					this.toss_info();
					}
					}
					this.state = 88;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				} while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 524302) !== 0));
				this.state = 90;
				this.match(MJSiteswapParser.RSQU);
				}
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public sync_toss(): Sync_tossContext {
		let localctx: Sync_tossContext = new Sync_tossContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, MJSiteswapParser.RULE_sync_toss);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 94;
			this.match(MJSiteswapParser.LPAR);
			this.state = 95;
			this.async_toss();
			this.state = 96;
			this.match(MJSiteswapParser.COMMA);
			this.state = 97;
			this.async_toss();
			this.state = 98;
			this.match(MJSiteswapParser.RPAR);
			this.state = 100;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				{
				this.state = 99;
				this.match(MJSiteswapParser.EXCL);
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public toss(): TossContext {
		let localctx: TossContext = new TossContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, MJSiteswapParser.RULE_toss);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 103;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===11) {
				{
				this.state = 102;
				this.match(MJSiteswapParser.HAND_MOD);
				}
			}

			this.state = 107;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 1:
			case 2:
			case 3:
			case 8:
			case 19:
				{
				this.state = 105;
				this.async_toss();
				}
				break;
			case 6:
				{
				this.state = 106;
				this.sync_toss();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public measure(): MeasureContext {
		let localctx: MeasureContext = new MeasureContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, MJSiteswapParser.RULE_measure);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 109;
			this.match(MJSiteswapParser.MEASURE);
			this.state = 110;
			this.number_();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public frac(): FracContext {
		let localctx: FracContext = new FracContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, MJSiteswapParser.RULE_frac);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 112;
			this.number_();
			this.state = 113;
			this.match(MJSiteswapParser.DIV);
			this.state = 114;
			this.number_();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public beat(): BeatContext {
		let localctx: BeatContext = new BeatContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, MJSiteswapParser.RULE_beat);
		try {
			this.state = 120;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 15, this._ctx) ) {
			case 1:
				localctx = new BeatFracContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 116;
				this.match(MJSiteswapParser.BEAT);
				this.state = 117;
				this.frac();
				}
				break;
			case 2:
				localctx = new BeatWholeNumberContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 118;
				this.match(MJSiteswapParser.BEAT);
				this.state = 119;
				this.number_();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public abs_catch(): Abs_catchContext {
		let localctx: Abs_catchContext = new Abs_catchContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, MJSiteswapParser.RULE_abs_catch);
		try {
			this.state = 126;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 16:
				localctx = new AbsMeasureAndBeatContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 122;
				this.measure();
				this.state = 123;
				this.beat();
				}
				break;
			case 15:
				localctx = new AbsBeatOnlyContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 125;
				this.beat();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public rel_catch(): Rel_catchContext {
		let localctx: Rel_catchContext = new Rel_catchContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, MJSiteswapParser.RULE_rel_catch);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 128;
			this.match(MJSiteswapParser.PLUS);
			this.state = 129;
			this.beat();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public detailed_toss(): Detailed_tossContext {
		let localctx: Detailed_tossContext = new Detailed_tossContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, MJSiteswapParser.RULE_detailed_toss);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 131;
			this.match(MJSiteswapParser.LCUR);
			this.state = 133;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===19) {
				{
				this.state = 132;
				localctx._ball = this.match(MJSiteswapParser.NAME);
				}
			}

			this.state = 138;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 1:
			case 2:
			case 3:
				{
				this.state = 135;
				this.height();
				}
				break;
			case 15:
			case 16:
				{
				this.state = 136;
				this.abs_catch();
				}
				break;
			case 14:
				{
				this.state = 137;
				this.rel_catch();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this.state = 141;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===19) {
				{
				this.state = 140;
				localctx._toJuggler = this.match(MJSiteswapParser.NAME);
				}
			}

			this.state = 144;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===10 || _la===11) {
				{
				this.state = 143;
				_la = this._input.LA(1);
				if(!(_la===10 || _la===11)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
			}

			this.state = 146;
			this.match(MJSiteswapParser.RCUR);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 1:
			return this.pattern_atom_sempred(localctx as Pattern_atomContext, predIndex);
		}
		return true;
	}
	private pattern_atom_sempred(localctx: Pattern_atomContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return this.precpred(this._ctx, 1);
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,20,149,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,1,0,5,0,30,8,0,10,0,12,0,33,9,0,1,
	1,1,1,1,1,1,1,4,1,39,8,1,11,1,12,1,40,1,1,1,1,3,1,45,8,1,1,1,1,1,1,1,1,
	1,1,1,1,1,1,1,3,1,54,8,1,5,1,56,8,1,10,1,12,1,59,9,1,1,2,4,2,62,8,2,11,
	2,12,2,63,1,3,1,3,1,3,1,3,1,3,1,3,3,3,72,8,3,1,4,3,4,75,8,4,1,4,1,4,3,4,
	79,8,4,1,4,3,4,82,8,4,1,5,1,5,1,5,4,5,87,8,5,11,5,12,5,88,1,5,1,5,3,5,93,
	8,5,1,6,1,6,1,6,1,6,1,6,1,6,3,6,101,8,6,1,7,3,7,104,8,7,1,7,1,7,3,7,108,
	8,7,1,8,1,8,1,8,1,9,1,9,1,9,1,9,1,10,1,10,1,10,1,10,3,10,121,8,10,1,11,
	1,11,1,11,1,11,3,11,127,8,11,1,12,1,12,1,12,1,13,1,13,3,13,134,8,13,1,13,
	1,13,1,13,3,13,139,8,13,1,13,3,13,142,8,13,1,13,3,13,145,8,13,1,13,1,13,
	1,13,0,1,2,14,0,2,4,6,8,10,12,14,16,18,20,22,24,26,0,1,1,0,10,11,157,0,
	31,1,0,0,0,2,44,1,0,0,0,4,61,1,0,0,0,6,71,1,0,0,0,8,81,1,0,0,0,10,92,1,
	0,0,0,12,94,1,0,0,0,14,103,1,0,0,0,16,109,1,0,0,0,18,112,1,0,0,0,20,120,
	1,0,0,0,22,126,1,0,0,0,24,128,1,0,0,0,26,131,1,0,0,0,28,30,3,2,1,0,29,28,
	1,0,0,0,30,33,1,0,0,0,31,29,1,0,0,0,31,32,1,0,0,0,32,1,1,0,0,0,33,31,1,
	0,0,0,34,35,6,1,-1,0,35,45,3,14,7,0,36,38,5,6,0,0,37,39,3,2,1,0,38,37,1,
	0,0,0,39,40,1,0,0,0,40,38,1,0,0,0,40,41,1,0,0,0,41,42,1,0,0,0,42,43,5,7,
	0,0,43,45,1,0,0,0,44,34,1,0,0,0,44,36,1,0,0,0,45,57,1,0,0,0,46,47,10,1,
	0,0,47,53,5,5,0,0,48,54,3,4,2,0,49,50,5,6,0,0,50,51,3,4,2,0,51,52,5,7,0,
	0,52,54,1,0,0,0,53,48,1,0,0,0,53,49,1,0,0,0,54,56,1,0,0,0,55,46,1,0,0,0,
	56,59,1,0,0,0,57,55,1,0,0,0,57,58,1,0,0,0,58,3,1,0,0,0,59,57,1,0,0,0,60,
	62,5,1,0,0,61,60,1,0,0,0,62,63,1,0,0,0,63,61,1,0,0,0,63,64,1,0,0,0,64,5,
	1,0,0,0,65,72,5,1,0,0,66,72,5,2,0,0,67,68,5,3,0,0,68,69,3,4,2,0,69,70,5,
	4,0,0,70,72,1,0,0,0,71,65,1,0,0,0,71,66,1,0,0,0,71,67,1,0,0,0,72,7,1,0,
	0,0,73,75,5,19,0,0,74,73,1,0,0,0,74,75,1,0,0,0,75,76,1,0,0,0,76,78,3,6,
	3,0,77,79,5,10,0,0,78,77,1,0,0,0,78,79,1,0,0,0,79,82,1,0,0,0,80,82,3,26,
	13,0,81,74,1,0,0,0,81,80,1,0,0,0,82,9,1,0,0,0,83,93,3,8,4,0,84,86,5,8,0,
	0,85,87,3,8,4,0,86,85,1,0,0,0,87,88,1,0,0,0,88,86,1,0,0,0,88,89,1,0,0,0,
	89,90,1,0,0,0,90,91,5,9,0,0,91,93,1,0,0,0,92,83,1,0,0,0,92,84,1,0,0,0,93,
	11,1,0,0,0,94,95,5,6,0,0,95,96,3,10,5,0,96,97,5,12,0,0,97,98,3,10,5,0,98,
	100,5,7,0,0,99,101,5,13,0,0,100,99,1,0,0,0,100,101,1,0,0,0,101,13,1,0,0,
	0,102,104,5,11,0,0,103,102,1,0,0,0,103,104,1,0,0,0,104,107,1,0,0,0,105,
	108,3,10,5,0,106,108,3,12,6,0,107,105,1,0,0,0,107,106,1,0,0,0,108,15,1,
	0,0,0,109,110,5,16,0,0,110,111,3,4,2,0,111,17,1,0,0,0,112,113,3,4,2,0,113,
	114,5,18,0,0,114,115,3,4,2,0,115,19,1,0,0,0,116,117,5,15,0,0,117,121,3,
	18,9,0,118,119,5,15,0,0,119,121,3,4,2,0,120,116,1,0,0,0,120,118,1,0,0,0,
	121,21,1,0,0,0,122,123,3,16,8,0,123,124,3,20,10,0,124,127,1,0,0,0,125,127,
	3,20,10,0,126,122,1,0,0,0,126,125,1,0,0,0,127,23,1,0,0,0,128,129,5,14,0,
	0,129,130,3,20,10,0,130,25,1,0,0,0,131,133,5,3,0,0,132,134,5,19,0,0,133,
	132,1,0,0,0,133,134,1,0,0,0,134,138,1,0,0,0,135,139,3,6,3,0,136,139,3,22,
	11,0,137,139,3,24,12,0,138,135,1,0,0,0,138,136,1,0,0,0,138,137,1,0,0,0,
	139,141,1,0,0,0,140,142,5,19,0,0,141,140,1,0,0,0,141,142,1,0,0,0,142,144,
	1,0,0,0,143,145,7,0,0,0,144,143,1,0,0,0,144,145,1,0,0,0,145,146,1,0,0,0,
	146,147,5,4,0,0,147,27,1,0,0,0,21,31,40,44,53,57,63,71,74,78,81,88,92,100,
	103,107,120,126,133,138,141,144];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!MJSiteswapParser.__ATN) {
			MJSiteswapParser.__ATN = new ATNDeserializer().deserialize(MJSiteswapParser._serializedATN);
		}

		return MJSiteswapParser.__ATN;
	}


	static DecisionsToDFA = MJSiteswapParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class PatternContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public pattern_atom_list(): Pattern_atomContext[] {
		return this.getTypedRuleContexts(Pattern_atomContext) as Pattern_atomContext[];
	}
	public pattern_atom(i: number): Pattern_atomContext {
		return this.getTypedRuleContext(Pattern_atomContext, i) as Pattern_atomContext;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_pattern;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitPattern) {
			return visitor.visitPattern(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class Pattern_atomContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_pattern_atom;
	}
	public override copyFrom(ctx: Pattern_atomContext): void {
		super.copyFrom(ctx);
	}
}
export class PatternTossContext extends Pattern_atomContext {
	constructor(parser: MJSiteswapParser, ctx: Pattern_atomContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public toss(): TossContext {
		return this.getTypedRuleContext(TossContext, 0) as TossContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitPatternToss) {
			return visitor.visitPatternToss(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class PatternExpContext extends Pattern_atomContext {
	constructor(parser: MJSiteswapParser, ctx: Pattern_atomContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public pattern_atom(): Pattern_atomContext {
		return this.getTypedRuleContext(Pattern_atomContext, 0) as Pattern_atomContext;
	}
	public REP(): TerminalNode {
		return this.getToken(MJSiteswapParser.REP, 0);
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
	public LPAR(): TerminalNode {
		return this.getToken(MJSiteswapParser.LPAR, 0);
	}
	public RPAR(): TerminalNode {
		return this.getToken(MJSiteswapParser.RPAR, 0);
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitPatternExp) {
			return visitor.visitPatternExp(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class PatternParContext extends Pattern_atomContext {
	constructor(parser: MJSiteswapParser, ctx: Pattern_atomContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LPAR(): TerminalNode {
		return this.getToken(MJSiteswapParser.LPAR, 0);
	}
	public RPAR(): TerminalNode {
		return this.getToken(MJSiteswapParser.RPAR, 0);
	}
	public pattern_atom_list(): Pattern_atomContext[] {
		return this.getTypedRuleContexts(Pattern_atomContext) as Pattern_atomContext[];
	}
	public pattern_atom(i: number): Pattern_atomContext {
		return this.getTypedRuleContext(Pattern_atomContext, i) as Pattern_atomContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitPatternPar) {
			return visitor.visitPatternPar(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class NumberContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public DIGIT_list(): TerminalNode[] {
	    	return this.getTokens(MJSiteswapParser.DIGIT);
	}
	public DIGIT(i: number): TerminalNode {
		return this.getToken(MJSiteswapParser.DIGIT, i);
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_number;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitNumber) {
			return visitor.visitNumber(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class HeightContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_height;
	}
	public override copyFrom(ctx: HeightContext): void {
		super.copyFrom(ctx);
	}
}
export class HeightDigitContext extends HeightContext {
	constructor(parser: MJSiteswapParser, ctx: HeightContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public DIGIT(): TerminalNode {
		return this.getToken(MJSiteswapParser.DIGIT, 0);
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitHeightDigit) {
			return visitor.visitHeightDigit(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class HeightAccContext extends HeightContext {
	constructor(parser: MJSiteswapParser, ctx: HeightContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LCUR(): TerminalNode {
		return this.getToken(MJSiteswapParser.LCUR, 0);
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
	public RCUR(): TerminalNode {
		return this.getToken(MJSiteswapParser.RCUR, 0);
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitHeightAcc) {
			return visitor.visitHeightAcc(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class HeightBigDigitContext extends HeightContext {
	constructor(parser: MJSiteswapParser, ctx: HeightContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public BIG_HEIGHT_DIGIT(): TerminalNode {
		return this.getToken(MJSiteswapParser.BIG_HEIGHT_DIGIT, 0);
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitHeightBigDigit) {
			return visitor.visitHeightBigDigit(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class Toss_infoContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_toss_info;
	}
	public override copyFrom(ctx: Toss_infoContext): void {
		super.copyFrom(ctx);
	}
}
export class TossDetailedContext extends Toss_infoContext {
	constructor(parser: MJSiteswapParser, ctx: Toss_infoContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public detailed_toss(): Detailed_tossContext {
		return this.getTypedRuleContext(Detailed_tossContext, 0) as Detailed_tossContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitTossDetailed) {
			return visitor.visitTossDetailed(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class TossVanillaContext extends Toss_infoContext {
	constructor(parser: MJSiteswapParser, ctx: Toss_infoContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public height(): HeightContext {
		return this.getTypedRuleContext(HeightContext, 0) as HeightContext;
	}
	public NAME(): TerminalNode {
		return this.getToken(MJSiteswapParser.NAME, 0);
	}
	public X_MOD(): TerminalNode {
		return this.getToken(MJSiteswapParser.X_MOD, 0);
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitTossVanilla) {
			return visitor.visitTossVanilla(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class Async_tossContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_async_toss;
	}
	public override copyFrom(ctx: Async_tossContext): void {
		super.copyFrom(ctx);
	}
}
export class AsyncMultiplexContext extends Async_tossContext {
	constructor(parser: MJSiteswapParser, ctx: Async_tossContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LSQU(): TerminalNode {
		return this.getToken(MJSiteswapParser.LSQU, 0);
	}
	public RSQU(): TerminalNode {
		return this.getToken(MJSiteswapParser.RSQU, 0);
	}
	public toss_info_list(): Toss_infoContext[] {
		return this.getTypedRuleContexts(Toss_infoContext) as Toss_infoContext[];
	}
	public toss_info(i: number): Toss_infoContext {
		return this.getTypedRuleContext(Toss_infoContext, i) as Toss_infoContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitAsyncMultiplex) {
			return visitor.visitAsyncMultiplex(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class AsyncTossContext extends Async_tossContext {
	constructor(parser: MJSiteswapParser, ctx: Async_tossContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public toss_info(): Toss_infoContext {
		return this.getTypedRuleContext(Toss_infoContext, 0) as Toss_infoContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitAsyncToss) {
			return visitor.visitAsyncToss(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class Sync_tossContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LPAR(): TerminalNode {
		return this.getToken(MJSiteswapParser.LPAR, 0);
	}
	public async_toss_list(): Async_tossContext[] {
		return this.getTypedRuleContexts(Async_tossContext) as Async_tossContext[];
	}
	public async_toss(i: number): Async_tossContext {
		return this.getTypedRuleContext(Async_tossContext, i) as Async_tossContext;
	}
	public COMMA(): TerminalNode {
		return this.getToken(MJSiteswapParser.COMMA, 0);
	}
	public RPAR(): TerminalNode {
		return this.getToken(MJSiteswapParser.RPAR, 0);
	}
	public EXCL(): TerminalNode {
		return this.getToken(MJSiteswapParser.EXCL, 0);
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_sync_toss;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitSync_toss) {
			return visitor.visitSync_toss(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class TossContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public async_toss(): Async_tossContext {
		return this.getTypedRuleContext(Async_tossContext, 0) as Async_tossContext;
	}
	public sync_toss(): Sync_tossContext {
		return this.getTypedRuleContext(Sync_tossContext, 0) as Sync_tossContext;
	}
	public HAND_MOD(): TerminalNode {
		return this.getToken(MJSiteswapParser.HAND_MOD, 0);
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_toss;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitToss) {
			return visitor.visitToss(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class MeasureContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public MEASURE(): TerminalNode {
		return this.getToken(MJSiteswapParser.MEASURE, 0);
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_measure;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitMeasure) {
			return visitor.visitMeasure(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class FracContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public number__list(): NumberContext[] {
		return this.getTypedRuleContexts(NumberContext) as NumberContext[];
	}
	public number_(i: number): NumberContext {
		return this.getTypedRuleContext(NumberContext, i) as NumberContext;
	}
	public DIV(): TerminalNode {
		return this.getToken(MJSiteswapParser.DIV, 0);
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_frac;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitFrac) {
			return visitor.visitFrac(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class BeatContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_beat;
	}
	public override copyFrom(ctx: BeatContext): void {
		super.copyFrom(ctx);
	}
}
export class BeatFracContext extends BeatContext {
	constructor(parser: MJSiteswapParser, ctx: BeatContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public BEAT(): TerminalNode {
		return this.getToken(MJSiteswapParser.BEAT, 0);
	}
	public frac(): FracContext {
		return this.getTypedRuleContext(FracContext, 0) as FracContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitBeatFrac) {
			return visitor.visitBeatFrac(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class BeatWholeNumberContext extends BeatContext {
	constructor(parser: MJSiteswapParser, ctx: BeatContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public BEAT(): TerminalNode {
		return this.getToken(MJSiteswapParser.BEAT, 0);
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitBeatWholeNumber) {
			return visitor.visitBeatWholeNumber(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class Abs_catchContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_abs_catch;
	}
	public override copyFrom(ctx: Abs_catchContext): void {
		super.copyFrom(ctx);
	}
}
export class AbsMeasureAndBeatContext extends Abs_catchContext {
	constructor(parser: MJSiteswapParser, ctx: Abs_catchContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public measure(): MeasureContext {
		return this.getTypedRuleContext(MeasureContext, 0) as MeasureContext;
	}
	public beat(): BeatContext {
		return this.getTypedRuleContext(BeatContext, 0) as BeatContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitAbsMeasureAndBeat) {
			return visitor.visitAbsMeasureAndBeat(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class AbsBeatOnlyContext extends Abs_catchContext {
	constructor(parser: MJSiteswapParser, ctx: Abs_catchContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public beat(): BeatContext {
		return this.getTypedRuleContext(BeatContext, 0) as BeatContext;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitAbsBeatOnly) {
			return visitor.visitAbsBeatOnly(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class Rel_catchContext extends ParserRuleContext {
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public PLUS(): TerminalNode {
		return this.getToken(MJSiteswapParser.PLUS, 0);
	}
	public beat(): BeatContext {
		return this.getTypedRuleContext(BeatContext, 0) as BeatContext;
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_rel_catch;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitRel_catch) {
			return visitor.visitRel_catch(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class Detailed_tossContext extends ParserRuleContext {
	public _ball!: Token;
	public _toJuggler!: Token;
	constructor(parser?: MJSiteswapParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LCUR(): TerminalNode {
		return this.getToken(MJSiteswapParser.LCUR, 0);
	}
	public RCUR(): TerminalNode {
		return this.getToken(MJSiteswapParser.RCUR, 0);
	}
	public height(): HeightContext {
		return this.getTypedRuleContext(HeightContext, 0) as HeightContext;
	}
	public abs_catch(): Abs_catchContext {
		return this.getTypedRuleContext(Abs_catchContext, 0) as Abs_catchContext;
	}
	public rel_catch(): Rel_catchContext {
		return this.getTypedRuleContext(Rel_catchContext, 0) as Rel_catchContext;
	}
	public NAME_list(): TerminalNode[] {
	    	return this.getTokens(MJSiteswapParser.NAME);
	}
	public NAME(i: number): TerminalNode {
		return this.getToken(MJSiteswapParser.NAME, i);
	}
	public HAND_MOD(): TerminalNode {
		return this.getToken(MJSiteswapParser.HAND_MOD, 0);
	}
	public X_MOD(): TerminalNode {
		return this.getToken(MJSiteswapParser.X_MOD, 0);
	}
    public get ruleIndex(): number {
    	return MJSiteswapParser.RULE_detailed_toss;
	}
	// @Override
	public accept<Result>(visitor: MJSiteswapParserVisitor<Result>): Result {
		if (visitor.visitDetailed_toss) {
			return visitor.visitDetailed_toss(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
