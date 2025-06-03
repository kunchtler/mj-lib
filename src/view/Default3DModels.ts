import * as THREE from "three";

////////// Juggler //////////

export const DEFAULT_JUGGLER_CUBE_HEIGHT = 1.8;
export const DEFAULT_JUGGLER_CUBE_WIDTH = 0.5;
export const DEFAULT_JUGGLER_CUBE_DEPTH = 0.3;
export const DEFAULT_JUGGLER_CUBE_COLOR = 0x202020;
export const DEFAULT_JUGGLER_CUBE_ARM_LENGTH = 0.4;

export function createJugglerCubeGeometry({
    height = DEFAULT_JUGGLER_CUBE_HEIGHT,
    width = DEFAULT_JUGGLER_CUBE_WIDTH,
    depth = DEFAULT_JUGGLER_CUBE_DEPTH
}: { height?: number; width?: number; depth?: number } = {}): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(depth, height, width);
    geometry.translate(0, height / 2, 0);
    return geometry;
    //this.geometry = new THREE.EdgesGeometry(basic_geometry);
    //this.material = new THREE.LineBasicMaterial({ color: "black", linewidth: 2 });
}

export function createJugglerMaterial({
    color = DEFAULT_JUGGLER_CUBE_COLOR
}: { color?: THREE.ColorRepresentation } = {}): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({ color: color });
}

////////// Hand //////////

export const DEFAULT_HAND_RADIUS = 0.05;
export const DEFAULT_HAND_WIDTH_SEGMENT = 8;
export const DEFAULT_HAND_HEIGHT_SEGMENT = 4;
export const DEFAULT_HAND_COLOR = 0xffdbac;

export function createHandGeometry({
    radius = DEFAULT_HAND_RADIUS,
    widthSegments = DEFAULT_HAND_WIDTH_SEGMENT,
    heightSegments = DEFAULT_HAND_HEIGHT_SEGMENT
}: {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
} = {}) {
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
}

export function createHandMaterial({
    color = DEFAULT_HAND_COLOR
}: { color?: THREE.ColorRepresentation } = {}) {
    return new THREE.MeshPhongMaterial({ color: color });
}

////////// Ball //////////

export const DEFAULT_BALL_RADIUS = 0.1;
export const DEFAULT_BALL_WIDTH_SEGMENT = 8;
export const DEFAULT_BALL_HEIGHT_SEGMENT = 8;
export const DEFAULT_BALL_COLOR = "red";

export function createBallGeometry({
    radius = DEFAULT_BALL_RADIUS,
    widthSegments = DEFAULT_BALL_WIDTH_SEGMENT,
    heightSegments = DEFAULT_BALL_HEIGHT_SEGMENT
}: {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
} = {}) {
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
}

export function createBallMaterial({
    color = DEFAULT_BALL_COLOR
}: { color?: THREE.ColorRepresentation } = {}) {
    return new THREE.MeshPhongMaterial({ color: color });
}

////////// Table //////////

export const DEFAULT_TABLE_HEIGHT = 1.0;
export const DEFAULT_TABLE_WIDTH = 1.1;
export const DEFAULT_TABLE_DEPTH = 0.7;
export const DEFAULT_TABLE_COLOR = "maroon";

export function createTableGeometry({
    height = DEFAULT_TABLE_HEIGHT,
    width = DEFAULT_TABLE_WIDTH,
    depth = DEFAULT_TABLE_DEPTH
}: { height?: number; width?: number; depth?: number } = {}): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(depth, height, width);
    geometry.translate(0, height / 2, 0);
    return geometry;
}

export function createTableMaterial({
    color = DEFAULT_TABLE_COLOR
}: { color?: THREE.ColorRepresentation } = {}): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({ color: color });
}
