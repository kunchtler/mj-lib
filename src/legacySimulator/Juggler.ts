import * as THREE from "three";
import { createHandSites, Hand, HandConstructorParams, HandSiteCreationParams } from "./Hand";
// import { Object3DHelper } from "../utils/Object3DHelper";
// import { find_elbow } from "../utils/utils";
import { Table } from "./Table";
import { Object3DHelper } from "../utils/three/Object3DHelper";

//TODO : pass coordinates as vector3 rather than Object3D ?

// Bowling Pin Model

// const loader = new GLTFLoader();
// loader.load(
//     "bowling_pin.glb",
//     function (gltf) {
//         const pin = new THREE.Object3D();
//         scene.add(pin);
//         pin.add(gltf.scene);
//         gltf.scene.scale.multiplyScalar(5);
//         // @ts-ignore
//         const pin_color = // @ts-ignore
//             gltf.scene.children[0].children[0].children[0].children[0].children[0].material.color;
//         // @ts-ignore
//         gltf.scene.children[0].children[0].children[0].children[0].children[1].material.color =
//             pin_color;
//         pin.position.set(0.1, 0.3, 0);
//         const circleGeometry = new THREE.CircleGeometry(0.35, 64);
//         const textureLoader = new THREE.TextureLoader();
//         const texture = textureLoader.load("leo.jpg");
//         texture.colorSpace = THREE.SRGBColorSpace;
//         const circleMaterial = new THREE.MeshBasicMaterial({
//             // color: 0xffffff,
//             map: texture,
//             // transparent: true,
//             // toneMapped: false,
//             side: THREE.DoubleSide
//         }); // white color
//         const circle = new THREE.Mesh(circleGeometry, circleMaterial);
//         pin.add(circle);
//         circle.rotateY(Math.PI / 2);
//         circle.position.set(0.17, 1.55, 0);

//         // Create a black outline
//         const edgeGeometry = new THREE.EdgesGeometry(circleGeometry);
//         const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000 }); // black color
//         const outline = new THREE.LineLoop(edgeGeometry, edgeMaterial);
//         circle.add(outline); // Add outline as a child of the circle
//     },
//     undefined,
//     function (error) {
//         console.error(error);
//     }
// );

export interface JugglerParamConstructor {
    mesh?: THREE.Mesh;
    hands?: [Hand, Hand] | [HandConstructorParams, HandConstructorParams];
    defaultTable?: Table;
    debug?: boolean;
    allowAudio?: boolean;
    // height?: number;
    // width?: number;
    // depth?: number;
    // arm_length?: number;
    // default_table?: Table;
}

const defaultJugglerParam = { height: 1.8, width: 0.5, depth: 0.3, armLength: 0.4 };

//TODO : Optional elbows (but only if defined) ?
//TODO : Allow to toggle the audio on/off.
export class Juggler {
    mesh: THREE.Mesh;
    readonly hands: [Hand, Hand];
    defaultTable?: Table;
    gainNode?: GainNode;
    // height: number;
    // geometry: THREE.BufferGeometry;
    // material: THREE.Material;
    // jugglingOrigin: THREE.Object3D;
    // shoulder: THREE.Object3D;
    // elbow: THREE.Object3D;
    // arm_length: number;
    // target: THREE.Object3D;

