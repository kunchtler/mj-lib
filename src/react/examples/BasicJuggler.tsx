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
import { BasicJugglerProps, JugglerMesh } from "../mesh/JugglerMesh";

//TODO : Decompose with BasicHand and center-rest + rest-spot distance ?

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
            <JugglerMesh
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
