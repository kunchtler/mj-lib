import { ThreeElements } from "@react-three/fiber";
import { RefObject } from "react";
import * as THREE from "three";
import {
    createJugglerCubeGeometry as createBodyGeometry,
    createJugglerMaterial as createBodyMaterial,
    DEFAULT_JUGGLER_CUBE_COLOR,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_HEIGHT
} from "../../view";

//TODO : Customization options

export function BodyMesh({
    height = DEFAULT_JUGGLER_CUBE_HEIGHT,
    width = DEFAULT_JUGGLER_CUBE_HEIGHT,
    depth = DEFAULT_JUGGLER_CUBE_DEPTH,
    color = DEFAULT_JUGGLER_CUBE_COLOR
}: {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
}) {
    return (
        <mesh
            geometry={createBodyGeometry({ height, width, depth })}
            material={createBodyMaterial({ color })}
        />
    );
}
