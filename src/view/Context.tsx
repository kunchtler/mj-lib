import { createContext } from "react";
import { PerformanceSim } from "../simulation/PerformanceSim";
import { TableSim } from "../simulation/TableSim";
import { JugglerSim } from "../simulation/JugglerSim";
import { HandSim } from "../simulation/HandSim";

export const PerformanceContext = createContext<PerformanceSim | undefined>(undefined);
export const TableContext = createContext<TableSim | undefined>(undefined);
export const JugglerContext = createContext<JugglerSim | undefined>(undefined);
export const HandContext = createContext<HandSim | undefined>(undefined);
