# Web audio routes

We wish to have the following audio routes :

We imagine a scene made of multiple performances, each with multiple jugglers and multiple balls.

In a performance :

- Each ball has a CustomThreePositionalAudio (AudioSourceBuffer + GainNode to control its sound individually).
- The GainNode of the ball is connected to another GainNode (one per ball), to control a juggler's custom volume.
- The GainNode of the ball -> juggler all connect to a single GainNode of the performance, to adjust a performance's volume.
- All of the performances GainNodes connect to a single THREE.AudioListener node (that controls the master volume and spatialization of the camera).

Since THREE.js handles a single audioContext, hence a single AusioListener, we can't have two AudioListeners at all on a same webpage.
