import { useRef, useEffect } from "react";
import * as THREE from "three";
import { createBallGeometry, createBallMaterial } from "../../view";

// TODO : Add customization options (striped, with middle band, ...)

export function BallMesh({
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
        createBallGeometry({
            radius,
            widthSegments,
            heightSegments
        })
    );
    const materialRef = useRef(createBallMaterial({ color }));

    useEffect(() => {
        geometryRef.current.dispose();
        materialRef.current.dispose();
    }, [geometryRef, materialRef]);

    return <mesh geometry={geometryRef.current} material={materialRef.current} />;
}
