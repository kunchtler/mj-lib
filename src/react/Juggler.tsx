import { use, useEffect, useRef, useState } from "react";
import { PerformanceContext, JugglerContext } from "./Context";
import { JugglerView } from "../view/JugglerView";
import * as THREE from "three";
import mergeRefs from "merge-refs";
import { ThreeElements } from "@react-three/fiber";

//TODO : Add debug.

export type JugglerReactProps = {
    name: string;
} & ThreeElements["object3D"];

export function Juggler({ name, ref, ...props }: JugglerReactProps) {
    const performance = use(PerformanceContext);
    const [juggler, setJuggler] = useState<JugglerView | undefined>(undefined);
    const object3DRef = useRef<THREE.Object3D>(null!);

    // Create / delete the hand.
    useEffect(() => {
        if (performance === undefined) {
            return;
        }
        const jugglerModel = performance.model.jugglers.get(name);
        if (jugglerModel === undefined) {
            return;
        }
        const newJuggler = new JugglerView({ model: jugglerModel });
        performance.jugglers.set(name, newJuggler);
        // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
        setJuggler(newJuggler);
        return () => {
            performance.jugglers.delete(name);
            setJuggler(undefined);
        };
    }, [performance, name]);

    return (
        //TODO : Context ?
        <JugglerContext value={juggler}>
            {/*@ts-expect-error React 19's refs are weirdly typed*/}
            <object3D ref={mergeRefs(object3DRef, ref)} {...props}></object3D>
        </JugglerContext>
    );
}
