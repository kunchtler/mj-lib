/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import * as THREE from "three";
import { resizeRendererToDisplaySize, Simulator } from "./simulator/Simulator";
import { Ball } from "./simulator/Ball";
import { Juggler } from "./simulator/Juggler";
import * as Tone from "tone";
import { TimeConductor } from "./simulator/AudioPlayer";
import { Hand } from "./simulator/Hand";
import {
    ThrowEvent,
    CatchEvent,
    HandMultiEvent,
    TablePutEvent,
    TableTakeEvent
} from "./simulator/Timeline";
import { Table } from "./simulator/Table";
import abcjs from "abcjs";

// import danubeAbc from "./music_sheets/danube.abc?raw";
// console.log(danubeAbc);

//TODO : Correct casing of variables + functions

//TODO : With react, handle volume button being pressed as interaction ?
//TODO : Add the option for no audio/normal audio/spatialized audio
//TODO : Add option to mute a juggler/some balls ?
//TODO : Change variables to oneTwoThree instead of one_two_three to comply with JS Styleguide.
//TODO : Bugged buffer load if not await in main code.
//TODO : Put code in simulator
//TODO : Cap Hand movement
//TODO : Implement juggler model
//TODO : Merge juggler geometries
//TODO : Fixer le décalage musique / image quand on utilise le slider temporel (demanderait de passer par web audio api avec controle manuel du temps ?) ou alors juste en étandant Player de Tonejs ?
//TODO : Dans petite fleur, tester le u plus petit dans les fonctions.
//TODO : Change sfx playbackrate based on music playbackrate.
//TODO : For fun, squash and stretch on the ball + Failevent
//TODO : Controles fonctionnent bien sur firefox, à voire sur chrome et tel.
//TODO : Make sfx sounds pause when simulator pauses.
//TODO : undefined or null ?

/// URL Parameters (temp) ///
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let mute_simulator = false;
if (urlParams.has("mute-simulator")) {
    mute_simulator = urlParams.get("mute-simulator") === "1";
}
let mute_video = true;
if (urlParams.has("mute-video")) {
    mute_video = urlParams.get("mute-video") === "1";
}

const play_pause_button = document.getElementById("play_button");
const seek_bar = document.getElementById("time_slider");
const play_icon = document.getElementById("play_icon");

if (
    !(
        play_pause_button instanceof HTMLButtonElement &&
        seek_bar instanceof HTMLInputElement &&
        play_icon instanceof HTMLImageElement
    )
) {
    throw Error("Couldn't grab all references from js.");
}

const time_conductor = new TimeConductor({});

const transport = Tone.getTransport();
// const transport = new TransportPlayback();
// const context = Tone.getContext();

const handle_load_end = (() => {
    let load_ready = 0;
    return () => {
        load_ready++;
        console.log(`Load count : ${load_ready}/2`);
        if (load_ready >= 2) {
            const wait_screen = document.querySelector("#wait_screen");
            if (!(wait_screen instanceof Element)) {
                throw new Error();
            }
            wait_screen.classList.add("fade_out");
            console.log("fade start");
            wait_screen.addEventListener("animationend", async () => {
                console.log("fade end");
                wait_screen.remove();
                // video.currentTime = 69;
                await time_conductor.play();
            });
        }
    };
})();

// Handling of the first user input before playing audio.re
const first_interaction_event_types = ["mousedown", "keydown", "touchstart"];

async function handle_first_interaction(event: Event) {
    await Tone.start();
    for (const event_type of first_interaction_event_types) {
        event.currentTarget?.removeEventListener(event_type, handle_first_interaction, true);
    }
    const text_element = document.querySelector("#wait_user");
    if (!(text_element instanceof HTMLParagraphElement)) {
        console.log("oups");
        // throw new Error();
    } else {
        text_element.textContent = "User interaction detected ✔️";
        console.log("Touch ok");
        handle_load_end();
    }
}

for (const event_type of first_interaction_event_types) {
    document.body.addEventListener(event_type, handle_first_interaction, true);
}

async function handle_sounds_loaded() {
    await Tone.loaded();
    const text_element = document.querySelector("#wait_load");
    if (!(text_element instanceof HTMLParagraphElement)) {
        throw new Error();
    }
    text_element.textContent = "Sound loaded ✔️";
    console.log("sound ok");
    handle_load_end();
}

