import {
    Affix,
    alpha,
    AppShell,
    Burger,
    Container,
    Flex,
    Group,
    Image,
    Overlay,
    Paper,
    Select,
    Slider
} from "@mantine/core";
import { BasicAppShell } from "./Example";
import { Player } from "./Player";
import { SimulatorApp } from "./SimulatorApp";
import { SoundSettings } from "./SoundSettings";
import image from "../assets/screen.png";
import style from "../react/simulator.module.css";
import { JugglingAppParams } from "../../src/MusicalJuggling";
import { useState } from "react";

//TODO : If no ID for Ball, autogenerate ID.
//TODO : Make ball quick generation (by storing info for VIncent's balls.)
//TODO : Raw can handle numbers as well as strings.
//TODO : Define init tempo ? init balls ?
//TODO : Defaults when no MusicConverter or when trivial ?

const patterns = new Map<string, JugglingAppParams | undefined>([
    [
        "Mesure 72",
        {
            jugglers: [
                [
                    "A",
                    {
                        balls: [
                            { id: "Sib?A", name: "Sib", color: "purple", sound: "Sib" },
                            { id: "Si?A", name: "Si", color: "white", sound: "Si" },
                            { id: "Re'?A", name: "Re'", color: "orange", sound: "Re'" }
                        ],
                        events: [
                            [
                                "0",
                                {
                                    tempo: "1",
                                    hands: [["Sib"], ["Re'", "Si"]],
                                    pattern: "R35003 35003 35003 42334 05003 35003 35003 42334 0300"
                                }
                            ]
                        ]
                    }
                ]
            ],
            musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 200 } }]]
        }
    ],
    ["Mesure 76", undefined],
    ["Mesure 91", undefined],
    ["Mesure 101", undefined],
    ["Mesure 114", undefined],
    ["Mesure 119", undefined]
]);

const emptyPattern: JugglingAppParams = {
    jugglers: [],
    musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 200 } }]]
};

function App() {
    const [pattern, setPattern] = useState<JugglingAppParams>(patterns.get("Mesure 72")!);
    const [playbackRate, setPlaybackRate] = useState(1);

    function handleChange(value: string | null) {
        if (value === null) {
            setPattern(emptyPattern);
        } else {
            setPattern(patterns.get(value)!);
        }
    }

    function handlePlaybackRateChange(value: number) {
        setPlaybackRate(value);
    }

    return (
        <>
            <Affix position={{ top: 0, left: 0 }} p="md">
                {/* <Paper
                    p="sm"
                    color=""
                    styles={{
                        root: {
                            backgroundColor: alpha("var(--mantine-color-white)", 0.2),
                            backdropFilter: "blur(5px)"
                        }
                    }}
                > */}
                <Slider
                    min={0.5}
                    max={1}
                    value={playbackRate}
                    step={0.1}
                    p="md"
                    onChange={handlePlaybackRateChange}
                />
                <Select
                    // label="Section"
                    data={[...patterns.keys()]}
                    defaultValue={"Mesure 72"}
                    allowDeselect={false}
                    withCheckIcon={false}
                    onChange={handleChange}
                    styles={{}}
                    p="md"
                />
                {/* </Paper> */}
            </Affix>
            <SimulatorApp
                sceneBackgroundColor="#444444"
                pattern={pattern}
                playbackRate={playbackRate}
            />
        </>
    );
    // return (
    //     <div style={{ height: "100%", display: "flex" }}>
    //         <img src={image} style={{ width: "100px", display: "block", objectFit: "contain" }} />
    //         <canvas style={{ height: "100%", width: "100%", display: "block", flex: 1 }} />
    //     </div>
    // );
    // return (
    //     <AppShell navbar={{ width: 300, breakpoint: 300 }}>
    //         <AppShell.Navbar>
    //             <SoundSettings />
    //         </AppShell.Navbar>
    //         <AppShell.Main>
    //             <SimulatorApp />
    //         </AppShell.Main>
    //     </AppShell>
    // );
}

export default App;

// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import viteLogo from "./assets/vite.svg";
// import "./App.css";

// function App() {
//     const [count, setCount] = useState(0);

//     return (
//         <>
//             <div>
//                 <a href="https://vite.dev" target="_blank" rel="noreferrer noopener">
//                     <img src={viteLogo} className="logo" alt="Vite logo" />
//                 </a>
//                 <a href="https://react.dev" target="_blank" rel="noreferrer noopener">
//                     <img src={reactLogo} className="logo react" alt="React logo" />
//                 </a>
//             </div>
//             <h1>Vite + React</h1>
//             <div className="card">
//                 <button
//                     type="button"
//                     onClick={() => {
//                         setCount((count) => count + 1);
//                     }}
//                 >
//                     count is {count}
//                 </button>
//                 <p>
//                     Edit <code>src/App.tsx</code> and save to test HMR
//                 </p>
//             </div>
//             <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
//         </>
//     );
// }

// export default App;

// import "@mantine/core/styles.css";
// import { MantineProvider } from "@mantine/core";
// import { theme } from "./theme";

// export default function App() {
//     return <MantineProvider theme={theme}>App</MantineProvider>;
// }
