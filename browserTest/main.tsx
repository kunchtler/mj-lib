import "@mantine/core/styles.css";
import "./globalstyles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme.ts";
import { enableMapSet } from "immer";

enableMapSet();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MantineProvider theme={theme}>
            <App />
        </MantineProvider>
    </StrictMode>
);