    constructor({ defaultTable, hands, mesh, debug, allowAudio }: JugglerParamConstructor = {}) {
        if (mesh === undefined) {
            mesh = createJugglerMesh(
                createJugglerCubeGeometry(
                    defaultJugglerParam.height,
                    defaultJugglerParam.width,
                    defaultJugglerParam.depth
                ),
                createJugglerMaterial()
            );
        }
        this.mesh = mesh;

        if (hands === undefined) {
            const defaultOriginObject = new THREE.Object3D();
            this.mesh.add(defaultOriginObject);
            defaultOriginObject.position.set(
                defaultJugglerParam.armLength,
                defaultJugglerParam.height - 0.4 - defaultJugglerParam.armLength,
                0
            );
            if (debug ?? false) {
                defaultOriginObject.add(new Object3DHelper());
            }
            const defaultHandSiteParams: Omit<HandSiteCreationParams, "isRightHand"> = {
                centerRestDist: (defaultJugglerParam.depth * 2) / 3,
                restSiteDist: defaultJugglerParam.depth / 4,
                //TODO : Rename to better indicate that is between hands.
                jugglerJugglingPlaneOrigin: defaultOriginObject,
                rightVector: new THREE.Vector3(0, 0, 1)
            };
            const leftHand = new Hand({
                ...createHandSites({ ...defaultHandSiteParams, isRightHand: false }),
                debug: debug
            });
            const rightHand = new Hand({
                ...createHandSites({ ...defaultHandSiteParams, isRightHand: true }),
                debug: debug
            });
            this.hands = [leftHand, rightHand];
            for (const hand of this.hands) {
                defaultOriginObject.add(hand.catchSite);
                defaultOriginObject.add(hand.throwSite);
                defaultOriginObject.add(hand.restSite);
                this.mesh.add(hand.mesh);
            }
        } else if (!(hands[0] instanceof Hand)) {
            this.hands = [new Hand(hands[0]), new Hand(hands[1])];
            for (const hand of this.hands) {
                this.mesh.add(hand.mesh);
            }
        } else {
            this.hands = hands as [Hand, Hand];
        }

        this.defaultTable = defaultTable;

        allowAudio ??= true;
        if (allowAudio) {
            this.gainNode = new GainNode(THREE.AudioContext.getContext());
        }

        // this.jugglingOrigin.add(new Object3DHelper(false, undefined, false));
        // this.jugglingOrigin.position.set(arm_length, height - 0.4 - arm_length, 0);

        // this.mesh.add(this.jugglingOrigin);
        // this.jugglingOrigin.add(this.hands[0].mesh);
        // this.jugglingOrigin.add(this.hands[1].mesh);
        // this.target = new THREE.Object3D();
        // this.target.position.set(0, 0, depth / 2);
        // this.mesh.add(this.target);
        // this.target.add(new Object3DHelper(false, undefined, false));
        // this.arm_length = arm_length;
        //this.wireframe = new THREE.LineSegments(this.geometry, this.material);
        // this.jugglingOrigin = new THREE.Object3D();
        // const hand_physics_handling: HandPhysicsHandling = {
        //     // min_dist: 0.05,
        //     centerRestDist: (depth * 2) / 3,
        //     restSiteDist: depth / 4,
        //     // max_dist: depth / 2,
        //     upVector: new THREE.Vector3(0, 1, 0),
        //     rightVector: new THREE.Vector3(0, 0, 1),
        //     jugglerJugglingPlaneOrigin: this.jugglingOrigin
        // };
        // this.shoulder = new THREE.Object3D();
        // this.shoulder.position.set(0, height - 0.4, depth / 2);
        // this.mesh.add(this.shoulder);
        // this.shoulder.add(new Object3DHelper(false, undefined, false));
        // this.elbow = new THREE.Object3D();
        // this.elbow.position.set(0, 0, 0);
        // this.mesh.add(this.elbow);
        // this.elbow.add(new Object3DHelper(false, undefined, false));
    }

    get leftHand(): Hand {
        return this.hands[0];
    }

    set leftHand(hand: Hand) {
        this.hands[0] = hand;
    }

    get rightHand(): Hand {
        return this.hands[1];
    }

    set rightHand(hand: Hand) {
        this.hands[1] = hand;
    }

    patternTimeBounds(): [number, number] | [null, null] {
        let startTime: number | null = null;
        let endTime: number | null = null;
        for (const hand of this.hands) {
            const [handStartTime, handEndTime] = hand.timeline.timeBounds();
            if (startTime === null || (handStartTime !== null && startTime > handStartTime)) {
                startTime = handStartTime;
            }
            if (endTime === null || (handEndTime !== null && endTime > handEndTime)) {
                endTime = handEndTime;
            }
        }
        // @ts-expect-error startTime is null if and only if endTime is null too.
        return [startTime, endTime];
    }

    render(time: number): void {
        //Receives the time in seconds.
        this.leftHand.render(time);
        this.rightHand.render(time);
        // this.elbow.position.copy(
        //     find_elbow(
        //         this.shoulder.position,
        //         this.right_hand.position(time),
        //         this.arm_length,
        //         this.arm_length,
        //         this.target.position
        //     )
        // );
    }

