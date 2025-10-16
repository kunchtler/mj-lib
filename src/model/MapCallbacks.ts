export type MapCallbacksParams<K, V> = {
    onSetElement?: (key: K, value: V) => void;
    onDeleteElement?: (key: K, value?: V) => void;
    entries?: Iterable<[K, V]>;
};

export class MapCallbacks<K, V> extends Map<K, V> {
    onSetElement?: (key: K, value: V) => void;
    onDeleteElement?: (key: K, value?: V) => void;

    constructor({ onSetElement, onDeleteElement, entries }: MapCallbacksParams<K, V> = {}) {
        // We don't call the parent with entries as we first need to set the callback functions.
        super();
        this.onSetElement = onSetElement;
        this.onDeleteElement = onDeleteElement;
        if (entries !== undefined) {
            for (const [key, value] of entries) {
                this.set(key, value);
            }
        }
    }

    set(key: K, value: V): this {
        if (this.onSetElement !== undefined) {
            if (this.has(key)) {
                this.delete(key);
            }
            this.onSetElement(key, value);
        }
        return super.set(key, value);
    }

    delete(key: K): boolean {
        if (this.onDeleteElement !== undefined) {
            this.onDeleteElement(key, this.get(key));
        }
        return super.delete(key);
    }

    clear(): void {
        // We can't call super.clean() as it wouldn't call super.delete.
        for (const key of this.keys()) {
            this.delete(key);
        }
    }
}

// Test
// const x = new MapCalls<number, number>({
//     onSetElement: (key, value) => {
//         console.log("Added", key, value);
//     },
//     onDeleteElement: (key, value) => {
//         console.log("Removed", key, value);
//     },
//     entries: [
//         [1, 1],
//         [2, 2],
//         [3, 3]
//     ]
// });
// x.set(4, 4);
// x.set(3, 3.5);
// x.delete(1);
// x.clear();
