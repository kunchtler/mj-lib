import { useEffect, useRef } from "react";
import * as THREE from "three";

class Test {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    cube: THREE.Mesh;

    constructor(canvas: HTMLCanvasElement) {
        const width = canvas.parentElement!.clientWidth;
        const height = canvas.parentElement!.clientHeight;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 5;
        this.scene = scene;
        this.camera = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
        renderer.setSize(width, height, false);
        this.renderer = renderer;

        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        this.cube = cube;

        this.animate();

        window.addEventListener("resize", this.handleResize.bind(this));
    }

    handleResize() {
        const canvas = this.renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width = Math.floor(canvas.clientWidth * pixelRatio);
        const height = Math.floor(canvas.clientHeight * pixelRatio);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        // if (canvas.width !== width || canvas.height !== height) {
        // }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.cube.rotation.x += 0.01;
        this.cube.rotation.y += 0.01;
        this.renderer.render(this.scene, this.camera);
    }
    destroy() {
        window.removeEventListener("resize", this.handleResize.bind(this));
    }
}

export function resizeRendererToDisplaySize(
    renderer: THREE.Renderer,
    camera: THREE.PerspectiveCamera
    // init_tan_fov: number,
    // init_window_height: number
) {
    const canvas = renderer.domElement;
    // const pixelRatio = window.devicePixelRatio;
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(canvas.clientWidth * pixelRatio);
    const height = Math.floor(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // camera.aspect = width / canvas.clientHeight;
        // camera.fov = (360 / Math.PI) * Math.atan(1 * (window.innerHeight / 1000));
        camera.updateProjectionMatrix();
    }
}

export default function App() {
    const mountRef = useRef(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const test = new Test(canvasRef.current!);
        return test.destroy();
    }, []);

    return (
        <div ref={mountRef} style={{ width: "100%", height: "100%", display: "block" }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
    );
}
