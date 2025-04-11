export function createFunctionReturningSingleton<T>(createValueFunc: () => T) {
    let singleton: T | undefined = undefined;
    return function () {
        if (singleton === undefined) {
            singleton = createValueFunc();
        }
        return singleton;
    };
}
