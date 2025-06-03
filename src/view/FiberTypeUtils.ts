import { ThreeElements } from "@react-three/fiber";
import { RefObject } from "react";
import { Object3D } from "three";

export type FiberObject3D = ThreeElements["object3D"] /* & { ref?: RefObject<Object3D> }*/;
