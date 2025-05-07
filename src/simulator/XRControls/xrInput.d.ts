import * as THREE from 'three';
import { XrMechanicalControllerInput } from './xrMechanicalControllerInput.js';
import { XrHead } from './xrHead.js';
import { Pointer } from './pointer.js';

/**
 * XrInput module declaration, related to XrInput.js 
 */
export declare class XrInput {
    context: any;
    private _controllerModelFactory: any;
    private _leftHandController: XrMechanicalControllerInput | undefined;
    private _rightHandController: XrMechanicalControllerInput | undefined;
    private _head: XrHead;
    private _leftPointer: Pointer;
    private _rightPointer: Pointer;
    private _origin: any;
    private _isJumping?: boolean;
    private _jumpStartTime?: number;
    private _jumpHeight?: number;
    private _jumpDuration?: number;
    private _currentJumpHeight?: number;
    private _rotationState?: {
        isLeftTriggered: boolean;
        isRightTriggered: boolean;
        lastRotationTime: number;
    };

    constructor(context: any);
    
    onAnimate(): void;
    updateDebugPointers(pointer: Pointer, controller: XrMechanicalControllerInput | undefined): void;
    setupController(index: number, xr: any, handProfile: string): void;
    onControllerConnect(event: any, controllerGrip: any): void;
    onControllerDisconnect(event: any, controllerGrip: any, hand?: any): void;
    logData(data: any): void;
    addEvents(controller: any, hand: any): void;
    movePlayer(): void;
    jumpPlayer(): void;
    updateJump(): void;
    rotatePlayer(): void;
}