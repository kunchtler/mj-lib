import { Timeline } from "../../utils/Timeline";
import { BallTimelineEvent } from "./BallTimelineEvents";

//TODO : Fuse or rearrange names of BallTimeline and BallModel ?

/**
 * Represents the timeline of a ball in the model.
 */
export class BallTimeline extends Timeline<number, BallTimelineEvent> {
    /**
     * Add an event in the timeline (at time event.time)
     * @param ev the event to add.
     */
    addEvent(time: number, ev: BallTimelineEvent): void {
        this.setElement(time, ev);
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @returns a string.
     */
    // TODO : Add
    // stringify(): string {
    //     return super.stringify(
    //         (key) => `${key}s`,
    //         (elem) => elem.stringify()
    //     );
    // }
}
