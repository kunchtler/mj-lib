import * as THREE from "three";
import { createTableGeometry, createTableMaterial } from "./Default3DModels";
import {
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_VISIBILITY,
    DEFAULT_TABLE_WIDTH
} from "../constants/miseEnSceneDefaultValues";
import { Ref } from "react";

export type TableMeshProps = {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
    visible?: boolean;
    ref?: Ref<THREE.Mesh>;
};

export function TableMesh({
    height = DEFAULT_TABLE_HEIGHT,
    width = DEFAULT_TABLE_WIDTH,
    depth = DEFAULT_TABLE_DEPTH,
    color = DEFAULT_TABLE_COLOR,
    visible = DEFAULT_TABLE_VISIBILITY,
    ref
}: TableMeshProps) {
    return (
        <mesh
            geometry={createTableGeometry({ height, width, depth })}
            material={createTableMaterial({ color })}
            visible={visible}
            ref={ref}
        />
    );
}
