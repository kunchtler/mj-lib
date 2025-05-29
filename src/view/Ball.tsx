import * as THREE from "three";
import {
    Children,
    isValidElement,
    ReactElement,
    ReactNode,
    use,
    useContext,
    useEffect,
    useRef
} from "react";
import { TroupControllerContext } from "./TroupControllerContext";

export function Ball({ children }: { children: ReactNode }) {
    Children.forEach(children, (child) => {
        if (!isValidElement(child) || child.type !== Ball) {
            throw new Error("All children of <Group> must be <Student> components.");
        }
    });
}

// TODO : Add customization options (striped, with middle band, ...)
// TODO : Check if everything react friendly allright ?
export function BallMesh({ radius, color }: { radius?: number; color?: THREE.ColorRepresentation;  }) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const troupController = use(TroupControllerContext);
    const 

    useEffect(() => {
        if (troupController !== null) {
            troupController.jugglers.
        }
    }, [troupController]);

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[radius, 8, 4]} />
            <meshPhongMaterial args={[{ color }]} />
        </mesh>
    );
}

// export function BallMesh({}) {
//     return <mesh></mesh>;
// }

// Default radius = 0.05
// Default material color = 0xffdbac
