import { ReactNode, use, useEffect, useRef } from "react";
import { PerformanceContext, TableContext } from "./Context";
import { TableSim as TableSim } from "../simulation/TableSim";
import * as THREE from "three";

export function Table({
    name,
    // debug,
    children
}: {
    name: string;
    debug?: boolean;
    children?: ReactNode;
}) {
    const performance = use(PerformanceContext);
    // const [table, setTable] = useState<TableSim | undefined>(() => performance?.tables.get(name));
    const meshRef = useRef<THREE.Mesh>(null!);

    // Setup the table.
    useEffect(() => {
        if (performance === undefined) {
            return;
        }
        const tableModel = performance.model.tables.get(name);
        if (tableModel === undefined) {
            return;
        }
        const table = new TableSim({
            object3D: meshRef.current,
            model: performance.model.tables.get(name)
        }); //TODO Fill in debug
        performance.addTable(name, table);
        return () => {
            performance.removeTable(name);
        };
    }, [performance, name]);

    return (
        //TODO : Context ?
        <TableContext value={performance?.tables.get(name)}>
            <group ref={meshRef}>{children}</group>
        </TableContext>
    );
}
