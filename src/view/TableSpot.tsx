import { ReactNode, use, useEffect, useRef } from "react";
import { TableContext } from "./Context";
import * as THREE from "three";

//TODO : Problem to reference the inner Object3D ?

export function TableSpot({ ballName, children }: { ballName: string; children: ReactNode }) {
    const table = use(TableContext);
    const spotRef = useRef<THREE.Object3D>(null!);

    useEffect(() => {
        if (table === undefined) {
            return;
        }
        table.addSpot(ballName, spotRef.current);
        return () => {
            table.removeSpot(ballName);
        };
    }, [table, ballName]);

    return <object3D ref={spotRef}>{children}</object3D>;
}

export function TableUnknownSpot({ children }: { children: ReactNode }) {
    const table = use(TableContext);
    const spotRef = useRef<THREE.Object3D>(null!);

    useEffect(() => {
        if (table === undefined) {
            return;
        }
        table.setUnknownSpot(spotRef.current);
        return () => {
            table.setUnknownSpot(new THREE.Object3D());
        };
    }, [table]);

    return <object3D ref={spotRef}>{children}</object3D>;
}
