import * as THREE from "three";
import {
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_WIDTH,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_COLOR,
    DEFAULT_HAND_COLOR,
    DEFAULT_HAND_SPHERE_HEIGHT_SEGMENT,
    DEFAULT_HAND_SPHERE_RADIUS,
    DEFAULT_HAND_SPHERE_WIDTH_SEGMENT,
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT,
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_WIDTH
} from "../constants/miseEnSceneDefaultValues";

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

export function createHandGeometry({
    radius = DEFAULT_HAND_SPHERE_RADIUS,
    widthSegments = DEFAULT_HAND_SPHERE_WIDTH_SEGMENT,
    heightSegments = DEFAULT_HAND_SPHERE_HEIGHT_SEGMENT
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
