// antlr4-parse SiteswapLexer.g4 SiteswapParser.g4 pattern example.txt -gui antlr4
// -Dlanguage=TypeScript SiteswapLexer.g4 SiteswapParser.g4 -o outputfiles
parser grammar MJSiteswapParser;
options {
	tokenVocab = MJSiteswapLexer;
}
// pattern: pattern_atom+; TODO Invert order (more specific to more detailed + change method order
// in custom visitor)
pattern: pattern_atom*;
pattern_atom:
	toss											# PatternToss
	| '(' pattern_atom+ ')'							# PatternPar
	| pattern_atom '^' (number | '(' number ')')	# PatternExp;

// Siteswap (normal + note)
number: DIGIT+;
height:
	DIGIT				# HeightDigit
	| BIG_HEIGHT_DIGIT	# HeightBigDigit
	| '{' number '}'	# HeightAcc;
toss_info:
	NAME? height X_MOD?	# TossVanilla
	| detailed_toss		# TossDetailed;
async_toss:
	toss_info				# AsyncToss
	| ('[' toss_info+ ']')	# AsyncMultiplex;
sync_toss: '(' async_toss ',' async_toss ')' EXCL?;
toss: HAND_MOD? (async_toss | sync_toss);

// Siteswap (musical)
measure: 'M' number;
frac: number DIV number;
beat: 'B' frac # BeatFrac | 'B' number # BeatWholeNumber;
abs_catch:
	measure beat	# AbsMeasureAndBeat
	| beat			# AbsBeatOnly;
rel_catch: '+' beat;
detailed_toss:
	'{' ball = NAME? (height | abs_catch | rel_catch) toJuggler = NAME? (
		HAND_MOD
		| X_MOD
	)? '}';