    /**
     * Properly deletes the resources. Call when instance is not needed anymore to free ressources.
     */
    //TODO : Handle elbow, whole mesh, etc...
    dispose() {
        if (this.mesh.parent !== null) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh.geometry.dispose();
        if (Array.isArray(this.mesh.material)) {
            for (const material of this.mesh.material) {
                material.dispose();
            }
        } else {
            this.mesh.material.dispose();
        }
        for (const hand of this.hands) {
            hand.dispose();
        }
    }
}

export function createJugglerCubeGeometry(height = 1.8, width = 0.5, depth = 0.3) {
    const geometry = new THREE.BoxGeometry(depth, height, width);
    geometry.translate(0, height / 2, 0);
    return geometry;
    //this.geometry = new THREE.EdgesGeometry(basic_geometry);
    //this.material = new THREE.LineBasicMaterial({ color: "black", linewidth: 2 });
}

export function createJugglerMaterial(color: THREE.ColorRepresentation = 0x202020) {
    return new THREE.MeshPhongMaterial({
        color: color
    });
}

export function createJugglerMesh(geometry?: THREE.BufferGeometry, material?: THREE.Material) {
    if (geometry === undefined) {
        geometry = createJugglerCubeGeometry();
    }
    if (material === undefined) {
        material = createJugglerMaterial();
    }
    return new THREE.Mesh(geometry, material);
}

// type JugglerMesh = {
//     head: THREE.Mesh;
//     chest: THREE.Mesh;
//     right_shoulder: THREE.Mesh;
//     right_arm: THREE.Mesh;
//     right_elbow: THREE.Mesh;
//     right_forearm: THREE.Mesh;
//     right_hand: THREE.Mesh;
//     left_shoulder: THREE.Mesh;
//     left_arm: THREE.Mesh;
//     left_elbow: THREE.Mesh;
//     left_forearm: THREE.Mesh;
//     left_hand: THREE.Mesh;
//     right_leg: THREE.Mesh;
//     left_leg: THREE.Mesh;
// };
//
// export function createJugglerMeshStickman(height: number, width: number, depth: number): THREE.Mesh {
//     const top_chest_length = width;
//     const bottom_chest_length = (width * 2) / 3;
//     const chest_height = (19 / 50) * height;
//     const leg_height = (2 / 5) * height;
//     const head_height = (1 / 5) * height;
//     const head_chest_offset = (1 / 50) * height;
//     const arm_length = (2 / 3) * chest_height;
//     const arm_diameter = 0.05;
//     const shoulder_radius = 0.08;
//     const elbow_radius = 0.05;
//     const hand_length = 0.05;
//     const hand_width = 0.05 * 0.8;

//     //Chest
//     let chest_geometry: THREE.BufferGeometry = new THREE.CylinderGeometry(
//         top_chest_length * Math.SQRT1_2,
//         bottom_chest_length * Math.SQRT1_2,
//         chest_height,
//         4,
//         1
//     );
//     chest_geometry.rotateY(Math.PI / 4);
//     chest_geometry = chest_geometry.toNonIndexed();
//     chest_geometry.computeVertexNormals();
//     chest_geometry.scale(depth / top_chest_length, 1, 1);
//     const chest_material = new THREE.MeshPhongMaterial({ color: "green" });
//     const chest = new THREE.Mesh(chest_geometry, chest_material);
//     chest.position.set(0, leg_height + chest_height / 2, 0);

//     //Head
//     const head_geometry = new THREE.SphereGeometry(head_height / 2);
//     head_geometry.scale(0.8, 1, 0.8);
//     const head = new THREE.Mesh(head_geometry, chest_material);
//     head.position.set(0, chest_height / 2 + head_height / 2 + head_chest_offset, 0);
//     chest.add(head);

