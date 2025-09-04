import {
    DEFAULT_JUGGLER_CUBE_ARM_LENGTH,
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_WIDTH,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_COLOR
} from "../../view";
import { Hand } from "../core/Hand";
import { TossSpot, CatchSpot, RestSpot } from "../core/HandSpot";
import { Juggler } from "../core/Juggler";
import { BodyMesh } from "./BodyMesh";

//TODO : Decompose with BasicHand and center-rest + rest-spot distance ?
// TODO : Un jour, écrire tuto pour créer mesh custom.

export type BasicJugglerProps = {
    name: string;
    juggler?: {
        armLength?: number; //TODO : Remove (and rather only do with cube dimensions)
        height?: number;
        width?: number;
        depth?: number;
        color?: THREE.ColorRepresentation;
    };
    hands?: {
        radius?: number;
        widthSegments?: number;
        heightSegments?: number;
        color?: THREE.ColorRepresentation;
    };
    leftHandRef?: RefObject<THREE.Object3D> | null;
    rightHandRef?: RefObject<THREE.Object3D> | null;
} & ThreeElements["object3D"];

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

export function BasicJuggler({
    name,
    juggler,
    hands,
    leftHandRef,
    rightHandRef,
    ...props
}: BasicJugglerProps) {
    // Default values.
    juggler ??= {};
    juggler.armLength ??= DEFAULT_JUGGLER_CUBE_ARM_LENGTH;
    juggler.height ??= DEFAULT_JUGGLER_CUBE_HEIGHT;
    juggler.width ??= DEFAULT_JUGGLER_CUBE_WIDTH;
    juggler.depth ??= DEFAULT_JUGGLER_CUBE_DEPTH;
    juggler.color ??= DEFAULT_JUGGLER_CUBE_COLOR;

    // Three Fiber sub-scene.
    return (
        <Juggler name={name} {...props}>
            <BodyMesh
                height={juggler.height}
                width={juggler.width}
                depth={juggler.depth}
                color={juggler.color}
            />
            <Hand
                isRight={false}
                position={[
                    juggler.armLength,
                    juggler.height - juggler.armLength * 2,
                    (-juggler.depth * 2) / 3
                ]}
                ref={(elem) => {
                    if (leftHandRef !== undefined) {
                        if (typeof leftHandRef === "function") {
                            leftHandRef(elem);
                        } else {
                            leftHandRef.current = elem;
                        }
                    }
                }}
            >
                {/* <HandMesh {...hands} /> */}
                <TossSpot position={[0, 0, juggler.width / 4]} />
                <CatchSpot position={[0, 0, -juggler.width / 4]} />
                <RestSpot position={[0, 0, 0]} />
            </Hand>
            <Hand
                isRight={true}
                position={[
                    juggler.armLength,
                    juggler.height - juggler.armLength * 2,
                    (juggler.depth * 2) / 3
                ]}
                ref={(elem) => {
                    if (rightHandRef !== undefined) {
                        if (typeof rightHandRef === "function") {
                            rightHandRef(elem);
                        } else {
                            rightHandRef.current = elem;
                        }
                    }
                }}
            >
                {/* <HandMesh {...hands} /> */}
                <TossSpot position={[0, 0, -juggler.width / 4]} />
                <CatchSpot position={[0, 0, juggler.width / 4]} />
                <RestSpot position={[0, 0, 0]} />
            </Hand>
        </Juggler>
    );
}
