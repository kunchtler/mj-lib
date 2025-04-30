import { AppShell, Box, Burger, Container, Flex, Group, Image, Tabs } from "@mantine/core";
import { BasicAppShell } from "./Example";
import { Player } from "./Player";
import { SimulatorApp } from "./SimulatorApp";
import { SoundSettings } from "./SoundSettings";
import image from "../assets/screen.png";
import style from "../react/simulator.module.css";
import { IconPhoto, IconMessageCircle, IconSettings } from "@tabler/icons-react";
import { TimeConductor } from "../../src/MusicalJuggling";
import { TimeControls } from "./TimeControls";

function App() {
    // return (
    //     <Group /*style={{ height: "100%", display: "flex" }}*/>
    //         <img src={image} style={{ width: "100px", display: "block", objectFit: "contain" }} />
    //         <canvas style={{ height: "100%", width: "100%", display: "block", flex: 1 }} />
    //     </Group>
    // );
    // return (
    //     <div style={{ height: "100%", display: "flex" }}>
    //         <img src={image} style={{ width: "100px", display: "block", objectFit: "contain" }} />
    //         <canvas style={{ height: "100%", width: "100%", display: "block", flex: 1 }} />
    //     </div>
    // );
    // return (
    //     <Box w={"30%"}>
    //         <Tabs defaultValue="gallery" keepMounted={false}>
    //             <Tabs.List grow={true}>
    //                 <Tabs.Tab value="gallery" leftSection={<IconPhoto size={12} />}>
    //                     Gallery
    //                 </Tabs.Tab>
    //                 <Tabs.Tab value="messages" leftSection={<IconMessageCircle size={12} />}>
    //                     Messages
    //                 </Tabs.Tab>
    //                 <Tabs.Tab value="settings" leftSection={<IconSettings size={12} />}>
    //                     Settings
    //                 </Tabs.Tab>
    //             </Tabs.List>

    //             <Tabs.Panel value="gallery">Gallery tab content</Tabs.Panel>

    //             <Tabs.Panel value="messages">Messages tab content</Tabs.Panel>

    //             <Tabs.Panel value="settings">Settings tab content</Tabs.Panel>
    //         </Tabs>
    //     </Box>
    // );
    const timeConductor = new TimeConductor({
        bounds: [-10, 3671],
        autoplay: false,
        playbackRate: 2,
        startTime: -5
    });

    return (
        <TimeControls timeConductor={timeConductor} />
        // <AppShell navbar={{ width: 300, breakpoint: 300 }}>
        //     <AppShell.Navbar>
        //         <SoundSettings />
        //     </AppShell.Navbar>
        //     <AppShell.Main>
        //         <SimulatorApp />
        //     </AppShell.Main>
        // </AppShell>
    );
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
