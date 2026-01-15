const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    isObject(v) && v.constructor === Object;

console.log(isPlainObject({}));
console.log(isPlainObject());
