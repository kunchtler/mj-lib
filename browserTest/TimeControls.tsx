/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
// TODO : Find a way to remove those warnings.
// See : https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
import { ReactNode, useEffect, useRef, useState } from "react";
import { Clock } from "../src";
import { ActionIcon, Group, Slider, Text } from "@mantine/core";
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconRotate } from "@tabler/icons-react";
import { set } from "immutable";

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

export function TimeControls({ clock }: { clock: Clock }) {
    // The clock is the single truth source here, so UI callbacks should
    // interact with timeConductor instead of setting their own state.

    const [status, setStatus] = useState<TimeState>(clock.isStopped() ? "paused" : "playing");
    const [statusBeforeSliderChange, setStatusBeforeSliderChange] = useState<TimeState | undefined>(
        undefined
    );
    const [bounds, setBounds] = useState<[number, number]>(() => {
        const bounds = clock.getBounds();
        if (bounds[0] === undefined) {
            bounds[0] = DEFAULT_BOUNDS[0];
            clock.setBounds({ lowerBound: DEFAULT_BOUNDS[0] });
        }
        if (bounds[1] === undefined) {
            bounds[1] = DEFAULT_BOUNDS[1];
            clock.setBounds({ upperBound: DEFAULT_BOUNDS[1] });
        }
        console.log(bounds);
        return bounds as [number, number];
    });
    const [time, setTime] = useState(clock.getTime());
    const [playbackRate, setPlaybackRate] = useState(clock.getPlaybackRate());
    const [loop, setLoop] = useState(clock.getLoop());

    function animate() {
        console.log("animate");
        setTime(clock.getTime());
        if (clock.isTicking()) {
            requestAnimationFrame(animate);
        }
    }

    useEffect(() => {
        // Adds event listeners.
        const onStart = () => {
            setStatus("playing");
            console.log("play");
            requestAnimationFrame(animate);
        };
        const onPause = () => {
            setStatus("paused");
        };
        const onEnded = () => {
            setStatus("reachedEnd");
        };
        const onManualTimeUpdate = () => {
            setTime(clock.getTime());
        };
        const onPlaybackRateChange = () => {
            setPlaybackRate(clock.getPlaybackRate());
        };
        const onBoundsChange = () => {
            setBounds([
                clock.getBounds()[0] ?? DEFAULT_BOUNDS[0],
                clock.getBounds()[1] ?? DEFAULT_BOUNDS[1]
            ]);
        };
        const onLoopChange = () => {
            setLoop(clock.getLoop());
        };

        clock.addEventListener("start", onStart);
        clock.addEventListener("pause", onPause);
        clock.addEventListener("ended", onEnded);
        // clock.addEventListener("timeUpdate", onTimeUpdate);
        clock.addEventListener("manualTimeUpdate", onManualTimeUpdate);
        clock.addEventListener("playbackRateChange", onPlaybackRateChange);
        clock.addEventListener("boundsChange", onBoundsChange);
        clock.addEventListener("loopChange", onLoopChange);

        // Update UI with the current clock values.
        setStatus(clock.isStopped() ? "paused" : "playing");
        setStatusBeforeSliderChange(undefined);
        setBounds([
            clock.getBounds()[0] ?? DEFAULT_BOUNDS[0],
            clock.getBounds()[1] ?? DEFAULT_BOUNDS[1]
        ]);
        setTime(clock.getTime());
        setPlaybackRate(clock.getPlaybackRate());
        setLoop(clock.getLoop());

        // Start animation if needed
        if (clock.isTicking()) {
            animate();
        }

        // Return a function to remove all event listeners.
        return () => {
            clock.removeEventListener("start", onStart);
            clock.removeEventListener("pause", onPause);
            clock.removeEventListener("ended", onEnded);
            // clock.removeEventListener("timeUpdate", onTimeUpdate);
            clock.removeEventListener("manualTimeUpdate", onManualTimeUpdate);
            clock.removeEventListener("playbackRateChange", onPlaybackRateChange);
            clock.removeEventListener("boundsChange", onBoundsChange);
            clock.removeEventListener("loopChange", onLoopChange);
        };
    }, [clock]);

    function onButtonClick() {
        console.log("a");
        if (status === "playing") {
            clock.pause();
        } else if (status === "paused") {
            clock.start();
        } else {
            clock.setTime(bounds[0]);
            clock.start();
        }
    }

    function onSliderChange(value: number) {
        // We pause playback when going through the slider.
        // We remember what the status was before interaction to figure out by the end (when mouse is unpressed) whether we should resume playback.
        if (statusBeforeSliderChange === undefined) {
            setStatusBeforeSliderChange(status);
        }
        if (status !== "paused") {
            clock.pause();
        }
        clock.setTime(value);
    }

    function onSliderChangeEnd(value: number) {
        clock.setTime(value);
        if (statusBeforeSliderChange === "reachedEnd" || statusBeforeSliderChange === "playing") {
            clock.start();
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
 * @param minDigitsMinutes The minimal number of digits used to write hours (will add trailing zeros to reach it. Ex : 62 sec with 3 min digits -> 001:02)
 * @param showMilliseconds Whether to show the miliseconds or not (1:12.234)
 * @return The formatted string.
 */
function formatTime(time: number, minDigitsMinutes: number = 0, showMilliseconds = false): string {
    let text = "";
    if (time < 0) {
        time = -time;
        text += "-";
    }
    const nbMinutes = Math.floor(time / 60);
    time -= nbMinutes;
    for (let i = nbMinutes.toString.length; i <= minDigitsMinutes; i++) {
        text += "0";
    }
    text += nbMinutes.toString() + ":";
    const nbSeconds = Math.floor(time);
    if (nbSeconds < 10) {
        text += "0";
    }
    text += nbSeconds.toString();
    if (showMilliseconds) {
        text += ":" + Math.floor((time - nbSeconds) * 1000).toString();
    }
    return text;
}
