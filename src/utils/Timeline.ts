import { OrderedMap } from "js-sdsl";

//TODO : Methods to create / modify / delete events without interacting with OrderedMap directly ?
//TODO : Rename key to time ?
// (and to not mess up modifying or fusing of events for instance)
/**
 * Generic timeline class. Allows a single event to exist at different times.
 * Internally, uses js-sdsl OrderedMap class to keep elements ordered as they are added.
 */
export class Timeline<TimeType, EventType> extends OrderedMap<TimeType, EventType> {
    /**
     * Get the closest event before a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is < or <= than the time we're looking for.
     * Defaults to <.
     * @returns
     * - [null, null] if no event is after the target time.
     * - [time, event] otherwise.
     */
    prevEvent(time: TimeType, strict = false): [TimeType, EventType] | [null, null] {
        const it = strict ? this.reverseUpperBound(time) : this.reverseLowerBound(time);
        //We make a copy of the contents of the list because the list itself
        //is a proxy otherwise (which has unfridenly console.logs).
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    /**
     * Get the closest event after a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is > or >= than the time we're looking for.
     * Defaults to >=.
     * @returns
     * - [null, null] if no event is before the target time.
     * - [time, event] otherwise.
     */
    nextEvent(time: TimeType, strict = true): [TimeType, EventType] | [null, null] {
        const it = strict ? this.upperBound(time) : this.lowerBound(time);
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    /**
     * Get the bounds (first and last event) of the timeline.
     * @returns
     * - [null, null] if no event is in the timeline.
     * - [startTime, endTime] otherwise.
     */
    timeBounds(): [TimeType, TimeType] | [null, null] {
        const itBegin = this.begin();
        const itEnd = this.rBegin();
        if (!itBegin.isAccessible()) {
            // We can access the beginning if and only if we can access the end.
            return [null, null];
        }
        return [itBegin.pointer[0], itEnd.pointer[0]];
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @param stringifyTime an optional function to stringify the time.
     * @param stringifyEvent an optional function to stringify the events.
     * @returns a string.
     */
    stringify(
        stringifyTime?: (key: TimeType) => string,
        stringifyEvent?: (elem: EventType) => string
    ) {
        let text = "";
        this.forEach(([time, event]) => {
            text += `\
${stringifyTime === undefined ? time : stringifyTime(time)}: \
${stringifyEvent === undefined ? event : stringifyEvent(event)}\n`;
        });
        return text;
    }
}
