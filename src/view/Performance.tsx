import { ReactNode, useEffect, useState } from "react";
import { PerformanceSim } from "../simulation/PerformanceSim";
import { PerformanceContext } from "./Context";
import { JugglingAppParams, TimeConductor } from "../MusicalJuggling";
import { PerformanceModel } from "../model/PerformanceModel";

type PerformanceReactProps = {
    pattern: JugglingAppParams;
    clock: TimeConductor;
    model: PerformanceModel;
    children?: ReactNode;
};

export function Performance({ model, clock, children }: PerformanceReactProps) {
    const [performanceContext] = useState(
        () => new PerformanceSim({ audioEnabled: true, clock: clock, model: model })
    );

    // In case the clock changes.
    useEffect(() => {
        set;
    }, [clock, performanceContext]);

    return <PerformanceContext value={performanceContext}>{children}</PerformanceContext>;
}
