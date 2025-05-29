import { createContext } from "react";
import { Troup as TroupController } from "../simulation/Troup";

export const TroupControllerContext = createContext<TroupController | null>(null);
