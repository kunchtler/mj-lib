import * as THREE from "three";
import { Ball } from "./Ball";
import { Object3DHelper } from "../utils/three/Object3DHelper";
import { TableModel } from "../model/TableModel";

// TODO : To debug, show the model helpers !

//TODO : Rename Ball_placement en balls_spot
//TODO : Change THREE.Vector2 to [number, number]
export interface TableConstructorParameters {
    mesh: THREE.Mesh;
    model: TableModel;
    debug?: boolean;
}

export class Table {
    mesh: THREE.Mesh;
    model: TableModel;
    private _debug: boolean;

    constructor({ mesh, debug, model }: TableConstructorParameters) {
        this.mesh = mesh;
        this.model = model;
        this._debug = debug ?? false;
        if (debug === true) {
            this.enableDebug();
        }
    }

    debugEnabled(): boolean {
        return this._debug;
    }

    enableDebug(): void {
        if (this.debugEnabled()) {
            return;
        }
        // this._surfaceInternal.add(new Object3DHelper(true, undefined, true));
        // this._surfaceInternal.add(new THREE.GridHelper(10, 10, "orange", "orange"));
        // this.mesh.add(this._surfaceInternal);
        // this.mesh.add(this.bottomLeftCorner);
        // this.mesh.add(this.upRightCorner);
        this._debug = true;
    }

    disableDebug(): void {
        if (!this.debugEnabled()) {
            return;
        }
        //TODO
        this._debug = false;
    }

    dispose(): void {
        //TODO
        this.disableDebug();
    }
}

export function createTableGeometry(height = 1, width = 1.1, depth = 0.7) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    geometry.translate(0, height / 2, 0);
    const bottomLeftObj = new THREE.Object3D();
    bottomLeftObj.position.set(-width / 2, height, -depth / 2);
    const upperRightObj = new THREE.Object3D();
    upperRightObj.position.set(-width / 2, height, -depth / 2);
    return { geometry: geometry, bottomLeftCorner: bottomLeftObj, upRightCorner: upperRightObj };
}

export function createTableMaterial(color: THREE.ColorRepresentation = "brown") {
    return new THREE.MeshPhongMaterial({ color: color });
}

// TODO : Document that parpendicular to the juggler is the width,
// parallel is the depth.
export function createTableObject(
    geometries?: {
        geometry: THREE.BufferGeometry;
        bottomLeftCorner: THREE.Object3D;
        upRightCorner: THREE.Object3D;
    },
    material?: THREE.Material
): TableObject {
    if (geometries === undefined) {
        geometries = createTableGeometry();
    }
    if (material === undefined) {
        material = createTableMaterial();
    }
    const { geometry, bottomLeftCorner, upRightCorner } = geometries;
    const mesh = new THREE.Mesh(geometry, material);
    return {
        mesh: mesh,
        bottomLeftCorner: bottomLeftCorner,
        upRightCorner: upRightCorner
    };
}
