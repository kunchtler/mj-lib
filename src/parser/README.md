# Parsers with ANTLR4

## ANTLR4

We use the [ANTLR4](https://www.antlr.org/index.html) tool to generate from a grammar file (lexers and parsers) some listener / visitor code that can be executed with the ANTLR runtime typescript library.

If any changes are made to the lexer or the parser, they should be recompiled.

## Installation

Follow the instructions at : https://github.com/antlr/antlr4/blob/master/doc/getting-started.md.

## Testing

```sh
antlr4-parse <lexer_file> <parser_file> <entry_rule_in_parser> <input_file_to_test> -gui
```

For instance: 

```sh
antlr4-parse MJSiteswapLexer.g4 MJSiteswapParser.g4 pattern test.txt -gui
```

## Compiling

```sh
antlr4 -Dlanguage=TypeScript <lexer_file> <parser_file>
```

For instance : 

```sh
antlr4 -Dlanguage=TypeScript ExprLexer.g4 ExprParser.g4
```

TODO : Automatic compilation when building ?
