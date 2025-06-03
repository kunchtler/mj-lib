Multiple classes describing the model, ie computing the positions of various elements of a troup at given times (eg : jugglers, balls, etc).

## How and why are the model / view / controller split that way ?

The model has many methods to compute the positions and velocities of elements of a juggling performance at various times. To achieve that, the method need to know the positions of various elements in the scene (where the balls are thrown from for each hand, etc etc...). These information can be encoded twofold :
  
- by considering the model as a "computational model" that only holds information about the pattern. Thus, we need to pass the positions of elements in the scene for it to be able to compute.

- by having the positions of those elements as attributes of the model class.

The second option was chosen, as the first required a bit of refactoring in the timeline (for the balls / hands to be able to reference other balls / hands by name). It may seem easier, and it is, but if we consider that the jugglers could move during a performance, it makes sense to consider the movement of the jugglers as part of the performance model, asking it where the jugglers are at what time. It is not the case for now, but we still chose the model to have relevant data about the position of various elements. **These positions are stored as THREE.Vector3, and are always relative to a common parent Object in the threeJS scene.** 

Why not store them as Object3D ? Because they would become linked to one another, which is a whole headache in itself.

This organisational choice leads to some concerns : if in the view, the position of the jugglers or tables are modified without the model's knowledge, the performance will be... rather odd-looking. This is why it should be the model that dictates the positions, always. We cannot enforce that because of the fact that threeJS objects are mutable. But to help with making sure both the model and the view aren't out of sync, we provide utility functions that verify it isn't the case (TODO : and that resyncs them if needed.)

TODO : Have the tables and jugglers main objects also in the model ? For now, they are not as they are not relevant to the computations.

Note : The react view allows for now to place the jugglers and tables, since they won't move. Internally, it configures the model with those positions in mind, but the model won't get notified if their positions are mutated.

Note2 : As there are JSX elements (because there are THREE Elements) for Audio, PositionAudio and AudioListener, but not for GainNode, we are obliged to handle some of the audio routing by hand.