import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { VRButton as VRButtonThree } from "three/examples/jsm/webxr/VRButton.js";
import { VRButton } from "./react/VRButton";

function CanvasContainer() {
    const canvasRef = useRef(null);
    const rendererRef = useRef(null);
    const [t, setT] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;

        // Create renderer using the existing canvas
        // const simulator = new Simulator({ canvas });
        // const renderer = simulator.renderer;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        rendererRef.current = renderer;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;

        // Add VRButton to the DOM
        document.body.appendChild(VRButtonThree.createButton(renderer));

        // Set up scene, camera, etc.
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x202020);

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 1.6, 3); // height to simulate standing position in VR

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(ambientLight, directionalLight);

        // Cube
        const cubeGeometry = new THREE.BoxGeometry();
        const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.y = 1; // lift cube above ground
        scene.add(cube);

        // Plane (Ground)
        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2; // rotate to be horizontal
        scene.add(plane);

        // Animation loop
        const animate = () => {
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        };

        renderer.setAnimationLoop(animate);

        // renderer.setAnimationLoop(simulator.render);

        // Handle resize
        // const handleResize = () => {
        //     renderer.setSize(window.innerWidth, window.innerHeight);
        //     camera.aspect = window.innerWidth / window.innerHeight;
        //     camera.updateProjectionMatrix();
        // };

        // window.addEventListener("resize", handleResize);

        setT(true);

        // return () => {
        //     window.removeEventListener("resize", handleResize);
        //     renderer.setAnimationLoop(null);
        // };
    }, []);

    return (
        <>
            <canvas ref={canvasRef} />
            {t ? <VRButton renderer={rendererRef.current!} /> : <></>}
        </>
    );
}
import "./globalstyles.css";
import "@mantine/core/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { Simulator } from "../src/MusicalJuggling";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MantineProvider>
            <CanvasContainer></CanvasContainer>
        </MantineProvider>
    </StrictMode>
);
