import {
    AirborneBallEvent,
    BallEvent,
    HeldBallEvent,
    TableBallEvent
} from "./timelines/BallTimeline";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";
import { PerformanceModelRef } from "./PerformanceChild";
import { Object3D, Vector3, Vector3Tuple } from "three";
import { PerformanceModel, VERY_VERY_FAR_VEC } from "./PerformanceModel";
import { ThreeSyncedScale } from "./ThreeSyncedProperty";
import { upVectorFromRotation } from "../utils";
import { SpotModel } from "./SpotModel";
import { getHotkeyHandler } from "@mantine/hooks";

//TODO : Remove ID alltogether in the whole project for balls. We only have the name (which must be unique) and the eventual sound the ball makes.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : What is readonly ?
//TODO : velocity
//TODO : acceleration

/**
 * Interface for the constructor of BallModel.
 */
type BallModelParams = {
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
    scale?: Vector3;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a ball.
 */
export class BallModel {
    /**
     * The radius of the ball.
     */
    radius: number;
    /**
     * The unique ID amongst of ball of the ball. TODO : Will change.
     */
    id: string;

    scale: ThreeSyncedScale;

    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline: BallTimeline;

    performance: PerformanceModelRef;

    readonly _object = new Object3D();

    constructor({ radius, id, timeline, scale }: BallModelParams) {
        this.id = id;
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
        this.scale = new ThreeSyncedScale(this._object, scale);
        this.performance = new PerformanceModelRef();
    }

    scaledRadius(): number {
        // TODO : Handle the fact that the ball's scale may not be the same number on all axis... I'm sad...
        return this.radius * Math.max(...this.scale.getGlobal());
    }

    positionOverSpot(spotModel: SpotModel): Vector3 {
        return spotModel.positionOver(this.scaledRadius());
    }

    /**
     * Returns the ball's position at a specific event from the timeline.
     * @param ev the event.
     * @returns the position where that event occurs.
     */
    positionAtEvent(evTime: number, ev: BallEvent | null): Vector3 {
        if (ev === null) {
            return VERY_VERY_FAR_VEC.clone();
        } else if (ev.type === "airborne") {
            // At this event, the ball has just been launched in the air.
            // To know where from it is tossed, we look at the previous event.
            // Note that this only give the origin space of the toss.
            // The toss still happens at time timeEv.
            const [prevEvTime, prevEv] = this.timeline.prevEvent(evTime, true);
            if (prevEv === null) {
                // We can't guess where the ball was tossed from.
                return VERY_VERY_FAR_VEC.clone();
            } else if (prevEv.type === "airborne") {
                // Impossible, the ball won't be tossed twice before falling.
                return VERY_VERY_FAR_VEC.clone();
            } else if (prevEv.type === "table") {
                // Sure, it is weird, the ball was tossed from the table...
                // But is seems funny to be able to do so.
                const spotModel = this.performance
                    .get()
                    .tables.getSurely(prevEv.tableID)
                    .getSpotModel(prevEv.tableSpot);
                return this.positionOverSpot(spotModel);
            } else {
                // The ball was in a juggler's hands, where there must be a matching
                // event at toss time (to stop position computation recursion).
                const handModel = this.performance
                    .get()
                    .getHand(prevEv.jugglerName, prevEv.rightHand);
                const handEv = handModel.timeline.getElementByKey(evTime);
                if (handEv === undefined) {
                    return VERY_VERY_FAR_VEC.clone();
                }
                // We need to compute where the hand would be to get the correct spot position
                // where the ball is.
                const spotModel = handModel.getSpotModel(prevEv.posIdx);
                const handPosRotSca = handModel.propertiesAtTime(prevEvTime);
                handModel._dummyObject.setProperties(handPosRotSca);
                const ballPos = this.positionOverSpot(spotModel);
                handModel._dummyObject.unsetProperties();
                return ballPos;
            }
        } else if (ev.type === "held") {
            // We need to compute where the hand would be to get the correct spot position
            // where the ball is.
            // (The held event may not match with an event in hand (it does when the ball is
            // caught or tossed, but does not necessaril when the ball changes hand subspot)).
            const handModel = this.performance.get().getHand(ev.jugglerName, ev.rightHand);
            const spotModel = handModel.getSpotModel(ev.posIdx);
            const handPosRotSca = handModel.propertiesAtTime(evTime);
            handModel._dummyObject.setProperties(handPosRotSca);
            const ballPos = this.positionOverSpot(spotModel);
            handModel._dummyObject.unsetProperties();
            return ballPos;
        } else {
            // The table won't move, so nor does its spots.
            const spotModel = this.performance
                .get()
                .tables.getSurely(ev.tableID)
                .getSpotModel(ev.tableSpot);
            return this.positionOverSpot(spotModel);
        }
    }

    // TODO : ONLY NEED VELOCITY AT CATCH / TOSS !
    // velocityAtEvent(evTime: number, ev: BallEvent | null) {
    //     if (ev === null) {
    //         return new Vector3(0, 0, 0);
    //     } else if (ev.type === "airborne") {
    //         // Velocity on toss.
    //     } else if (ev.type === "held") {
    //         const handModel = this.performance.get().getHand(ev.jugglerName, ev.rightHand)
    //         const [prevEvTime, prevEv] = this.timeline.prevEvent(evTime, true);
    //         if (prevEv === null) {
    //             return handModel.velocityA
    //         }
    //         // Might be velocity on catch if airborne prev.
    //         // If
    //     } else {
    //     }
    // }

    velocityAtToss(
        tossPos: Vector3,
        tossTime: number,
        catchPos: Vector3,
        catchTime: number
    ): Vector3 {
        // Note: ball is already a performance's object child,
        // so velocity vec is expressed in gloabl coordinates.
        return ballVelocityAtStartEnd(tossPos, tossTime, catchPos, catchTime, true);
    }

    velocityAtCatch(
        tossPos: Vector3,
        tossTime: number,
        catchPos: Vector3,
        catchTime: number
    ): Vector3 {
        // Note: ball is already a performance's object child,
        // so velocity vec is expressed in gloabl coordinates.
        return ballVelocityAtStartEnd(tossPos, tossTime, catchPos, catchTime, false);
    }

    /** Returns the ball's position at a given time.
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    position(time: number): Vector3 {
        const [prevEvTime, prevEv] = this.timeline.prevEvent(time);

        if (prevEv === null) {
            // We need to look at the next event to figure out where the ball should be.
            const [nextEvTime, nextEv] = this.timeline.nextEvent(time);
            if (nextEv === null) {
                // The ball has no event in its timeline. It goes nowhere.
                return VERY_VERY_FAR_VEC.clone();
            } else if (nextEv.type === "airborne") {
                // The ball  was tossed, but we don't know from where.
                return this.positionAtEvent(nextEvTime, nextEv);
            } else if (nextEv.type === "held") {
                // The ball is held, so it is in hand and we look at where the hand is to get where the spot the ball is on is.
                const handModel = this.performance
                    .get()
                    .getHand(nextEv.jugglerName, nextEv.rightHand);
                const spotModel = handModel.getSpotModel(nextEv.posIdx);
                const handPosRotSca = handModel.propertiesAtTime(nextEvTime);
                handModel._dummyObject.setProperties(handPosRotSca);
                const ballPos = this.positionOverSpot(spotModel);
                handModel._dummyObject.unsetProperties();
                return ballPos;
            } else {
                // Get the position when set on table.
                return this.positionAtEvent(nextEvTime, nextEv);
            }
        } else if (prevEv.type === "airborne") {
            // Check if the ball flies toward something we can interpret as a target.
            const [nextEvTime, nextEv] = this.timeline.nextEvent(time);
            if (nextEv === null || nextEv.type === "airborne") {
                this._throwTimelineError(prevEv, nextEv);
                return VERY_VERY_FAR_VEC.clone();
            }

            // Check if the ball files from something that we can understand as an origin.
            const [, prevPrevEvent] = this.timeline.prevEvent(prevEvTime, true);
            if (prevPrevEvent === null || prevPrevEvent.type === "airborne") {
                this._throwTimelineError(prevEv, nextEv);
                return VERY_VERY_FAR_VEC.clone();
            }

            // Compute the targets.
            let toPos: Vector3;
            if (nextEv.type === "held") {
                // TODO : Compute catch position.
                toPos = this.performance
                    .getHand(nextEv.jugglerName, nextEv.rightHand)
                    .ballPositionAtEvent(time);
            } else {
                toPos = this.positionOnTable(nextEv.tableID, nextEv.tableSpot);
            }

            let fromPos: Vector3;
            if (prevPrevEvent.type === "held") {
                // TODO : Compute toss position.
                // Notice we get the hand from the prevPrevEvent,
                // But we get the toss time from the prevEvent.
                fromPos = this.performance
                    .getHand(prevPrevEvent.jugglerName, prevPrevEvent.rightHand)
                    .ballPositionAtEvent(time);
            } else {
                fromPos = this.positionOnTable(prevPrevEvent.tableID, prevPrevEvent.tableSpot);
            }

            // Compute where we are in the air.
            return ballPosition(fromPos, prevEvTime, toPos, nextEvTime, time);
        } else if (prevEv.type === "held") {
            return this.performance.getHand(prevEv.jugglerName, prevEv.rightHand).position(time);
        } else {
            return this.positionOnTable(prevEv.tableID, prevEv.tableSpot);
        }
    }
}
