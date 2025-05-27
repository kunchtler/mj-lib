import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function App() {
    const containerRef = useRef();
    const iframeRef = useRef();
    const planeMeshRef = useRef();

    useEffect(() => {
        const container = containerRef.current;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        camera.position.z = 5;

        // Cube
        const cubeGeometry = new THREE.BoxGeometry();
        const cubeMaterial = new THREE.MeshNormalMaterial();
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        scene.add(cube);

        // Virtual screen (plane)
        const planeGeometry = new THREE.PlaneGeometry(2, 1.5);
        const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.position.set(0, 1.5, 0);
        scene.add(planeMesh);
        planeMeshRef.current = planeMesh;

        // Resize handler
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        // Animate
        const animate = () => {
            requestAnimationFrame(animate);

            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            updateIframePosition(planeMesh, camera, iframeRef.current);

            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <>
            <div
                ref={containerRef}
                style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
            />
            <iframe
                ref={iframeRef}
                src="https://example.com"
                title="Web View"
                style={{
                    position: "absolute",
                    width: "400px",
                    height: "300px",
                    border: "none",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "auto",
                    zIndex: 10
                }}
            />
        </>
    );
}

function updateIframePosition(planeMesh, camera, iframeElement) {
    if (!planeMesh || !camera || !iframeElement) return;

    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(planeMesh.matrixWorld);
    vector.project(camera);

    const x = ((vector.x + 1) / 2) * window.innerWidth;
    const y = ((-vector.y + 1) / 2) * window.innerHeight;

    iframeElement.style.left = `${x}px`;
    iframeElement.style.top = `${y}px`;
}

import "./globalstyles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App/>
    </StrictMode>
);
