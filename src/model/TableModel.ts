import * as THREE from "three";
import { BallModel } from "./BallModel";

// TODO : Which properties are readonly ?
// TODO : Make react utility class for the many ballSpots.
// TODO : Change surface internal by ballspots as Object3D only ?
// In that case, we can remove many attributes.
// TODO : Use ball ID or ball Name to be placed ?
// TODO : Use a normal vector to identify the table's "top".
// TODO : Rename everywhere name to ID to make it clearer it should be unique ?
// TODO : Except for "implements", change evry interface to a type. Or not ? Choose. Which one has better messages (error, intellisense, ...) ?

/**
 * Interface for the constructor of TableModel.
 */
export interface TableModelParams {
    /**
     * The name of the table (yes, tables have names in this world).
     */
    name?: string;
    /**
     * Where balls go on the table.
     */
    ballsSpots?: Map<string, THREE.Vector3>;
    /**
     * Where a ball goes if it has no designated spot ?
     * It is both used as a failback and as a default way to layout balls.
     */
    unkownBallSpot?: THREE.Vector3;
}

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a table.
 */
export class TableModel {
    /**
     * The name of the table (yes, tables have names in this world).
     */
    name: string;
    /**
     * Where balls go on the table.
     */
    ballsSpots: Map<string, THREE.Vector3>;
    /**
     * Where a ball goes if it has no designated spot ?
     * It is both used as a failback and as a default way to layout balls.
     */
    unkownBallSpot: THREE.Vector3;

    constructor({ name, ballsSpots, unkownBallSpot }: TableModelParams = {}) {
        this.name = name ?? "NoName";
        this.ballsSpots = ballsSpots ?? new Map<string, THREE.Vector3>();
        this.unkownBallSpot = unkownBallSpot ?? new THREE.Vector3(0, 0, 0);
    }

    /**
     * Returns a ball's designated position.
     * @param ball the ball.
     * @returns the ball's spot on the table as is specified in the ballsSpots attribute. If it is not found, it goes to a designated unknownBallSpot.
     */
    ballPosition(ball: BallModel): THREE.Vector3 {
        // TODO : Change id to name ?
        return this.ballsSpots.get(ball.name) ?? this.unkownBallSpot;
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