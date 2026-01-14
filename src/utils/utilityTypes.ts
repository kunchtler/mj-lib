export type DeepRequired<T> = T extends readonly unknown[]
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T extends object
      ? { [K in keyof T]-?: DeepRequired<T[K]> }
      : T;

export type ElementOf<T> = T extends (infer U)[] ? U : never;

export type DeepPartial<T> = Partial<{
    [K in keyof T]: T[K] extends Partial<T[K]> ? T[K] : DeepPartial<T[K]>;
}>;
