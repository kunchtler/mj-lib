/**
 * Example based on the original example of threex.htmlmixer basic demo.
 *
 * @see https://github.com/jeromeetienne/threex.htmlmixer/blob/master/examples/basic.html
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import THREEx from "../../src/utils/threex.htmlmixer-continued/index";
import { VRButton } from "three/examples/jsm/Addons.js";

const renderer = new THREE.WebGLRenderer({
    // alpha: true
    antialias: true
});
// renderer.autoClear = false;
// renderer.setClearAlpha(0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const updateFcts: ((delta: number, now: number) => unknown)[] = [];
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.z = 3;

// Create THREEx.HtmlMixer
const mixerContext = new THREEx.htmlMixer.HtmlMixerContext(renderer, camera);

// Handle window resize for mixerContext
window.addEventListener(
    "resize",
    function () {
        mixerContext.rendererCss.setSize(window.innerWidth, window.innerHeight);
    },
    false
);

// MixerContext configuration and dom attachment

// set up rendererCss
const rendererCss = mixerContext.rendererCss;
rendererCss.setSize(window.innerWidth, window.innerHeight);
// set up rendererWebgl
const rendererWebgl = mixerContext.rendererWebgl;

const css3dElement = rendererCss.domElement;
// css3dElement.style.position = "absolute";
// css3dElement.style.top = "0px";
// css3dElement.style.width = "100%";
// css3dElement.style.height = "100%";
document.body.appendChild(css3dElement);

const webglCanvas = rendererWebgl.domElement;
webglCanvas.style.position = "absolute";
webglCanvas.style.top = "0px";
webglCanvas.style.width = "100%";
webglCanvas.style.height = "100%";
webglCanvas.style.pointerEvents = "none";
css3dElement.appendChild(webglCanvas);

// Create a Plane for THREEx.HtmlMixer
// Create the iframe element
// const url = "https://nicolas.thiery.name/leo";
// const domElement = document.createElement("iframe");
// domElement.src = url;
// domElement.style.border = "none";
const domElement = document.createElement("button");
domElement.textContent = "Boutton";

// Create the plane

const mixerPlane = new THREEx.htmlMixer.HtmlMixerPlane(mixerContext, domElement);
mixerPlane.object3d.scale.multiplyScalar(2);
mixerPlane.object3d.rotation.set(-Math.PI / 3, 0.5, 0);
// mixerPlane.object3d.material.side = THREE.DoubleSide;
scene.add(mixerPlane.object3d);
scene.background = new THREE.Color(0x444444);

// Camera Controls
new OrbitControls(camera, rendererCss.domElement);

// Handle resize
function onResize() {
    // notify the renderer of the size change
    renderer.setSize(window.innerWidth, window.innerHeight);
    // update the camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

window.addEventListener("resize", onResize, false);

renderer.xr.enabled = true;
renderer.setAnimationLoop(() => {
    mixerContext.update();
    renderer.render(scene, camera);
});

// requestAnimationFrame(function animate() {
//     requestAnimationFrame(animate);
//     mixerContext.update();
//     renderer.render(scene, camera);
// });
