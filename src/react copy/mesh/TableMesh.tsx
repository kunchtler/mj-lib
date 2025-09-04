import * as THREE from "three";
import {
    createTableGeometry,
    createTableMaterial,
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_WIDTH
} from "../../view";

export function TableMesh({
    height = DEFAULT_TABLE_HEIGHT,
    width = DEFAULT_TABLE_WIDTH,
    depth = DEFAULT_TABLE_DEPTH,
    color = DEFAULT_TABLE_COLOR
}: {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
}) {
    return (
        <mesh
            geometry={createTableGeometry({ height, width, depth })}
            material={createTableMaterial({ color })}
        />
    );
}
