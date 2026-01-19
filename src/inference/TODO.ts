/*
  Here is where I stopped :
  How to handle the time !!
  We can specify for the tempo :
    - tosses per minute
    - tosses per beat (follows the main beat)


    - the scoreRhythm converter has 2 purposes :
        1. Allow to use Bar+Beat as time.
        2. Follow a music's tempo.
    The first goal is really clear, it is the second that confuses me, as it introduces this tempo that affects the musicbeat that affects the jugglingbeat that affects each individual juggler.

    So I propose the following :
    We have the main beat in the juggling scene.
    Jugglers can set their tempo :
        - with tosses per minute.
        - with tosses per beat.
        - with beats per minute individual ??? Nonsense
    Jugglers can specify a point in time :
        - with toss number
        - with absolute time (???)
        - with beat
        - with BarBeat (music). In this case, we need for a way to convert from BarBeat to either juggling beat or absolute time.
        - allow basic math ? (clearer to say 25+1/3 than 76/3) 
    */
