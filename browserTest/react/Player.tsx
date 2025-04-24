import { Button, Group, MarkProps, Slider, Text } from "@mantine/core";
import { useRef, useState } from "react";
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from "@tabler/icons-react";
import { TimeController } from "../../src/MusicalJuggling";

type SliderMark = {
    value: number;
    label?: React.ReactNode;
};

export interface TimeController {
    getTime: () => number;
    isPaused: () => boolean;
    playbackRate?: number;
    // play?: () => void;
    // pause?: () => void;
    // playbackRate?: number;
}

export function Player({}) {
    const clock = useRef<TimeController>(null);
    const [isPlaying, setPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [minTime, setMinTime] = useState(0);
    const [maxTime, setMaxTime] = useState(10);
    // const [marks, setMarks] = useState<SliderMark[] | undefined>(undefined);

    function handleClick() {
        setPlaying(!isPlaying);
    }

    // function snapToMarks

    // const [hasEnded, setEnded] = useState(false);

    return (
        <>
            <Slider></Slider>
            <Group>
                <Button onClick={handleClick}>
                    {isPlaying ? <IconPlayerPauseFilled /> : <IconPlayerPlayFilled />}
                </Button>
                <Slider min={minTime} max={maxTime} flex={1} />
                <Text></Text>
            </Group>
        </>
    );
}
