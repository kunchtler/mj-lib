export type CallbackFunction = (...args: unknown[]) => void;

// TODO : Use callback or eventListener as variable names / in doc ?
// TODO : Allow typing of signal names ?

/**
 * Implements the Observer pattern to add and remove event listeners (akin to the DOM events but for JS scripts).
 */
export class EventDispatcher<T extends string = string> {
    private _listeners = new Map<T, CallbackFunction[]>();

    /**
     * Adds a function to be callbacked when the event will be dispatched.
     * @param eventName The name of the event to react to.
     * @param callback The callback function.
     * @returns A function to later remove this event listener.
     */
    addEventListener(eventName: T, callback: CallbackFunction): () => void {
        let callbacks = this._listeners.get(eventName);
        if (callbacks === undefined) {
            callbacks = [];
            this._listeners.set(eventName, callbacks);
        }
        callbacks.push(callback);
        return () => {
            this.removeEventListener(eventName, callback);
        };
    }

    /**
     * Removes a callback from a given event.
     * @param eventName The name of the event to be removed from.
     * @param callback The callback function to remove (must be the same callback that was added with addEventListener)
     */
    private removeEventListener(eventName: T, callback: CallbackFunction): void {
        let callbacks = this._listeners.get(eventName);
        if (callbacks === undefined) {
            return;
        }
        callbacks = callbacks.filter((value) => value !== callback);
        // Remove the event name if it has no more listeners.
        if (callbacks.length === 0) {
            this._listeners.delete(eventName);
        }
    }

    /**
     * Dispatch an event by calling any callback function listening to this event.
     * @param eventName The name of the event to dispatch.
     * @param args The arguments to pass to each callback.
     */
    dispatchEvent(eventName: T, ...args: unknown[]): void {
        this._listeners.get(eventName)?.forEach((callback) => {
            callback(...args);
        });
    }

    /**
     * Remove all event listeners.
     */
    removeAllEventListeners(): void {
        this._listeners = new Map();
    }
}
