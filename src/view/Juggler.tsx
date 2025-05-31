import { ReactNode, use, useEffect, useRef } from "react";
import { PerformanceContext, JugglerContext } from "./Context";
import { JugglerSim as JugglerSim } from "../simulation/JugglerSim";
import * as THREE from "three";

type JugglerReactProps = {
    name: string;
    debug?: boolean;
    children?: ReactNode;
};

export function Juggler({
    name,
    // debug,
    children
}: JugglerReactProps) {
    const performance = use(PerformanceContext);
    // const [juggler, setJuggler] = useState<JugglerSim | undefined>(() => performance?.jugglers.get(name));
    const meshRef = useRef<THREE.Mesh>(null!);

    // Setup the juggler.
    useEffect(() => {
        if (performance === undefined) {
            return;
        }
        const jugglerModel = performance.model.jugglers.get(name);
        if (jugglerModel === undefined) {
            return;
        }
        const juggler = new JugglerSim({
            object3D: meshRef.current,
            model: performance.model.jugglers.get(name)
        }); //TODO Fill in debug
        performance.addJuggler(name, juggler);
        return () => {
            performance.removeJuggler(name);
        };
    }, [performance, name]);

    return (
        //TODO : Context ?
        <JugglerContext value={performance?.jugglers.get(name)}>
            <group ref={meshRef}>{children}</group>
        </JugglerContext>
    );
}

export const DEFAULT_JUGGLER_CUBE_HEIGHT = 1.8;
export const DEFAULT_JUGGLER_CUBE_WIDTH = 0.5;
export const DEFAULT_JUGGLER_CUBE_DEPTH = 0.3;
export const DEFAULT_JUGGLER_CUBE_COLOR = 0x202020;

//TODO : Customization options
export function JugglerMesh({
    height,
    width,
    depth,
    color
}: {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
}) {
    height ??= DEFAULT_JUGGLER_CUBE_HEIGHT;
    width ??= DEFAULT_JUGGLER_CUBE_WIDTH;
    depth ??= DEFAULT_JUGGLER_CUBE_DEPTH;
    color ??= DEFAULT_JUGGLER_CUBE_COLOR;
    // TODO : How to translate geometry ?
    return (
        <mesh>
            <meshPhongMaterial args={[{ color }]} />
        </mesh>
    );
}
