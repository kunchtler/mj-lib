import * as THREE from "three";
import { Ball } from "./Ball";
import { Object3DHelper } from "../utils/three/Object3DHelper";

//TODO : Rename Ball_placement en balls_spot
//TODO : Change THREE.Vector2 to [number, number]
export interface TableConstructorParameters {
    tableObject?: TableObject;
    surfaceInternalSize?: [number, number];
    ballsPlacement?: Map<string, [number, number]>;
    unkownBallPosition?: [number, number];
    debug?: boolean;
}

interface TableObject {
    mesh: THREE.Mesh;
    bottomLeftCorner: THREE.Object3D;
    upRightCorner: THREE.Object3D;
}

export class Table {
    mesh: THREE.Mesh;
    bottomLeftCorner: THREE.Object3D;
    upRightCorner: THREE.Object3D;
    ballsPlacement: Map<string, [number, number]>;
    unkownBallPosition: [number, number];
    private _surfaceInternal: THREE.Object3D;

    constructor({
        tableObject,
        surfaceInternalSize,
        ballsPlacement,
        unkownBallPosition,
        debug
    }: TableConstructorParameters) {
        tableObject ??= createTableObject();
        const { mesh, bottomLeftCorner, upRightCorner } = tableObject;
        this.mesh = mesh;
        this.bottomLeftCorner = bottomLeftCorner.clone();
        this.upRightCorner = upRightCorner.clone();
        this.ballsPlacement = ballsPlacement ?? new Map<string, [number, number]>();
        this.unkownBallPosition = unkownBallPosition ?? [0, 0];
        surfaceInternalSize ??= [1, 1];
        this._surfaceInternal = new THREE.Object3D();
        this._surfaceInternal.position.copy(bottomLeftCorner.position);
        if (debug === true) {
            this._surfaceInternal.add(new Object3DHelper(true, undefined, true));
            this._surfaceInternal.add(new THREE.GridHelper(10, 10, "orange", "orange"));
        }

        const surfaceRealSize = [
            this.upRightCorner.position.x - this.bottomLeftCorner.position.x,
            this.upRightCorner.position.z - this.bottomLeftCorner.position.z
        ];
        this._surfaceInternal.scale.set(
            surfaceRealSize[1] / surfaceInternalSize[1],
            1,
            surfaceRealSize[0] / surfaceInternalSize[0]
        );

        this.mesh.add(this._surfaceInternal);
        this.mesh.add(this.bottomLeftCorner);
        this.mesh.add(this.upRightCorner);
    }

    ballPosition(ball: Ball): THREE.Vector3 {
        const pos = this.ballsPlacement.get(ball.id) ?? this.unkownBallPosition;
        return this._surfaceInternal.localToWorld(new THREE.Vector3(pos[1], ball.radius, pos[0]));
    }

    handPositionOverBall(ball: Ball): THREE.Vector3 {
        const pos = this.ballPosition(ball);
        pos.y = 3 * pos.y;
        return pos;
    }

    //TODO
    dispose(): void {
        if (this.mesh.parent !== null) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh.geometry.dispose();
        if (Array.isArray(this.mesh.material)) {
            for (const material of this.mesh.material) {
                material.dispose();
            }
        } else {
            this.mesh.material.dispose();
        }
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
