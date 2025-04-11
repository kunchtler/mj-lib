# MJ Pattern input format

We give here a comprehensive list of the features of the Musical Juggling Siteswap Extension (as specified in MJSiteswapLexer.g4 and MJSiteswapParser.g4).

For the most part, the juggling notation follows the siteswap standards established by [Juggling lab](https://jugglinglab.org/html/ssnotation.html). We recommend reading this page first as it details well the notation.

We will refer to this notation as JLS (Juggling Lab Siteswap), as opposed to our notation MJS (Musical Juggling Siteswap).

Examples are given in _italic_.

## Features present in MJS and JLS.

- A pattern consists of a series of integer denoting a throws height _(e.g. 315)_.
- Multiplex throws are indicated by brackets _(e.g. 24[54])_.
- Synchronous throws are indicated by parenthesis _(e.g. (4, 2): the left hand throws a 4 each beat, the right hand throws a 2)_.
    - Synchronous throws can contain multiplexes. _(e.g. ([42], 0)(2, 0))_.
    - Parity of the height indicates if a ball thrown will land in the same or in the other hand. If one wants to do the opposite, an 'x' can be added _(e.g. (4,2x)(2x,4) : the 2x indicates a throw of height 2 that changes hands)_.
      <!-- - By default, we assume there is a blank beat after each synchronous throw. This means each throw must be of even height. This can be circumvented by adding a '!' *(e.g)* -->
- Mixed synchronous and asynchronous notation.
- Hand throw modifiers : TODO

## Features present in MJS, that have a different meaning in JLS.

- Pattern repetition. We allow for the repetition of patterns with the '^' _(e.g. 3^10 (531)^3, or 3^(10)(531)^3 or (3^10)(531)^3)_.
  Juggling Lab supports this but with parenthesis acting different (the above example should be rewritten (3^10)(531^3)). Our notation is more akin to standard math operators rules.
  TODO.
- By default, all balls are thrown (even with height 2).

## Features present in MJS, NOT in JLS.

- Spaces, tabs and new lines can be used to help with writing a pattern.
- Comments can be added with //.
- To specify throws of heights greater than 10, we can:
    - Use the first letters of the alphabet _(e.g. 'a' for 10, 'b' for 11, 'c' for 12, ..., up to TODO)_.
    - Use brackets _(e.g. \{13\})_.
- Patterns are not required to be loopable.
- Throw features:

    - Throws can use height to indicate in how much time they'll land, or use an absolute or relative time. They are specified in terms of beats (B) or beats and measures (MB). The information about measure signature and juggler's unit beat length are obtained for now from outside the pattern.
      - Absolute Beat means we throw the ball to be caught at that beat (either giving the measure number or not) _(e.g M1B4 to indicate Measure 1 Beat 4, or B75/4 to indicate the absolute beat number 75 / 4 = 18.75)_.
      - Relative Beat means we throw the ball to be caught in a given amount of music beats *(e.g. +B1/4 to catch a ball in a quarter note)*. TODO : Revise what this means really ?
      - Remark: The standard siteswap height can be seen as a throw relative to the juggler's own sense of what a beat is.
    - A throw can be made to an other juggler.
        - In a specific hand of his or in the hand he would normally catch with or in his other hand.
        - If both the throwing and the catching juggler are specified
    - We can specify the name of the ball thrown.
    - Hands have a topology of "first caught, first thrown".

**Naming Ball and Juggler Convention :**
They must:
- start with an uppercase letter.
- contain lowercase letters, ', _ and #.

- Throw inference: When some information about a throw are not present, sensible information will be inferred, i.e.:

    - If no target juggler is given, the throwing juggler is assumed to be the catching juggler.
    - If a target juggler is given, the ball will be assumed to fall in the hand he is supposed to catch with.
    - If no ball name is given, the ball thrown is assumed to be the one closest to being thrown in the hand topology.

- Here is the complete writing if everything is specified :
    ```
    { <Ball_name_or_ID> <Throw_duration_or_catch_time> <Target_juggler> <Target_hand> }
    ```
    A throw can be written without brackets if it follows the standard supported Juggling Lab notation. Specifying the ball Name or ID is also possible _(e.g. DoL3x)_.

Else (if the throw is described by catch time OR we specify a target juggler OR we specify a target hand that isn't 'x' but 'L' or 'R'), there may be an ambiguity on the notation. Hence we must use curly brackets, separating arguments by spaces _(e.g. L{Do +B1/4 Josue x})_.

## Features present in JLS, NOT yet implemented in MJS.

- The passing notation. For now, passes should be specified using MJS detailed throw.
- The '\*' suffix that swaps hands when repeating a synchronous pattern.
- Bouncing balls, and bounce modifiers.
- Hold / Throw modifiers.
- Short beat sync throws.

## Roadmap of features.

- Options to have Juggling Lab parity / our options.
- Silent Throws.
- Modifier to swap the hand (useful in loops).
- Short beat sync throws.
- Passing notation ?
- Star modifier.
- Balls have name, also give them ID.
- Editable hand topology.
- Fully fledged notation (not only for siteswap pattern, but for the whole musical thing) (see danube.mj).

## TO ADD / TODO

- x -> X
- Numbers in name / name must start with capital letter ? / non greedy rules ?
