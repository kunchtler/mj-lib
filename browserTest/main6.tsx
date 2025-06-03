import * as THREE from "three";

import { VRButton } from "three/addons/webxr/VRButton.js";

import { HTMLMesh } from "three/addons/interactive/HTMLMesh.js";
import { InteractiveGroup } from "three/addons/interactive/InteractiveGroup.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Simulator } from "../src/MusicalJuggling";

const canvas = document.createElement("canvas");
document.body.append(canvas);
canvas.className = "simulator";

const simulator = new Simulator({ canvas: canvas });

// document.body.append(element);

// const mesh = new HTMLMesh(element);
// mesh.position.x = -0.75;
// mesh.position.y = 1.5;
// mesh.position.z = -0.5;
// mesh.rotation.y = Math.PI / 4;
// mesh.scale.setScalar(2);
// scene.add(mesh);
