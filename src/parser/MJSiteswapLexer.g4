lexer grammar MJSiteswapLexer;

DIGIT: [0-9];
BIG_HEIGHT_DIGIT: [a-g];
LCUR: '{'; //-> pushMode(MULTIPLE_DIGITS);
RCUR: '}';
REP: '^'; //-> pushMode(MULTIPLE_DIGITS);
LPAR: '(';
RPAR: ')';
LSQU: '[';
RSQU: ']';
X_MOD: 'x';
HAND_MOD: 'L' | 'R';
COMMA: ',';
EXCL: '!';
PLUS: '+';
BEAT: 'B';
MEASURE: 'M';
COMMENT: '//' ~[\r\n]* -> skip;
DIV: '/';
NAME: [A-Z][a-z'\\_#]*;
// NAME: [A-Z]([a-z'\\_0-9]* [a-z'\\_])?;
WS: [ \n\t\r\f]+ -> skip;

// mode MULTIPLE_DIGITS; NUMBER: [0-9]+; DIV: '/'; MD_RACC: RCUR -> popMode, type(RCUR); MD_RPAR:
// RPAR -> popMode, type(RPAR); MD_WS: WS -> skip, popMode; MD_WS: MD_RPAR: RPAR -> popMode,
// type(RPAR);