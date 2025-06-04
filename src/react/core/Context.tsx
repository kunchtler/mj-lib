import { createContext } from "react";
import { PerformanceView } from "../../view/PerformanceView";
import { TableView } from "../../view/TableView";
import { JugglerView } from "../../view/JugglerView";
import { HandView } from "../../view/HandView";

export const PerformanceContext = createContext<PerformanceView | undefined>(undefined);
export const TableContext = createContext<TableView | undefined>(undefined);
export const JugglerContext = createContext<JugglerView | undefined>(undefined);
export const HandContext = createContext<HandView | undefined>(undefined);
