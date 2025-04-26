import "@mantine/core/styles.css";
import "./globalstyles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./react/App.tsx";
import { Button, createTheme, MantineProvider } from "@mantine/core";
import { theme } from "./theme.ts";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MantineProvider theme={theme}>
            <App />
        </MantineProvider>
    </StrictMode>
);
