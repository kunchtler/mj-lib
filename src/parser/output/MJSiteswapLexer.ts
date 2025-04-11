// Generated from MJSiteswapLexer.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols
import {
	ATN,
	ATNDeserializer,
	CharStream,
	DecisionState, DFA,
	Lexer,
	LexerATNSimulator,
	RuleContext,
	PredictionContextCache,
	Token
} from "antlr4";
export default class MJSiteswapLexer extends Lexer {
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
	public static readonly EOF = Token.EOF;

	public static readonly channelNames: string[] = [ "DEFAULT_TOKEN_CHANNEL", "HIDDEN" ];
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
	public static readonly modeNames: string[] = [ "DEFAULT_MODE", ];

	public static readonly ruleNames: string[] = [
		"DIGIT", "BIG_HEIGHT_DIGIT", "LCUR", "RCUR", "REP", "LPAR", "RPAR", "LSQU", 
		"RSQU", "X_MOD", "HAND_MOD", "COMMA", "EXCL", "PLUS", "BEAT", "MEASURE", 
		"COMMENT", "DIV", "NAME", "WS",
	];


	constructor(input: CharStream) {
		super(input);
		this._interp = new LexerATNSimulator(this, MJSiteswapLexer._ATN, MJSiteswapLexer.DecisionsToDFA, new PredictionContextCache());
	}

	public get grammarFileName(): string { return "MJSiteswapLexer.g4"; }

	public get literalNames(): (string | null)[] { return MJSiteswapLexer.literalNames; }
	public get symbolicNames(): (string | null)[] { return MJSiteswapLexer.symbolicNames; }
	public get ruleNames(): string[] { return MJSiteswapLexer.ruleNames; }

	public get serializedATN(): number[] { return MJSiteswapLexer._serializedATN; }

	public get channelNames(): string[] { return MJSiteswapLexer.channelNames; }

	public get modeNames(): string[] { return MJSiteswapLexer.modeNames; }

	public static readonly _serializedATN: number[] = [4,0,20,100,6,-1,2,0,
	7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,
	7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,
	16,2,17,7,17,2,18,7,18,2,19,7,19,1,0,1,0,1,1,1,1,1,2,1,2,1,3,1,3,1,4,1,
	4,1,5,1,5,1,6,1,6,1,7,1,7,1,8,1,8,1,9,1,9,1,10,1,10,1,11,1,11,1,12,1,12,
	1,13,1,13,1,14,1,14,1,15,1,15,1,16,1,16,1,16,1,16,5,16,78,8,16,10,16,12,
	16,81,9,16,1,16,1,16,1,17,1,17,1,18,1,18,5,18,89,8,18,10,18,12,18,92,9,
	18,1,19,4,19,95,8,19,11,19,12,19,96,1,19,1,19,0,0,20,1,1,3,2,5,3,7,4,9,
	5,11,6,13,7,15,8,17,9,19,10,21,11,23,12,25,13,27,14,29,15,31,16,33,17,35,
	18,37,19,39,20,1,0,7,1,0,48,57,1,0,97,103,2,0,76,76,82,82,2,0,10,10,13,
	13,1,0,65,90,5,0,35,35,39,39,92,92,95,95,97,122,3,0,9,10,12,13,32,32,102,
	0,1,1,0,0,0,0,3,1,0,0,0,0,5,1,0,0,0,0,7,1,0,0,0,0,9,1,0,0,0,0,11,1,0,0,
	0,0,13,1,0,0,0,0,15,1,0,0,0,0,17,1,0,0,0,0,19,1,0,0,0,0,21,1,0,0,0,0,23,
	1,0,0,0,0,25,1,0,0,0,0,27,1,0,0,0,0,29,1,0,0,0,0,31,1,0,0,0,0,33,1,0,0,
	0,0,35,1,0,0,0,0,37,1,0,0,0,0,39,1,0,0,0,1,41,1,0,0,0,3,43,1,0,0,0,5,45,
	1,0,0,0,7,47,1,0,0,0,9,49,1,0,0,0,11,51,1,0,0,0,13,53,1,0,0,0,15,55,1,0,
	0,0,17,57,1,0,0,0,19,59,1,0,0,0,21,61,1,0,0,0,23,63,1,0,0,0,25,65,1,0,0,
	0,27,67,1,0,0,0,29,69,1,0,0,0,31,71,1,0,0,0,33,73,1,0,0,0,35,84,1,0,0,0,
	37,86,1,0,0,0,39,94,1,0,0,0,41,42,7,0,0,0,42,2,1,0,0,0,43,44,7,1,0,0,44,
	4,1,0,0,0,45,46,5,123,0,0,46,6,1,0,0,0,47,48,5,125,0,0,48,8,1,0,0,0,49,
	50,5,94,0,0,50,10,1,0,0,0,51,52,5,40,0,0,52,12,1,0,0,0,53,54,5,41,0,0,54,
	14,1,0,0,0,55,56,5,91,0,0,56,16,1,0,0,0,57,58,5,93,0,0,58,18,1,0,0,0,59,
	60,5,120,0,0,60,20,1,0,0,0,61,62,7,2,0,0,62,22,1,0,0,0,63,64,5,44,0,0,64,
	24,1,0,0,0,65,66,5,33,0,0,66,26,1,0,0,0,67,68,5,43,0,0,68,28,1,0,0,0,69,
	70,5,66,0,0,70,30,1,0,0,0,71,72,5,77,0,0,72,32,1,0,0,0,73,74,5,47,0,0,74,
	75,5,47,0,0,75,79,1,0,0,0,76,78,8,3,0,0,77,76,1,0,0,0,78,81,1,0,0,0,79,
	77,1,0,0,0,79,80,1,0,0,0,80,82,1,0,0,0,81,79,1,0,0,0,82,83,6,16,0,0,83,
	34,1,0,0,0,84,85,5,47,0,0,85,36,1,0,0,0,86,90,7,4,0,0,87,89,7,5,0,0,88,
	87,1,0,0,0,89,92,1,0,0,0,90,88,1,0,0,0,90,91,1,0,0,0,91,38,1,0,0,0,92,90,
	1,0,0,0,93,95,7,6,0,0,94,93,1,0,0,0,95,96,1,0,0,0,96,94,1,0,0,0,96,97,1,
	0,0,0,97,98,1,0,0,0,98,99,6,19,0,0,99,40,1,0,0,0,4,0,79,90,96,1,6,0,0];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!MJSiteswapLexer.__ATN) {
			MJSiteswapLexer.__ATN = new ATNDeserializer().deserialize(MJSiteswapLexer._serializedATN);
		}

		return MJSiteswapLexer.__ATN;
	}


	static DecisionsToDFA = MJSiteswapLexer._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );
}