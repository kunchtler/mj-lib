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
    Select
} from "@mantine/core";
import { BasicAppShell } from "./Example";
import { Player } from "./Player";
import { SimulatorApp } from "./SimulatorApp";
import { SoundSettings } from "./SoundSettings";
import image from "../assets/screen.png";
import style from "../react/simulator.module.css";

function App() {
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
                <Select
                    // label="Section"
                    data={["1", "2", "3"]}
                    defaultValue="1"
                    allowDeselect={false}
                    withCheckIcon={false}
                    onChange={(value, option) => console.log(value, option)}
                    styles={{}}
                />
                {/* </Paper> */}
            </Affix>
            {/* <SimulatorApp sceneBackgroundColor="#444444" /> */}
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