const sfx_buffers = new Map<string, Tone.ToneAudioBuffer>([
    ["do", new Tone.ToneAudioBuffer("notes/C4.mp3")],
    ["re", new Tone.ToneAudioBuffer("notes/D4.mp3")],
    ["mi", new Tone.ToneAudioBuffer("notes/E4.mp3")],
    ["fa", new Tone.ToneAudioBuffer("notes/F4.mp3")],
    ["sol", new Tone.ToneAudioBuffer("notes/G4.mp3")],
    ["la", new Tone.ToneAudioBuffer("notes/A4.mp3")],
    ["si", new Tone.ToneAudioBuffer("notes/B4.mp3")],
    ["do2", new Tone.ToneAudioBuffer("notes/C5.mp3")]
]);

const sfx_gain = new Tone.Gain(mute_simulator ? 0 : 1).toDestination();
// sfx_gain.gain.value = 0;

await handle_sounds_loaded();

const simulator = new Simulator({ canvasId: "#simulator_canvas" });
const scene = simulator.scene;
const renderer = simulator.renderer;
const camera = simulator.camera;

//create_juggler_mesh(scene, 2.0, 0.5, 0.3);

simulator.jugglers = [new Juggler({ height: 2.0 }), new Juggler({ height: 2.0 })];
const vincent = simulator.jugglers[0];
const nicolas = simulator.jugglers[1];
vincent.mesh.position.set(-1, 0, 1);
nicolas.mesh.position.set(-1, 0, -1);

// const right_hand = vincent.right_hand;
// const left_hand = vincent.left_hand;
// vincent.mesh.position.set(-1, 0, 1);
// vincent.mesh.rotateY(Math.PI / 2);

//TODO : Handle properly this await (by loading the sounds for the balls only when Tone has loaded the buffer.)
await Tone.loaded();

const balls_placement: Record<string, THREE.Vector2> = {
    do: new THREE.Vector2(1, 0.5),
    doD: new THREE.Vector2(1.5, 1.5),
    re: new THREE.Vector2(2, 0.5),
    reD: new THREE.Vector2(2.5, 1.5),
    mi: new THREE.Vector2(3, 0.5),
    fa: new THREE.Vector2(4, 0.5),
    faD: new THREE.Vector2(4.5, 1.5),
    sol: new THREE.Vector2(5, 0.5),
    solD: new THREE.Vector2(7.5, 1.5),
    la: new THREE.Vector2(6, 0.5),
    laD: new THREE.Vector2(6.5, 1.5),
    si: new THREE.Vector2(7, 0.5),
    do2: new THREE.Vector2(8, 0.5)
};

//TODO : Raccourcir durée note.
const table_vincent = new Table({
    height: 0.9,
    surfaceRealDimensions: [1.1, 0.5],
    surfaceInternalSize: [9, 2],
    ballsPlacement: balls_placement
});
table_vincent.mesh.position.copy(vincent.mesh.localToWorld(new THREE.Vector3(0.9, 0, 0)));
scene.add(table_vincent.mesh);

const table_nicolas = new Table({
    height: 0.9,
    surfaceRealDimensions: [1.1, 0.5],
    surfaceInternalSize: [9, 2],
    ballsPlacement: balls_placement
});
table_nicolas.mesh.position.copy(nicolas.mesh.localToWorld(new THREE.Vector3(0.9, 0, 0)));
scene.add(table_nicolas.mesh);

for (const [color, note] of [
    ["red", "do"],
    ["orange", "re"],
    ["yellow", "mi"],
    ["green", "fa"],
    ["blue", "sol"],
    ["purple", "la"],
    ["gray", "si"],
    ["red", "do2"]
]) {
    for (const table of [table_vincent, table_nicolas]) {
        const player = new Tone.Player(sfx_buffers.get(note));
        const panner = new Tone.Panner3D({ panningModel: "HRTF", rolloffFactor: 1 });
        player.connect(panner);
        panner.connect(sfx_gain);
        simulator.balls.push(
            new Ball({
                color: color,
                radius: 0.08,
                id: note,
                sound: player,
                panner3D: panner,
                default_table: table
            })
        );
    }
}
