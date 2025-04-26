import { ActionIcon, Button, Divider, Group, Progress, Slider, Title } from "@mantine/core";
import { ReactNode, useState } from "react";

//TODO : volume feedback on slider ?

export function SoundSettings({}) {
    const [globalVolume, setGlobalVolume] = useState(100);
    const [jugglerVolumes, setJugglerVolumes] = useState<
        Map<string, { volume: number; mute: boolean; solo: boolean }>
    >(new Map());

    function handleGlobalVolume(value: number) {
        setGlobalVolume(value);
    }

    return (
        <>
            <Title order={1}>Volume</Title>
            <Divider size="md" />
            <Title order={2}>Global</Title>
            <Slider
                min={0}
                max={100}
                value={globalVolume}
                step={1}
                onChange={handleGlobalVolume}
            ></Slider>
            <Divider size="md" />
            <Title order={2}>Jugglers</Title>
            <Group>
                <MuteSwitch />
                <SoloSwitch />
                <Progress radius="xs" value={50}></Progress>
                <Slider min={0} max={100} value={100} step={1}></Slider>
            </Group>
            <Divider size="md" />
            <Title order={2}>Balls</Title>
            <Slider></Slider>
        </>
    );
}

export function SoundControls({}) {
    return (
        <>
            <MuteSwitch />
            <SoloSwitch />
            <Slider min={0} max={100} value={100} step={1}></Slider>
        </>
    );
}

export function ButtonSwitch({
    initialState,
    children
}: {
    initialState: boolean;
    children: ReactNode;
}) {
    const [isOn, setOn] = useState(initialState);
    function handleClick() {
        setOn(!isOn);
    }
    return (
        <Button variant={isOn ? "filled" : "outline"} onClick={handleClick}>
            {children}
        </Button>
    );
}

export function MuteSwitch({}) {
    const [isMuted, setMuted] = useState(false);
    function handleClick() {
        setMuted(!isMuted);
    }
    return (
        <Button variant={isMuted ? "filled" : "outline"} onClick={handleClick}>
            M
        </Button>
    );
}

export function SoloSwitch({}) {
    const [isSolo, setSolo] = useState(false);
    function handleClick() {
        setSolo(!isSolo);
    }
    return (
        <Button variant={isSolo ? "filled" : "outline"} onClick={handleClick}>
            S
        </Button>
    );
}
