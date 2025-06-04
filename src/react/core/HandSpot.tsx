import { use, useEffect, useRef } from "react";
import { HandContext } from "./Context";
import * as THREE from "three";
import { HandModel } from "../../model/HandModel";
import { ThreeElements } from "@react-three/fiber";
import mergeRefs from "merge-refs";

export type TossSpotReactProps = ThreeElements["object3D"];
export type CatchSpotReactProps = ThreeElements["object3D"];
export type RestSpotReactProps = ThreeElements["object3D"];

export function TossSpot(props: TossSpotReactProps) {
    return (
        <HandSpot
            setModelInfo={(model, spot) => {
                spot.getWorldPosition(model.tossPos);
            }}
            deleteModelInfo={(model) => {
                model.tossPos.set(0, 0, 0);
            }}
            {...props}
        ></HandSpot>
    );
}

export function CatchSpot(props: CatchSpotReactProps) {
    return (
        <HandSpot
            setModelInfo={(model, spot) => {
                spot.getWorldPosition(model.catchPos);
            }}
            deleteModelInfo={(model) => {
                model.catchPos.set(0, 0, 0);
            }}
            {...props}
        ></HandSpot>
    );
}

export function RestSpot(props: RestSpotReactProps) {
    return (
        <HandSpot
            setModelInfo={(model, spot) => {
                spot.getWorldPosition(model.restPos);
            }}
            deleteModelInfo={(model) => {
                model.restPos.set(0, 0, 0);
            }}
            {...props}
        ></HandSpot>
    );
}

export type HandSpotReactProps = {
    setModelInfo: (model: HandModel, spot: THREE.Object3D) => void;
    deleteModelInfo: (model: HandModel) => void;
    // ref?: RefObject<THREE.Object3D>;
    // children?: ReactNode;
} & ThreeElements["object3D"];

export function HandSpot({ setModelInfo, deleteModelInfo, ref, ...props }: HandSpotReactProps) {
    const hand = use(HandContext);
    const spotRef = useRef<THREE.Object3D>(null!);

    useEffect(() => {
        if (hand === undefined) {
            return;
        }
        setModelInfo(hand.model, spotRef.current);
        return () => {
            deleteModelInfo(hand.model);
        };
    }, [deleteModelInfo, hand, setModelInfo]);

    /*@ts-expect-error React 19's refs are weirdly typed*/
    return <object3D ref={mergeRefs(spotRef, ref)} {...props}></object3D>;
}
