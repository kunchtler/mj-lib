import * as THREE from "three";
import {
    AirborneBallEvent,
    BallEvent,
    HeldBallEvent,
    TableBallEvent
} from "./timelines/BallTimeline";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";
import { PerformanceChild, PerformanceChildParams } from "./PerformanceChild";

//TODO : Remove ID alltogether in the whole project for balls. We only have the name (which must be unique) and the eventual sound the ball makes.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : What is readonly ?
//TODO : velocity
//TODO : acceleration

const VERY_VERY_FAR_POS: THREE.Vector3Tuple = [0, -1000, 0];

/**
 * Interface for the constructor of BallModel.
 */
type BallModelParams = PerformanceChildParams & {
    /**
     * The unique ID of the ball that identifies it from other balls.
     */
    id: string;
    /**
     * The radius of the ball.
     */
    radius?: number;
    /**
     * The timeline of events (tosses, catches, ...) of the ball.
     */
    timeline?: BallTimeline;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a ball.
 */
export class BallModel extends PerformanceChild {
    /**
     * The radius of the ball.
     */
    radius: number;
    /**
     * The unique ID amongst of ball of the ball. TODO : Will change.
     */
    id: string;
    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline: BallTimeline;

    constructor({ radius, id, timeline, performance }: BallModelParams) {
        super({ performance });
        this.id = id;
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
    }

    /**
     * Return the ball's position on the table.
     * @param tableID the unique ID of the table in the performance.
     * @param spot the spot's name on the table if there is one, undefined otherwise.
     * @returns the position of the center of the ball.
     */
    positionOnTable(tableID: string, spot: string | undefined): THREE.Vector3 {
        const spotPos = this.performance.getTable(tableID).spotPosition(spot);
        spotPos.y += this.radius;
        return spotPos;
    }
}
