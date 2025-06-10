import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createHandGeometry, createHandMaterial } from "../../view";

export function HandMesh({
    radius,
    widthSegments,
    heightSegments,
    color
}: {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
}) {
    const geometryRef = useRef(
        createHandGeometry({
            radius,
            widthSegments,
            heightSegments
        })
    );
    const materialRef = useRef(createHandMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}
