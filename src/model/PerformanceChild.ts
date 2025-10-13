import { PerformanceModel } from "./PerformanceModel";

export type PerformanceChildParams = { performance: PerformanceModel };

/**
 * Class inherited by all model classes contained within a performance.
 *
 * It manages an attribute to the performance (as a weak ref, to be garbage-collectable).
 */
export class PerformanceChild {
    private _performanceRef!: WeakRef<PerformanceModel>;

    constructor({ performance }: PerformanceChildParams) {
        this.performance = performance;
    }

    /**
     * The model of the performance this element is part of.
     */
    get performance(): PerformanceModel {
        const obj = this._performanceRef.deref();
        if (obj === undefined) {
            throw new Error("Performance is undefined.");
        }
        return obj;
    }

    set performance(newPerformance: PerformanceModel) {
        this._performanceRef = new WeakRef(newPerformance);
    }
}
