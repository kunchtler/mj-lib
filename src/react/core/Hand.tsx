import { use, useRef } from "react";
import { HandContext, JugglerContext } from "./Context";
import * as THREE from "three";
import { ThreeElements } from "@react-three/fiber";
import mergeRefs from "merge-refs";

//TODO : Librairie merge refs ?

export type HandReactProps = {
    isRight: boolean;
    // ref?: RefObject<THREE.Object3D>;
} & ThreeElements["object3D"];

export function Hand({ isRight, ref, ...props }: HandReactProps) {
    const juggler = use(JugglerContext);
    // const [hand, useHand] = useState<HandSim | undefined>(undefined);
    const object3DRef = useRef<THREE.Object3D>(null!);

    // The HandSim has already been constructed in the JugglerSim
    let hand = undefined;
    if (juggler !== undefined) {
        hand = isRight ? juggler.rightHand : juggler.leftHand;
    }
    return (
        <HandContext value={hand}>
            {/*@ts-expect-error React 19's refs are weirdly typed*/}
            <object3D ref={mergeRefs(object3DRef, ref)} {...props}></object3D>
        </HandContext>
    );
}
