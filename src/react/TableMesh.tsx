import * as THREE from "three";
import { createTableGeometry, createTableMaterial } from "./Default3DModels";
import {
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_WIDTH
} from "../constants/miseEnSceneDefaultValues";
import { Ref } from "react";

export type TableMeshProps = {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
    position?: THREE.Vector3Tuple;
    rotation?: THREE.Vector3Tuple;
    ref?: Ref<THREE.Mesh>;
};

export function TableMesh({
    height = DEFAULT_TABLE_HEIGHT,
    width = DEFAULT_TABLE_WIDTH,
    depth = DEFAULT_TABLE_DEPTH,
    color = DEFAULT_TABLE_COLOR,
    position,
    rotation,
    ref
}: TableMeshProps) {
    return (
        <mesh
            geometry={createTableGeometry({ height, width, depth })}
            material={createTableMaterial({ color })}
            position={position}
            rotation={rotation}
            ref={ref}
        />
    );
}
