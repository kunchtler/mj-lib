import * as THREE from "three";
import { VECTOR3_STRUCTURE } from "../utils/constants";
import { CubicHermiteSpline } from "../utils/spline/Spline";
import {
    CatchEvent,
    TablePutEvent,
    TableTakeEvent,
    ThrowEvent,
    HandTimelineEvent,
    HandTimelineSingleEvent,
    HandTimeline
} from "./Timeline";
import { Object3DHelper } from "../utils/three/Object3DHelper";

//TODO : Change the fact that all methods have get in front of them
//TODO : Change instanceof to string type as it is faster ?
//TODO : Remove the throws and instead have union type of supported types, so that
//it is the compiler that complains when someone tries to add events.
//TODO : Make it so moving juggler moves its points with him (so no precalculated things ?)
//TODO : Forbid Hand Event[] from having catch/thrown and put/take
//TODO : Replace null by undefined ?
//TODO : Replace HandEventInterface by HandEventTimeline in function signatures ?
//TODO : Better handle type checking of multievent ?

const { multiplyByScalar: V3SCA } = VECTOR3_STRUCTURE;

// This variable serves to make hand movements more circular.
// const power = 1;

function averageVector(vectors: THREE.Vector3[]): THREE.Vector3 {
    const sum = new THREE.Vector3(0, 0, 0);
    if (vectors.length === 0) {
        return sum;
    }
    for (const vec of vectors) {
        sum.add(vec);
    }
    sum.divideScalar(vectors.length);
    return sum;
}

//TODO : Before launching simulation, console.log all events not sane to help debug.
//TODO : Reversed catches in parser (to better allow rhtyhmic creation ?)

// TODO : ThrowSite -> TossSite
//TODO : Add to all classes having to add child/parent meshes that if mesh has no parent, ot
//instanciates it.

export function createHandSites({
    centerRestDist,
    jugglerJugglingPlaneOrigin,
    restSiteDist,
    isRightHand,
    rightVector
}: HandSiteCreationParams): {
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;
} {
    const handSign = isRightHand ? 1 : -1;
    const centerHandUnitVector = V3SCA(handSign / rightVector.length(), rightVector);

    const restSite = new THREE.Object3D();
    jugglerJugglingPlaneOrigin.add(restSite);
    restSite.position.copy(V3SCA(centerRestDist, centerHandUnitVector));
    const throwSite = new THREE.Object3D();
    jugglerJugglingPlaneOrigin.add(throwSite);
    throwSite.position.copy(V3SCA(centerRestDist - restSiteDist, centerHandUnitVector));
    const catchSite = new THREE.Object3D();
    jugglerJugglingPlaneOrigin.add(catchSite);
    catchSite.position.copy(V3SCA(centerRestDist + restSiteDist, centerHandUnitVector));

    return { catchSite: catchSite, throwSite: throwSite, restSite: restSite };
}

export interface HandConstructorParams {
    mesh?: THREE.Mesh;
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;
    timeline?: HandTimeline;
    debug?: boolean;
}

export class Hand {
    mesh: THREE.Mesh;
    timeline: HandTimeline;
    catchSite: THREE.Object3D;
    throwSite: THREE.Object3D;
    restSite: THREE.Object3D;

    constructor({ mesh, catchSite, restSite, throwSite, timeline, debug }: HandConstructorParams) {
        this.mesh = mesh ?? new THREE.Mesh(createHandGeometry(0.05), createHandMaterial());
        this.mesh.visible = false;
        this.timeline = timeline ?? new HandTimeline();
        this.restSite = restSite;
        this.catchSite = catchSite;
        this.throwSite = throwSite;
        if (debug ?? false) {
            this.restSite.add(new Object3DHelper());
            this.catchSite.add(new Object3DHelper());
            this.throwSite.add(new Object3DHelper());
        }
        // this.jugglingPlaneOrigin = jugglingPlaneOrigin;
        //TODO : jugglingPlaneOrigin parent in 3D scene of catch throw and rest site ?
        //Should we do that here or in juggler ?

        // const {
        //     centerRestDist,
        //     jugglerJugglingPlaneOrigin: originObject,
        //     restSiteDist,
        //     rightVector
        // } = handPhysicsHandling;
        // const handSign = isRightHand ? 1 : -1;
        // const centerHandUnitVector = V3SCA(handSign, rightVector);

        // this.restSite = new THREE.Object3D();
        // this.restSite.position.copy(V3SCA(centerRestDist, centerHandUnitVector));
        // this.throwSite = new THREE.Object3D();
        // this.throwSite.position.copy(V3SCA(centerRestDist - restSiteDist, centerHandUnitVector));
        // this.catchSite = new THREE.Object3D();
        // this.catchSite.position.copy(V3SCA(centerRestDist + restSiteDist, centerHandUnitVector));
    }

    render(time: number): void {
        const worldPosition = this.position(time);
        const localPosition =
            this.mesh.parent === null
                ? worldPosition
                : this.mesh.parent.worldToLocal(worldPosition);
        this.mesh.position.copy(localPosition);
        // this.mesh.position.copy(worldToLocalPosition(this.position(time)));
    }

    /**
     * Properly deletes the resources. Call when instance is not needed anymore to free ressources.
     */
    //TODO
    dispose(): void {
        if (this.mesh.parent !== null) {
            this.mesh.parent.remove(this.mesh);
        }
        // this.geometry.dispose();
        // this.material.dispose();
        this.timeline.clear();
    }
}

export function createHandGeometry(radius: number) {
    return new THREE.SphereGeometry(radius, 8, 4); //Def radius : 0.05
}

export function createHandMaterial(color: THREE.ColorRepresentation = 0xffdbac) {
    return new THREE.MeshPhongMaterial({ color: color });
}
