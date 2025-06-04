import { ThreeElements } from "@react-three/fiber";
import { useRef, useEffect, RefObject } from "react";
import * as THREE from "three";
import { createJugglerCubeGeometry, createJugglerMaterial } from "../../view";

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
    // We manually create the geometry to be able to translate it.
    const geometryRef = useRef(createJugglerCubeGeometry({ height, width, depth }));
    const materialRef = useRef(createJugglerMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}

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
    leftHandRef?: RefObject<THREE.Object3D | null> | ((elem: THREE.Object3D | null) => void);
    rightHandRef?: RefObject<THREE.Object3D | null> | ((elem: THREE.Object3D | null) => void);
} & ThreeElements["object3D"];
