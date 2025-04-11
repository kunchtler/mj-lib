import * as THREE from "three";

export class Object3DHelper extends THREE.Group {
    constructor(showPoint = true, color: number | string = 0x000000, showAxes = true) {
        super();
        if (showPoint) {
            const geometry = new THREE.SphereGeometry(0.1, 4, 2);
            const material = new THREE.MeshBasicMaterial({
                wireframe: true,
                fog: false,
                toneMapped: false,
                color: color
            });
            const mesh = new THREE.Mesh(geometry, material);
            this.add(mesh);
        }
        if (showAxes) {
            const axes = new THREE.AxesHelper(0.15);
            this.add(axes);
        }
    }
}
