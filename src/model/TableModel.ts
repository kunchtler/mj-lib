import * as THREE from "three";
import { BallModel } from "./BallModel";

// TODO : Which properties are readonly ?
// TODO : Change surface internal by ballspots as Object3D only ?
// In that case, we can remove many attributes.
// TODO : Use ball ID or ball Name to be placed ?
// TODO : Use a normal vector to identify the table's "top".

export interface TableConstructorParameters {
    ballsPlacement?: Map<string, THREE.Object3D>;
    unkownBallPosition?: THREE.Object3D;
}

/**
 * Describes a table within the model.
 */
export class TableModel {
    ballsPlacement: Map<string, THREE.Object3D>;
    unkownBallPosition: THREE.Object3D;

    constructor({ ballsPlacement, unkownBallPosition }: TableConstructorParameters = {}) {
        this.ballsPlacement = ballsPlacement ?? new Map<string, THREE.Object3D>();
        this.unkownBallPosition = unkownBallPosition ?? new THREE.Object3D();
    }

    /**
     * Returns a ball's designated position.
     * @param ball the ball.
     * @returns the ball's spot on the table as is specified in the ballsPlacement attribute. If it is not found, it goes to a designated unknownBallPosition spot.
     */
    ballPosition(ball: BallModel): THREE.Vector3 {
        // TODO : Change id to name ?
        const positionObject = this.ballsPlacement.get(ball.name) ?? this.unkownBallPosition;
        return positionObject.getWorldPosition(new THREE.Vector3());
    }

    /**
     * Computes a spot over the ball where the hand should stop during its animation to grab it.
     * WILL CHANGE IN THE FUTURE.
     * @param ball the ball.
     * @returns the position of the hand to grab or put the ball.
     */
    handPositionOverBall(ball: BallModel): THREE.Vector3 {
        const pos = this.ballPosition(ball);
        // TODO : Up vector rather than y coordinate.
        pos.y += ball.radius * 3;
        return pos;
    }
}

// export function createTablePlacement({}: Map<string, THREE.Object3D>): 