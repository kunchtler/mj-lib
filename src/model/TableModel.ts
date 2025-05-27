import * as THREE from "three";
import { BallModel } from "./BallModel";

// TODO : Which properties are readonly ?

export interface TableConstructorParameters {
    bottomLeftCorner: THREE.Object3D;
    upRightCorner: THREE.Object3D;
    surfaceInternalSize?: [number, number];
    ballsPlacement?: Map<string, [number, number]>;
    unkownBallPosition?: [number, number];
}

/**
 * Describes a table within the model.
 */
export class TableModel {
    bottomLeftCorner: THREE.Object3D;
    upRightCorner: THREE.Object3D;
    ballsPlacement: Map<string, [number, number]>;
    unkownBallPosition: [number, number];
    private _surfaceInternal: THREE.Object3D;

    constructor({
        bottomLeftCorner,
        upRightCorner,
        surfaceInternalSize,
        ballsPlacement,
        unkownBallPosition
    }: TableConstructorParameters) {
        // tableObject ??= createTableObject();
        this.bottomLeftCorner = bottomLeftCorner;
        this.upRightCorner = upRightCorner;
        this.ballsPlacement = ballsPlacement ?? new Map<string, [number, number]>();
        this.unkownBallPosition = unkownBallPosition ?? [0, 0];
        surfaceInternalSize ??= [1, 1];
        this._surfaceInternal = new THREE.Object3D();
        this._surfaceInternal.position.copy(bottomLeftCorner.position);
        const surfaceRealSize = [
            this.upRightCorner.position.x - this.bottomLeftCorner.position.x,
            this.upRightCorner.position.z - this.bottomLeftCorner.position.z
        ];
        this._surfaceInternal.scale.set(
            surfaceRealSize[1] / surfaceInternalSize[1],
            1,
            surfaceRealSize[0] / surfaceInternalSize[0]
        );
        // this.mesh.add(this.bottomLeftCorner);
        // this.mesh.add(this.upRightCorner);
    }

    ballPosition(ball: BallModel): THREE.Vector3 {
        // TODO : Change id to name ?
        const pos = this.ballsPlacement.get(ball.id) ?? this.unkownBallPosition;
        return this._surfaceInternal.localToWorld(new THREE.Vector3(pos[1], ball.radius, pos[0]));
    }

    handPositionOverBall(ball: BallModel): THREE.Vector3 {
        const pos = this.ballPosition(ball);
        pos.y = 3 * pos.y;
        return pos;
    }
}
