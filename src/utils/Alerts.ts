import { AlertsTimeline } from "./AlertsTimeline";
import { Clock } from "./Clock";
import { EventDispatcher } from "./EventDispatcher";
import { BaseEvent } from "../model";

type AlertsEvents =
    | "sup"
    | "inf"
    | "instant";

export interface AlertEvent {
    _ballRef: WeakRef<{ id: string }>;
    actionDescription: 'caught' | 'tossed' | string;
    time: number;
}

export class Alerts extends EventDispatcher<AlertsEvents> {

    clock: Clock;
    timeline: AlertsTimeline;
    lastTime: number;
    lastPreviousEntry: [BaseEvent, string] | null;

    constructor(timeline: AlertsTimeline, clock: Clock){
        super();
        this.timeline = timeline;
        this.clock = clock;
        this.lastTime = clock.getTime() ?? 0;
        this.lastPreviousEntry = timeline.prevEvent(this.lastTime)[1];
        this._setListener(clock);
    }

    _setListener(clock: Clock){
        clock.addEventListener('play', () => {
            
        });

        clock.addEventListener('timeUpdate', () => {
            let currentTime = this.clock.getTime();

            const prevEntry = this.timeline.prevEvent(currentTime)[1];
            if(!prevEntry){
                return;
            }
            const [prevEvent, prevBorne] = prevEntry;

            let event, borne;
            if(this.lastPreviousEntry){
                [event, borne] = this.lastPreviousEntry;
            }

            //if prevEvent are the same then there is no new event to play
            if(prevEvent == event 
                && prevBorne == borne){
                return;
            }

            //otherwise, we must play every event between the last prev event and the new one

            let iterator = this.timeline.upperBound(this.lastTime);

            //If the time is set from the past, play all actions from the beginning to the new time.
            if(this.lastTime > currentTime){
                iterator = this.timeline.lowerBound(0);
            }
            
            let time;
            while(!(event == prevEvent && borne == prevBorne)  && iterator.isAccessible()){
                [time, [event, borne]] = iterator.pointer;
                if(time < currentTime){
                    //console.log(time + "s ("+ borne +"): "  + event.stringify());
                    if(borne == 'sup' || borne == 'inf' || borne == 'instant'){
                        this.dispatchEvent(borne, event, time);
                    }
                }
                iterator.next();
            }

            this.lastPreviousEntry = prevEntry;
            this.lastTime = currentTime;
        })

        clock.addEventListener('pause', () => {
            const time = clock.getTime();
            this.lastPreviousEntry = this.timeline.prevEvent(time)[1];
            this.lastTime = time;
        })
        
    }

}