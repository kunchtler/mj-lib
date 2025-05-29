import { createContext, ReactNode, useState } from "react";
import { Juggler } from "./Juggler";
import { Ball } from "./Ball";
import { Simulator as SimulatorT } from "../simulator/Simulator";
import { Ball as BallT } from "../simulator/Ball";
import { Juggler as JugglerT } from "../simulator/Juggler";
import { Table as TableT } from "../simulator/Table";
import { Troup as TroupController } from "../simulation/Troup";
import { TroupControllerContext } from "./TroupControllerContext";

export function Troup({ children }: { children: ReactNode }) {
    const [troupContext, setTroupContext] = useState(new TroupController({}));
    return <TroupControllerContext value={troupContext}>{children}</TroupControllerContext>;
}
