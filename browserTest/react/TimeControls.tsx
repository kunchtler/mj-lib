/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
/* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
import { ReactNode, useEffect, useRef, useState } from "react";
import { TimeConductor } from "../../src/MusicalJuggling";
import { ActionIcon, Group, Slider, Text } from "@mantine/core";
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconRotate } from "@tabler/icons-react";

//TODO : Handle loading state ?
//TODO : Bounds in UI or in COnductor ?
//TODO : Rename Conductor to Clock ?
//TODO : TimeUpdate in UI rather ? Or in controller ? If in controller, allows queries to stop when timer does not change.
//TODO : In timeconductor, have bounds to allow reachedend to trigger.
//TODO : Button logo animation ?
//TODO : Have slider on its line by itself to have consistent width (not depending on label or icon).
//TODO : smooth slider (with requestAnimationframe ? Here rather tahn in conductor ?)
//TODO: Playbackrate, gravity, note spread functions.

const DEFAULT_BOUNDS = [0, 20];
type TimeState = "playing" | "paused" | "reachedEnd";

export function TimeControls({ timeConductor }: { timeConductor: TimeConductor }) {
    // The timeConductor is the single truth source here, so UI callbacks should
    // interact with timeConductor instead of setting their own state.

    const [status, setStatus] = useState<TimeState>(
        timeConductor.isPaused() ? "paused" : "playing"
    );
    const [statusBeforeSliderChange, setStatusBeforeSliderChange] = useState<TimeState | undefined>(
        undefined
    );
    const [bounds, setBounds] = useState<[number, number]>([
        timeConductor.getBounds()[0] ?? DEFAULT_BOUNDS[0],
        timeConductor.getBounds()[1] ?? DEFAULT_BOUNDS[1]
    ]);
    const [time, setTime] = useState(timeConductor.getTime());
    const [playbackRate, setPlaybackRate] = useState(timeConductor.getPlaybackRate());

    useEffect(() => {
        // Sets the various states in case the timeConductor has changed.
        setStatus(timeConductor.isPaused() ? "paused" : "playing");
        setStatusBeforeSliderChange(undefined);
        setBounds([
            timeConductor.getBounds()[0] ?? DEFAULT_BOUNDS[0],
            timeConductor.getBounds()[1] ?? DEFAULT_BOUNDS[1]
        ]);
        setTime(timeConductor.getTime());
        setPlaybackRate(timeConductor.getPlaybackRate());

        // Adds event listeners, and store their removal method in an array.
        const removeEventListeners: (() => void)[] = [];
        removeEventListeners.push(
            timeConductor.addEventListener("play", () => {
                setStatus("playing");
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("pause", () => {
                setStatus("paused");
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("reachedEnd", () => {
                setStatus("reachedEnd");
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("timeUpdate", () => {
                setTime(timeConductor.getTime());
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("playbackRateChange", () => {
                setPlaybackRate(timeConductor.getPlaybackRate());
            })
        );
        removeEventListeners.push(
            timeConductor.addEventListener("boundsChange", () => {
                setBounds([
                    timeConductor.getBounds()[0] ?? DEFAULT_BOUNDS[0],
                    timeConductor.getBounds()[1] ?? DEFAULT_BOUNDS[1]
                ]);
            })
        );

        // Return a function to remove all event listeners.
        return () => {
            removeEventListeners.forEach((callback) => {
                callback();
            });
        };
    }, [timeConductor]);

    function onButtonClick() {
        if (status === "playing") {
            timeConductor.pause();
        } else if (status === "paused") {
            timeConductor.play().catch((error: unknown) => {
                console.warn(error);
            });
        } else {
            timeConductor.setTime(bounds[0]);
            timeConductor.play().catch((error: unknown) => {
                console.warn(error);
            });
        }
    }

    function onSliderChange(value: number) {
        // We pause playback when going through the slider.
        // We remember what the status was before interaction to figure out by the end (when mouse is unpressed) whether we should resume playback.
        if (statusBeforeSliderChange === undefined) {
            setStatusBeforeSliderChange(status);
        }
        if (status !== "paused") {
            timeConductor.pause();
        }
        timeConductor.setTime(value);
    }

    function onSliderChangeEnd(value: number) {
        timeConductor.setTime(value);
        if (statusBeforeSliderChange === "reachedEnd" || statusBeforeSliderChange === "playing") {
            timeConductor.play().catch((error: unknown) => {
                console.warn(error);
            });
        }
        setStatusBeforeSliderChange(undefined);
    }

    let icon: ReactNode;
    if (status === "playing") {
        icon = <IconPlayerPauseFilled />;
    } else if (status === "paused") {
        icon = <IconPlayerPlayFilled />;
    } else {
        icon = <IconRotate />;
    }

    return (
        <Group p={"xs"}>
            <ActionIcon onClick={onButtonClick}>{icon}</ActionIcon>
            <Slider
                flex="1"
                min={bounds[0]}
                max={bounds[1]}
                step={0.01}
                value={time}
                onChange={onSliderChange}
                onChangeEnd={onSliderChangeEnd}
                label={formatTime(time)}
            ></Slider>
            <Text>{`${formatTime(time)} / ${formatTime(bounds[1])}`}</Text>
        </Group>
    );
}

/**
 * Converts time to a friendly string format.
 * E.g. : 90s -> 1:30
 * @param time The time in seconds.
 * @return The formatted string.
 */
function formatTime(time: number, showMilliseconds = false): string {
    let text = "";
    if (time < 0) {
        time = -time;
        text += "-";
    }
    let hoursDefined = false;
    if (time >= 3600) {
        hoursDefined = true;
        text += `${Math.floor(time / 3600)}:`;
        time = time % 3600;
    }
    const nbMinutes = Math.floor(time / 60);
    if (hoursDefined && nbMinutes < 10) {
        text += "0";
    }
    text += `${nbMinutes}:`;
    const nbSeconds = Math.floor(time % 60);
    // time = time % 60
    if (nbSeconds < 10) {
        text += "0";
    }
    text += `${nbSeconds}`;
    // if (showMilliseconds) {
    //     text +=
    // }
    return text;
}
