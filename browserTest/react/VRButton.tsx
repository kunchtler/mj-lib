import { WebGLRenderer } from "three";
import { useState, ReactNode, useRef, useEffect } from "react";
import { Button } from "@mantine/core";
import { IconCardboards, IconCardboardsOff } from "@tabler/icons-react";

// TODO : Doc
export function VRButton({
    renderer,
    sessionOptions
}: {
    renderer: WebGLRenderer;
    sessionOptions?: XRSessionInit;
}) {
    const [state, setState] = useState<"on" | "off" | "error" | "loading">(() =>
        isWebXRAvailable()[0] ? "loading" : "error"
    );
    const [errorMessage, setErrorMessage] = useState(() => isWebXRAvailable()[1]);
    const xrSession = useRef<XRSession | null>(null); //TODO : renderer.xr.getSession instead ?

    //TODO : What if provided renderer changes ? Effect ?

    // Check if the XR session is supported once the component is mounted because the check is async.
    useEffect(() => {
        // Check if we could start a VR session (we are on mobile, or on PC with VR gear).
        // We have already checked if xr is undefined when intializing state.
        navigator.xr
            ?.isSessionSupported("immersive-vr")
            .then((supported) => {
                if (supported) {
                    setState("off");
                } else {
                    setState("error");
                    setErrorMessage("VR not available");
                }
            })
            .catch((error: unknown) => {
                setState("error");
                setErrorMessage("Something went wrong");
                console.log(error);
            });
    }, []);

    function startXRSession() {
        navigator
            .xr!.requestSession("immersive-vr", sessionOptions)
            .then((session) => {
                setState("on");
                xrSession.current = session;
                xrSession.current.addEventListener("end", endXRSession);
                return renderer.xr.setSession(xrSession.current);
            })
            .catch((error: unknown) => {
                setState("error");
                setErrorMessage("Can't start VR");
                console.warn(error);
            });
    }

    function endXRSession() {
        setState("off");
        xrSession.current?.removeEventListener("end", endXRSession);
    }

    let button: ReactNode;
    if (state === "off") {
        button = (
            <Button size={"md"} rightSection={<IconCardboards />} onClick={startXRSession}>
                Enter VR
            </Button>
        );
    } else if (state === "on") {
        button = (
            <Button size={"md"} rightSection={<IconCardboardsOff />} onClick={endXRSession}>
                Exit VR
            </Button>
        );
    } else if (state === "error") {
        button = (
            <Button
                size={"md"}
                data-disabled
                onClick={(event) => {
                    event.preventDefault();
                }}
                rightSection={<IconCardboardsOff />}
            >
                {errorMessage}
            </Button>
        );
    } else {
        // state is "loading"
        button = (
            <Button
                size={"md"}
                data-disabled
                onClick={(event) => {
                    event.preventDefault();
                }}
                rightSection={<IconCardboards />}
            >
                WebXR is loading
            </Button>
        );
    }

    return button;
}

/**
 * Function used to help initialize WebXRButton's state.
 * @returns an array of two values :
 * - The first is a boolean showing whether WebXR is available.
 * - The second is a string showing, if WebXR isn't available, why that is.
 */
function isWebXRAvailable(): [boolean, string] {
    // Follows the "WebXR application life cycle" page of MDN.
    // https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Lifecycle
    // https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown

    // Check if XR is available on the browser.
    if (navigator.xr === undefined) {
        // Check if we are running in a secure context.
        if (!window.isSecureContext) {
            return [false, "WebXR needs HTTPS"];
        } else {
            return [false, "WebXR not supported by browser"];
        }
        //TODO Not supported. - Other browser. More checks for desktop env / mobile to customize message ?
        // TODO : Polyfill ? https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Startup_and_shutdown#falling_back_to_the_webxr_polyfill
    }
    return [true, "NOERRORMESSAGE"];
}
