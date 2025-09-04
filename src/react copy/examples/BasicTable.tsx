import { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { DEFAULT_TABLE_HEIGHT, DEFAULT_TABLE_DEPTH, DEFAULT_TABLE_COLOR } from "../../view";
import { Table, TableUnknownSpot } from "../core";
import { TableMesh } from "../mesh/TableMesh";

export type BasicTableProps = {
    name: string;
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
} & ThreeElements["object3D"];
//TODO : Aides pour la disposition des balles.
export function BasicTable({ name, height, width, depth, color, ...props }: BasicTableProps) {
    // Default values.
    height ??= DEFAULT_TABLE_HEIGHT;
    width ??= DEFAULT_TABLE_HEIGHT;
    depth ??= DEFAULT_TABLE_DEPTH;
    color ??= DEFAULT_TABLE_COLOR;

    // Three fiber sub-scene
    return (
        <Table name={name} {...props}>
            <TableMesh height={height} width={width} depth={depth} color={color} />
            <TableUnknownSpot position={[0, height, 0]}>
                {/* <axesHelper args={[2]} position={[0, 0, 0]} /> */}
            </TableUnknownSpot>
        </Table>
    );
}
