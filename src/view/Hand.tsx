import { ReactNode, use, useEffect, useRef } from "react";
import { PerformanceContext, HandContext, JugglerContext } from "./Context";
import { HandSim as HandSim } from "../simulation/HandSim";
import * as THREE from "three";

export function Hand({
    isRight,
    children
}: {
    isRight: boolean;
    debug?: boolean;
    children?: ReactNode;
}) {
    const juggler = use(JugglerContext);
    const object3Dref = useRef<THREE.Mesh>(null!);
    // Setup the hand.
    useEffect(() => {
        if (juggler === undefined) {
            return;
        }
        const hand = isRight ? juggler.rightHand : juggler.leftHand;
        hand.object3D = 
        return () => {
            juggler.removeHand(name);
        };
    }, [juggler, name, isRight]);

    return (
        //TODO : Context ?
        <HandContext value={isRight ? juggler.rightHand : juggler.leftHand}>
            <group ref={object3Dref}>{children}</group>
        </HandContext>
    );
}
