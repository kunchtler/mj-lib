// useLazyRef.ts
import { RefObject, useRef } from "react";

/**
 * Creates a ref with function initialization. Similarly to useState, this allows the function to be run only when the ref is called for the first time, and not on subsequent renders of the component.
 * @param initializer an initializer function.
 * @returns a React Ref Object.
 */
export function useLazyRef<T>(initializer: () => T): RefObject<T> {
    const ref = useRef<T>(null!);
    if (ref.current === null) {
        ref.current = initializer();
    }
    return ref;
}
