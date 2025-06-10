import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createTableGeometry, createTableMaterial } from "../../view";

export function TableMesh({
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
    const geometryRef = useRef(createTableGeometry({ height, width, depth }));
    const materialRef = useRef(createTableMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}
