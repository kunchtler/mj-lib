import { OrderedMap } from "js-sdsl";
import { Timeline } from "./Timeline";
import { Clock } from "three";
import { BaseEvent } from "../model";

export class AlertsTimeline extends Timeline<number, [BaseEvent, string]> {
    constructor() {
        super();
    }

    addTimeline(timeline: Timeline<number, BaseEvent>, range = 0) {
        timeline.forEach((elem) => {
            if (typeof elem[0] === "number") {
                if (range > 0) {
                    let newTime = Math.max(elem[0] - range, 0);
                    this.setElement(newTime, [elem[1], "inf"]);

                    newTime = Math.max(elem[0] + range, 0);
                    this.setElement(newTime, [elem[1], "sup"]);
                } else {
                    let newTime = Math.max(elem[0] - range, 0);
                    this.setElement(newTime, [elem[1], "instant"]);
                }
            }
        });
    }
}
