import { Timeline } from "../../utils/Timeline";
import {
    HandTimelineEvent,
    HandTimelineSingleEvent,
    HandMultiEvent,
    CatchEvent,
    TossEvent,
    TableTakeEvent
} from "./TimelineEvents";

/**
 * Represents the timeline of a hand in the model.
 *
 * NOTE : Since a hand can perform multiple "simple" events at the same time
 * (throwing or catching multiple balls at the same time), a hand's event
 * is a **multi-event** made of multiple **single-events**.
 */
export class HandTimeline extends Timeline<number, HandTimelineEvent> {
    prevEvent(time: number, strict = false): [number, HandTimelineEvent] | [null, null] {
        let lastEvent = super.prevEvent(time, strict);
        while (lastEvent[0] !== null && lastEvent[1].events.length === 0) {
            // Sanitize the event.
            this.eraseElementByKey(time);
            // Look for the previous event.
            lastEvent = super.prevEvent(lastEvent[0], strict);
        }
        return lastEvent;
    }

    nextEvent(time: number, strict = false): [number, HandTimelineEvent] | [null, null] {
        let nextEvent = super.nextEvent(time, strict);
        while (nextEvent[0] !== null && nextEvent[1].events.length === 0) {
            // Sanitize the event.
            this.eraseElementByKey(time);
            // Look for the previous event.
            nextEvent = super.nextEvent(nextEvent[0], strict);
        }
        return nextEvent;
    }

    /**
     * Add a single-event in the timeline (at time event.time).
     * If there were already events happening there, it handles them as
     * a multi-event.
     * @param singleEv the single-event to add.
     */
    addEvent(singleEv: HandTimelineSingleEvent): void {
        const it = this.find(singleEv.time);
        // Case 1: The multi-event doesn't exist, or exists but is empty.
        if (!it.isAccessible() || it.pointer[1].events.length === 0) {
            this.setElement(
                singleEv.time,
                new HandMultiEvent({
                    time: singleEv.time,
                    unitTime: singleEv.unitTime,
                    hand: singleEv.hand,
                    events: [singleEv]
                })
            );
        }
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @returns a string.
     */
    stringify(): string {
        return super.stringify(
            (key) => `${key}s`,
            (elem) => elem.stringify()
        );
    }
}
//TODO : Before launching simulation, console.log all events not sane to help debug.
//TODO : Reversed catches in parser (to better allow rhtyhmic creation ?)
/**
 * Checks if a multi-event makes sense, that is to say the only multi-events
 * allowed are :
 * - throwing / catching any number of balls.
 * - putting a single ball on the table.
 * - taking a single ball from the table.
 * @param multiEv the multi-event to check.
 * @returns true if the aforementioned conditions are satisfied.
 */
export function isMultiEventSane(multiEv: HandTimelineEvent): boolean {
    let nbCatch = 0;
    let nbToss = 0;
    let nbTableTake = 0;
    let nbTablePut = 0;
    for (const ev of multiEv.events) {
        if (ev instanceof CatchEvent) {
            nbCatch++;
        } else if (ev instanceof TossEvent) {
            nbToss++;
        } else if (ev instanceof TableTakeEvent) {
            nbTableTake++;
        } else {
            nbTablePut++;
        }
    }
    const sum = nbCatch + nbToss + nbTablePut + nbTableTake;
    return sum === nbCatch + nbToss || sum === 1;
}
