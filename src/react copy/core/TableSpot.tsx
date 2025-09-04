import { use, useEffect, useRef } from "react";
import { TableContext } from "./Context";
import * as THREE from "three";
import { ThreeElements } from "@react-three/fiber";
import mergeRefs from "merge-refs";

type TableSpotReactProps = {
    ballName: string;
} & ThreeElements["object3D"];

export function TableSpot({ ballName, ref, ...props }: TableSpotReactProps) {
    const table = use(TableContext);
    const spotRef = useRef<THREE.Object3D>(null!);

    useEffect(() => {
        if (table === undefined) {
            return;
        }
        const spotPosition = spotRef.current.getWorldPosition(new THREE.Vector3());
        table.model.ballsSpots.set(ballName, spotPosition);
        return () => {
            table.model.ballsSpots.delete(ballName);
        };
    }, [table, ballName]);

    /*@ts-expect-error React 19's refs are weirdly typed*/
    return <object3D ref={mergeRefs(spotRef, ref)} {...props}></object3D>;
}

type TableUnknownSpotReactProps = ThreeElements["object3D"];

export function TableUnknownSpot({ ref, ...props }: TableUnknownSpotReactProps) {
    const table = use(TableContext);
    const spotRef = useRef<THREE.Object3D>(null!);

    useEffect(() => {
        if (table === undefined) {
            return;
        }
        spotRef.current.getWorldPosition(table.model.unkownBallSpot);
        return () => {
            table.model.unkownBallSpot.set(0, 0, 0);
        };
    }, [table]);

    /*@ts-expect-error React 19's refs are weirdly typed*/
    return <object3D ref={mergeRefs(spotRef, ref)} {...props}></object3D>;
}
