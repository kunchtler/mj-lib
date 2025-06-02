import * as THREE from "three";
// import { Object3DHelper } from "../utils/Object3DHelper";
// import { find_elbow } from "../utils/utils";
import { HandConstructorParams, HandModel, HandSiteCreationParams } from "./HandModel";
import { TableModel } from "./TableModel";

export interface JugglerParamConstructor {
    // hands?: [HandModel, HandModel] | [HandConstructorParams, HandConstructorParams];
    hands: [HandModel, HandModel];
    defaultTable?: TableModel;
    // height?: number;
    // width?: number;
    // depth?: number;
    // arm_length?: number;
    // default_table?: Table;
}

const defaultJugglerParam = { height: 1.8, width: 0.5, depth: 0.3, armLength: 0.4 };

//TODO : Optional elbows (but only if defined) ?
//TODO : Allow to toggle the audio on/off.
export class JugglerModel {
    readonly hands: [HandModel, HandModel];
    defaultTable?: TableModel;
    // height: number;
    // geometry: THREE.BufferGeometry;
    // material: THREE.Material;
    // jugglingOrigin: THREE.Object3D;
    // shoulder: THREE.Object3D;
    // elbow: THREE.Object3D;
    // arm_length: number;
    // target: THREE.Object3D;

    constructor({ defaultTable, hands }: JugglerParamConstructor) {
        this.hands = hands;
        this.defaultTable = defaultTable;
        // if (hands === undefined) {
        //     const defaultOriginObject = new THREE.Object3D();
        //     // this.mesh.add(defaultOriginObject);
        //     defaultOriginObject.position.set(
        //         defaultJugglerParam.armLength,
        //         defaultJugglerParam.height - 0.4 - defaultJugglerParam.armLength,
        //         0
        //     );
        //     const defaultHandSiteParams: Omit<HandSiteCreationParams, "isRightHand"> = {
        //         centerRestDist: (defaultJugglerParam.depth * 2) / 3,
        //         restSiteDist: defaultJugglerParam.depth / 4,
        //         //TODO : Rename to better indicate that is between hands.
        //         jugglerJugglingPlaneOrigin: defaultOriginObject,
        //         rightVector: new THREE.Vector3(0, 0, 1)
        //     };
        //     const leftHand = new HandModel(
        //         createHandSites({ ...defaultHandSiteParams, isRightHand: false })
        //     );
        //     const rightHand = new HandModel(
        //         createHandSites({ ...defaultHandSiteParams, isRightHand: true })
        //     );
        //     this.hands = [leftHand, rightHand];
        //     for (const hand of this.hands) {
        //         defaultOriginObject.add(hand.catchSite);
        //         defaultOriginObject.add(hand.throwSite);
        //         defaultOriginObject.add(hand.restSite);
        //         // this.mesh.add(hand.mesh);
        //     }
        // } else if (!(hands[0] instanceof HandModel)) {
        //     this.hands = [new HandModel(hands[0]), new HandModel(hands[1])];
        // } else {
        //     this.hands = hands as [HandModel, HandModel];
        // }
        // this.defaultTable = defaultTable;
    }

    get leftHand(): HandModel {
        return this.hands[0];
    }

    set leftHand(hand: HandModel) {
        this.hands[0] = hand;
    }

    get rightHand(): HandModel {
        return this.hands[1];
    }

    set rightHand(hand: HandModel) {
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
}