//     //Shoulders
//     const shoulder_material = new THREE.MeshPhongMaterial({ color: "red" });
//     const shoulder_geometry = new THREE.SphereGeometry(shoulder_radius);
//     const right_shoulder = new THREE.Mesh(shoulder_geometry, shoulder_material);
//     right_shoulder.position.set(0, chest_height / 2, top_chest_length / 2);
//     //right_shoulder.material.visible = false;
//     right_shoulder.rotateZ(-Math.PI / 2);
//     right_shoulder.rotateY(-0.2);
//     chest.add(right_shoulder);
//     const left_shoulder = new THREE.Mesh(shoulder_geometry, shoulder_material);
//     left_shoulder.position.set(0, chest_height / 2, -top_chest_length / 2);
//     left_shoulder.rotateZ(-Math.PI / 2);
//     left_shoulder.rotateY(0.2);
//     chest.add(left_shoulder);

//     //Arms
//     const arm_material = new THREE.MeshPhongMaterial({ color: "white" });
//     const arm_geometry = new THREE.BoxGeometry(arm_length, arm_diameter, arm_diameter);
//     // const arm_geometry = new THREE.CylinderGeometry(0.03, 0.03, arm_length);
//     // arm_geometry.rotateZ(Math.PI / 2);
//     const right_arm = new THREE.Mesh(arm_geometry, arm_material);
//     right_arm.position.set(arm_length / 2, 0, 0);
//     right_shoulder.add(right_arm);
//     const left_arm = new THREE.Mesh(arm_geometry, arm_material);
//     left_arm.position.set(arm_length / 2, 0, 0);
//     left_shoulder.add(left_arm);

//     //Elbows
//     const elbow_geometry = new THREE.SphereGeometry(elbow_radius);
//     const right_elbow = new THREE.Mesh(elbow_geometry, shoulder_material);
//     right_elbow.position.set(arm_length / 2, 0, 0);
//     right_elbow.rotateZ(Math.PI / 2);
//     right_arm.add(right_elbow);
//     const left_elbow = new THREE.Mesh(elbow_geometry, shoulder_material);
//     left_elbow.position.set(arm_length / 2, 0, 0);
//     left_elbow.rotateZ(Math.PI / 2);
//     left_arm.add(left_elbow);

//     //Forearms
//     const right_forearm = new THREE.Mesh(arm_geometry, arm_material);
//     right_forearm.position.set(arm_length / 2, 0, 0);
//     right_elbow.add(right_forearm);
//     const left_forearm = new THREE.Mesh(arm_geometry, arm_material);
//     left_forearm.position.set(arm_length / 2, 0, 0);
//     left_elbow.add(left_forearm);

//     //Hands
//     const hand_geometry = new THREE.SphereGeometry(hand_length);
//     hand_geometry.scale(1, hand_width / hand_length, hand_width / hand_length);
//     const hand_material = new THREE.MeshPhongMaterial({ color: "black" });
//     const right_hand = new THREE.Mesh(hand_geometry, hand_material);
//     right_hand.position.set(arm_length / 2, 0, 0);
//     right_forearm.add(right_hand);
//     const left_hand = new THREE.Mesh(hand_geometry, hand_material);
//     left_hand.position.set(arm_length / 2, 0, 0);
//     left_forearm.add(left_hand);

//     //Legs
//     const leg_width = (3 / 7) * (bottom_chest_length / 2);
//     const leg_depth = ((3 / 4) * (bottom_chest_length * depth)) / top_chest_length;
//     const leg_geometry = new THREE.BoxGeometry(leg_depth, leg_height, leg_width);
//     leg_geometry.translate(0, -leg_height / 2, 0);
//     const right_leg = new THREE.Mesh(leg_geometry, chest_material);
//     right_leg.position.set(0, -chest_height / 2, bottom_chest_length / 2 - (5 / 8) * leg_width);
//     chest.add(right_leg);
//     const left_leg = new THREE.Mesh(leg_geometry, chest_material);
//     left_leg.position.set(0, -chest_height / 2, -(bottom_chest_length / 2 - (5 / 8) * leg_width));
//     chest.add(left_leg);

//     return {
//         head: head,
//         chest: chest,
//         right_shoulder: right_shoulder,
//         right_arm: right_arm,
//         right_elbow: right_elbow,
//         right_forearm: right_forearm,
//         right_hand: right_hand,
//         left_shoulder: left_shoulder,
//         left_arm: left_arm,
//         left_elbow: left_elbow,
//         left_forearm: left_forearm,
//         left_hand: left_hand,
//         right_leg: right_leg,
//         left_leg: left_leg
//     };
// }
