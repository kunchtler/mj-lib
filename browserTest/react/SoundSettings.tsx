import {
    ActionIcon,
    Box,
    Button,
    Center,
    Container,
    Divider,
    Group,
    Progress,
    Slider,
    Stack,
    Text,
    Title
} from "@mantine/core";
import { ReactNode, useState } from "react";
import { useImmer } from "use-immer";
import { Simulator } from "../../src/MusicalJuggling";

//TODO : volume feedback on slider ?

export function SoundSettings({ simulator }: { simulator: Simulator }) {
    const [globalVolume, updateGlobalVolume] = useImmer<{ volume: number; mute: boolean }>({
        volume: 100,
        mute: false
    });
    const [jugglerVolumes, updateJugglerVolumes] = useImmer<
        Map<string, { volume: number; mute: boolean; solo: boolean }>
    >(
        new Map([
            ["Nicolas", { volume: 100, mute: false, solo: false }],
            ["Léo", { volume: 80, mute: true, solo: false }]
        ])
    );

    function handleGlobalVolume(value: number) {
        updateGlobalVolume((draft) => {
            draft.volume = value;
        });
        simulator.setMasterVolume(value);
    }

    function handleJugglerChange(name: string, value: number) {
        updateJugglerVolumes((draft) => {
            draft.get(name)!.volume = value;
        });
    }

    function onSoloChange(name: string, value: boolean) {
        updateJugglerVolumes((draft) => {
            draft.get(name)!.solo = value;
        });
        jugglerVolumes.values;
        /* // Simulator stuff
        simulator.setVolume()
        */
    }

    function onMuteChange(name: string, value: boolean) {
        updateJugglerVolumes((draft) => {
            draft.get(name)!.mute = value;
        });
    }

    const jugglerItems: ReactNode[] = [];
    jugglerVolumes.forEach((value, key) => {
        jugglerItems.push(
            <div key={key}>
                <Stack>
                    <Slider
                        min={0}
                        max={100}
                        value={value.volume}
                        onChange={(value) => handleJugglerChange(key, value)}
                        step={1}
                        flex={1}
                    />
                    <Group gap={"xs"}>
                        {/* <Progress radius="xs" value={50}></Progress> */}
                        <Text>{key}</Text>
                        <MuteSwitch
                            isPressed={value.mute}
                            onChange={(value) => onMuteChange(key, value)}
                        />
                        <SoloSwitch
                            isPressed={value.solo}
                            onChange={(value) => onSoloChange(key, value)}
                        />
                    </Group>
                </Stack>
            </div>
        );
    });

    return (
        <Box p="md">
            <Text size="xl">Volume</Text>
            <Divider size="md" />
            <Text size="lg">Global</Text>
            <Group>
                <Slider
                    min={0}
                    max={100}
                    value={globalVolume.volume}
                    step={1}
                    onChange={handleGlobalVolume}
                    flex={1}
                />
                {/* <MuteSwitch isPressed={value.mute} onChange={(value) => onMuteChange(key, value)} /> */}
            </Group>
            <Divider size="md" />
            <Text size="lg">Jugglers</Text>
            {jugglerItems}
            {/* <Divider size="md" />
            <Title order={2}>Balls</Title>
            <Slider></Slider> */}
        </Box>
    );
}

interface ButtonSwitchProps {
    readonly isPressed?: boolean;
    readonly onChange?: (isPressed: boolean) => void;
    children?: ReactNode;
}

export function ButtonSwitch({ isPressed, onChange, children }: ButtonSwitchProps) {
    return (
        <ActionIcon
            variant={isPressed ? "filled" : "outline"}
            onClick={onChange ? () => onChange(!isPressed) : undefined}
            size="sm"
        >
            {children}
        </ActionIcon>
    );
}

interface SoundSwitchProps {
    isPressed?: boolean;
    onChange?: React.MouseEventHandler<HTMLButtonElement>;
}

export function MuteSwitch(props: ButtonSwitchProps) {
    return <ButtonSwitch {...props}>M</ButtonSwitch>;
}

export function SoloSwitch(props: ButtonSwitchProps) {
    return <ButtonSwitch {...props}>S</ButtonSwitch>;
}
