// index.jsx
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Your React UI component

// 1. Setup scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 1, 1000);
camera.position.set(0, 0, 5);

const webGLRenderer = new THREE.WebGLRenderer();
webGLRenderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(webGLRenderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
document.body.appendChild(cssRenderer.domElement);

// 2. Create a DOM element and render React into it
const uiElement = document.createElement('div');
uiElement.style.width = '300px';
uiElement.style.height = '200px';
uiElement.style.background = 'white';
uiElement.style.borderRadius = '10px';
uiElement.style.overflow = 'hidden'; // optional, for rounded corners

document.body.appendChild(uiElement); // Optional: only for dev tools

const root = ReactDOM.createRoot(uiElement);
root.render(<App />);

// 3. Wrap with CSS3DObject and add to scene
const cssObject = new CSS3DObject(uiElement);
cssObject.position.set(0, 0, 0);
scene.add(cssObject);

// 4. Animate
function animate() {
  requestAnimationFrame(animate);
  webGLRenderer.render(scene, camera);
  cssRenderer.render(scene, camera);
}
animate();