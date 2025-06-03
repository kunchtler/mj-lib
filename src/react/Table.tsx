import { use, useEffect, useRef, useState } from "react";
import { PerformanceContext, TableContext } from "./Context";
import { TableView } from "../view/TableView";
import * as THREE from "three";
import { ThreeElements } from "@react-three/fiber";
import mergeRefs from "merge-refs";

type TableReactProps = {
    name: string;
} & ThreeElements["object3D"];

export function Table({ name, ref, ...props }: TableReactProps) {
    const performance = use(PerformanceContext);
    const [table, setTable] = useState<TableView | undefined>(undefined);
    const object3DRef = useRef<THREE.Object3D>(null!);

    // Create / delete the hand.
    useEffect(() => {
        if (performance === undefined) {
            return;
        }
        const tableModel = performance.model.tables.get(name);
        if (tableModel === undefined) {
            return;
        }
        const newTable = new TableView({
            model: tableModel
        });
        performance.tables.set(name, newTable);
        // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
        setTable(newTable);
        return () => {
            performance.tables.delete(name);
            setTable(undefined);
        };
    }, [performance, name]);

    return (
        <TableContext value={table}>
            {/*@ts-expect-error React 19's refs are weirdly typed*/}
            <object3D ref={mergeRefs(object3DRef, ref)} {...props}></object3D>
        </TableContext>
    );
}
