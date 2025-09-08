import { Ref } from "react";
import {
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_WIDTH,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_COLOR
} from "./Default3DModels";
import { BodyMesh, BodyMeshProps } from "./BodyMesh";
import { HandMesh, HandMeshProps } from "./HandMesh";
import * as THREE from "three";

//TODO : Decompose with BasicHand and center-rest + rest-spot distance ?
// TODO : Un jour, écrire tuto pour créer mesh custom.

export type JugglerMeshProps = {
    body?: BodyMeshProps;
    rightHand?: HandMeshProps;
    leftHand?: HandMeshProps;
    armLength?: number;
    ref?: Ref<THREE.Object3D>;
};

// How to get a reference to the juggler's hands ?
// Say we want to allow in the top useFrame to change the hand's colors.
// Then we need a ref to the hand's meshes.
// But the hands could also be an object3D that has meshes as child ?
// Generic typing ?

// NOTE : I've tested and :
// If a Three mesh is created, and added as a primitive,
// using the mesh will modify its placement in the scene (even before it is added)
// so it's amazing. Hands can be the real meshes.
// But this makes it quite incompatible with defining a hand through fiber only.
// So a ref is better ? It could be at first undefined, and then not. So is it cool ?

// Plan B : The hands MUST Take a ref, to generic (Object3D or Mesh. or other ?)
// This ref exists in the top component (the performance).
//

// Plan C : Just make it not modular for now, no custom mesh. YESSSS INCREMENTAL CODE !!!

// NOTE 2 :

// TODO : call invalidate / retrigger frames when clock is paused ?

export function JugglerMesh({ body = {}, leftHand = {}, rightHand = {} }: JugglerMeshProps) {
    // Default values.
    body.height ??= DEFAULT_JUGGLER_CUBE_HEIGHT;
    body.width ??= DEFAULT_JUGGLER_CUBE_WIDTH;
    body.depth ??= DEFAULT_JUGGLER_CUBE_DEPTH;
    body.color ??= DEFAULT_JUGGLER_CUBE_COLOR;

    // Three Fiber sub-scene.
    return (
        <group>
            <BodyMesh {...body} />
            <HandMesh {...rightHand} />
            <HandMesh {...leftHand} />
        </group>
    );
}
