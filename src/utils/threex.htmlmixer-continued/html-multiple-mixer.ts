import * as THREE from "three";
import { HtmlMixerContext, HtmlMixerPlane, type HtmlMixerPlaneOpts } from "./html-mixer";
/**
 * Multiple context handled as one, thus able to handle multi viewport
 */
export class HtmlMultipleMixerContext {
    contexts: HtmlMixerContext[] = [];

    update() {
        this.contexts.forEach((context) => {
            context.update();
        });
    }
}

type HtmlMultipleMixerPlaneOpts = HtmlMixerPlaneOpts;

export class HtmlMultipleMixerPlane {
    public opts: HtmlMultipleMixerPlaneOpts;
    public object3d: THREE.Mesh<THREE.PlaneGeometry>;
    public planes: HtmlMixerPlane[] = [];

    constructor(
        multipleMixerContext: HtmlMultipleMixerContext,
        domElement: HTMLElement,
        opts: HtmlMultipleMixerPlaneOpts
    ) {
        this.opts = opts;
        // this.opts = JSON.parse(JSON.stringify(this.opts)); Why was this in the code in the first place ?

        const contexts = multipleMixerContext.contexts;

        const mixerContext = contexts[0];
        const plane = new HtmlMixerPlane(mixerContext, domElement, opts);

        this.planes.push(plane);

        this.object3d = plane.object3d;

        this.opts.object3d = this.object3d;

        for (let i = 1; i < contexts.length; i++) {
            const mixerContext = contexts[i];
            const cloneElement = domElement.cloneNode() as HTMLElement;
            const plane = new HtmlMixerPlane(mixerContext, cloneElement, opts);
            this.planes.push(plane);
        }
    }
    // update all context
    update = () => {
        this.planes.forEach((plane) => {
            plane.update();
        });
    };
}
