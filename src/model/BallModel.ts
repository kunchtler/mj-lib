import { BallEvent } from "./timelines/BallTimeline";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition } from "./BallPhysics";
import { PerformanceModelRef } from "./PerformanceChild";
import { Object3D, Vector3 } from "three";
import { VERY_VERY_FAR_VEC } from "./PerformanceModel";
import { localToWorldPosition, localToWorldVector, worldToLocalPosition } from "../utils";
import { SpotModel } from "./SpotModel";

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
    // scale?: Vector3;
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

    // scale: ThreeSyncedScale;

    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline: BallTimeline;

    performance: PerformanceModelRef;

    readonly _object = new Object3D();

    constructor({ radius, id, timeline }: BallModelParams) {
        this.id = id;
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
        this.performance = new PerformanceModelRef();
        // this.scale = new ThreeSyncedScale(this._object, scale);
    }

    // scaledRadius(): number {

    // }

    scaledRadiusInObjectBasis(obj: Object3D): Vector3 {
        // TODO : Handle the fact that the ball's scale may not be the same number on all axis... I'm sad...
        // const radius =  this.radius * Math.max(...this.scale.getGlobal());
        const objWorldScale = obj.getWorldScale(new Vector3());
        return new Vector3(
            this.radius / objWorldScale.x,
            this.radius / objWorldScale.y,
            this.radius / objWorldScale.z
        );
        // return new Vector3(this.radius);
    }

    positionOverSpot(spotModel: SpotModel): Vector3 {
        // We proceed in world space as local space may have a scale (thus negating the axes).
        const spotWorldPos = spotModel.position.getGlobal();
        const spotUpWorldVec = localToWorldVector(new Vector3(0, 1, 0), spotModel._object);
        return spotWorldPos.add(spotUpWorldVec.multiplyScalar(this.radius));
    }

    /**
     * Returns the ball's position at a specific event from the timeline.
     * @param ev the event.
     * @returns the position where that event occurs.
     */
    positionAtEvent(evTime: number | null, ev: BallEvent | null): Vector3 | null {
        if (evTime === null || ev === null) {
            return null;
        } else if (ev.type === "airborne") {
            // At this event, the ball has just been launched in the air.
            // To know where from it is tossed, we look at the previous event.
            // Note that this only give the origin space of the toss.
            // The toss still happens at time timeEv.
            const [, prevEv] = this.timeline.prevEvent(evTime, true);
            if (prevEv === null) {
                // We can't guess where the ball was tossed from.
                return null;
            } else if (prevEv.type === "airborne") {
                // Impossible, the ball won't be tossed twice before falling.
                return null;
            } else if (prevEv.type === "table") {
                // Sure, it is weird, the ball was tossed from the table...
                // But is seems funny to be able to do so.
                const spotModel = this.performance
                    .getSurely()
                    .tables.getSurely(prevEv.tableID)
                    .getSpotModel(prevEv.tableSpot);
                return this.positionOverSpot(spotModel);
            } else {
                // The ball was in a juggler's hands, where there must be a matching
                // event at toss time (to stop position computation recursion).
                const handModel = this.performance
                    .getSurely()
                    .getHand(prevEv.jugglerName, prevEv.rightHand);
                const handEv = handModel.timeline.getElementByKey(evTime);
                if (handEv === undefined) {
                    return null;
                }
                // We need to compute where the hand would be to get the correct spot position
                // where the ball is.
                const spotModel = handModel.getSpotModel(prevEv.posIdx);
                const handPosRot = handModel.localPositionAndRotationAtEvent(evTime, handEv);
                handModel._dummyObject.setProperties(handPosRot);
                const ballPos = this.positionOverSpot(spotModel);
                handModel._dummyObject.unsetProperties();
                return ballPos;
            }
        } else if (ev.type === "held") {
            // We need to compute where the hand would be to get the correct
            // spot position where the ball is.
            // (The held event may not match with an event in hand (it does
            // when the ball is caught or tossed, but does not necessarily
            // when the ball changes hand subspot)).
            const handModel = this.performance.getSurely().getHand(ev.jugglerName, ev.rightHand);
            const spotModel = handModel.getSpotModel(ev.posIdx);
            const handPosRotSca = handModel.localPositionAndRotationAtTime(evTime);
            handModel._dummyObject.setProperties(handPosRotSca);
            const ballPos = this.positionOverSpot(spotModel);
            handModel._dummyObject.unsetProperties();
            return ballPos;
        } else {
            // The table won't move, so nor do its spots.
            const spotModel = this.performance
                .getSurely()
                .tables.getSurely(ev.tableID)
                .getSpotModel(ev.tableSpot);
            return this.positionOverSpot(spotModel);
        }
    }

    /** Returns the ball's position at a given time.
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    positionAtTime(time: number): Vector3 {
        const [prevEvTime, prevEv] = this.timeline.prevEvent(time);

        if (prevEv === null) {
            // We need to look at the next event to figure out where the ball should be.
            const [nextEvTime, nextEv] = this.timeline.nextEvent(time);
            if (nextEv === null) {
                // The ball has no event in its timeline. It goes nowhere.
                return this.positionAtEvent(nextEvTime, nextEv) ?? VERY_VERY_FAR_VEC.clone();
            } else if (nextEv.type === "airborne") {
                // The ball was tossed, but we don't know from where.
                return this.positionAtEvent(nextEvTime, nextEv) ?? VERY_VERY_FAR_VEC.clone();
            } else if (nextEv.type === "held") {
                // The ball is held, so it is in hand and we look at where the hand is to get where the spot the ball is on is.
                const handModel = this.performance
                    .getSurely()
                    .getHand(nextEv.jugglerName, nextEv.rightHand);
                const spotModel = handModel.getSpotModel(nextEv.posIdx);
                const handPosRotSca = handModel.localPositionAndRotationAtTime(nextEvTime);
                handModel._dummyObject.setProperties(handPosRotSca);
                const ballPos = this.positionOverSpot(spotModel);
                handModel._dummyObject.unsetProperties();
                return ballPos;
            } else {
                // Get the position when set on table.
                return this.positionAtEvent(nextEvTime, nextEv) ?? VERY_VERY_FAR_VEC.clone();
            }
        } else if (prevEv.type === "airborne") {
            // If the ball toss and catch positions are computable, make it fly.
            const posAtToss = this.positionAtEvent(prevEvTime, prevEv);
            const [nextEvTime, nextEv] = this.timeline.nextEvent(time);
            const posAtCatch = this.positionAtEvent(nextEvTime, nextEv);
            if (posAtToss === null || posAtCatch === null || nextEvTime === null) {
                return VERY_VERY_FAR_VEC.clone();
            }
            return ballPosition(posAtToss, prevEvTime, posAtCatch, nextEvTime, time);
        } else if (prevEv.type === "held") {
            // We ask the hand where the spot is.
            // TODO : Place in the correct spot, and if needed have spot transition.
            const [nextEvTime, nextEv] = this.timeline.nextEvent(time);
            const handModel = this.performance
                .getSurely()
                .getHand(prevEv.jugglerName, prevEv.rightHand);
            // 1. We look for the spot of the previous event, and the spot of the next event.
            const prevEvSpotModel = handModel.getSpotModel(prevEv.posIdx);
            const nextEvSpotIdx =
                nextEv !== null && nextEv.type === "held" ? nextEv.posIdx : prevEv.posIdx;
            const nextEvSpotModel = handModel.getSpotModel(nextEvSpotIdx);
            // 2. We compute where the hand is.
            const handPosRot = handModel.localPositionAndRotationAtTime(time);
            handModel._dummyObject.setProperties(handPosRot);
            // 3. We grab the local spots positions and interpolate in local space.
            // (hence the "true" in positionOverSpot).
            const prevEvSpotHandPos = worldToLocalPosition(
                this.positionOverSpot(prevEvSpotModel),
                handModel._dummyObject.get()
            );
            const nextEvSpotHandPos = worldToLocalPosition(
                this.positionOverSpot(nextEvSpotModel),
                handModel._dummyObject.get()
            );
            const alpha = nextEvTime === null ? 1 : (time - prevEvTime) / (nextEvTime - prevEvTime);
            const ballHandPos = prevEvSpotHandPos.clone().lerp(nextEvSpotHandPos, alpha);
            const globalBallPos = localToWorldPosition(ballHandPos, handModel._dummyObject.get());
            // 4. Don't forget to undo the dummy object position's.
            handModel._dummyObject.unsetProperties();
            return globalBallPos;
        } else {
            return this.positionAtEvent(prevEvTime, prevEv) ?? VERY_VERY_FAR_VEC.clone();
        }
    }

    // rotation(time: number) {
    // We need to match the hand's rotation when held
    //TODO : What about when the hand is at an angle :/
    // }
}
