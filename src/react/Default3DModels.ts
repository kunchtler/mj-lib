import * as THREE from "three";
import {
    DEFAULT_CUBE_BODY_HEIGHT,
    DEFAULT_CUBE_BODY_WIDTH,
    DEFAULT_CUBE_BODY_DEPTH,
    DEFAULT_CUBE_BODY_COLOR,
    DEFAULT_HAND_COLOR,
    DEFAULT_CIRCLE_HAND_HEIGHT_SEGMENT,
    DEFAULT_CIRCLE_HAND_RADIUS,
    DEFAULT_CIRCLE_HAND_WIDTH_SEGMENT,
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT,
    DEFAULT_TABLE_COLOR,
    DEFAULT_TABLE_DEPTH,
    DEFAULT_TABLE_HEIGHT,
    DEFAULT_TABLE_WIDTH,
    DEFAULT_CUBE_HAND_LENGTH,
    DEFAULT_CUBE_HAND_WIDTH,
    DEFAULT_CUBE_HAND_DEPTH
} from "../constants/miseEnSceneDefaultValues";

export function createJugglerCubeGeometry({
    height = DEFAULT_CUBE_BODY_HEIGHT,
    width = DEFAULT_CUBE_BODY_WIDTH,
    depth = DEFAULT_CUBE_BODY_DEPTH
}: { height?: number; width?: number; depth?: number } = {}): THREE.BufferGeometry {
    const geometry = new THREE.BoxGeometry(depth, height, width);
    geometry.translate(0, height / 2, 0);
    return geometry;
    //this.geometry = new THREE.EdgesGeometry(basic_geometry);
    //this.material = new THREE.LineBasicMaterial({ color: "black", linewidth: 2 });
}

export function createJugglerMaterial({
    color = DEFAULT_CUBE_BODY_COLOR
}: { color?: THREE.ColorRepresentation } = {}): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({ color: color });
}

export function createCircleHandGeometry({
    radius = DEFAULT_CIRCLE_HAND_RADIUS,
    widthSegments = DEFAULT_CIRCLE_HAND_WIDTH_SEGMENT,
    heightSegments = DEFAULT_CIRCLE_HAND_HEIGHT_SEGMENT
}: {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
} = {}) {
    return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
}

export function createRectHandGeometry({
    length = DEFAULT_CUBE_HAND_LENGTH,
    width = DEFAULT_CUBE_HAND_WIDTH,
    depth = DEFAULT_CUBE_HAND_DEPTH
}: {
    length?: number;
    width?: number;
    depth?: number;
} = {}) {
    const geometry = new THREE.BoxGeometry(length, depth, width);
    geometry.translate(length / 2, depth / 2, 0);
    return geometry;
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
