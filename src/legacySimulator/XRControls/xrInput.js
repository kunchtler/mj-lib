"use strict";

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XrMechanicalControllerInput } from './xrMechanicalControllerInput.js' ;
import { XrHead } from './xrHead.js' ;
import { Pointer } from './pointer.js';

const PointerActiveColor = new THREE.Color("gray") ;
const PointerPressedColor = new THREE.Color("yellow") ;

/**
 * Create the WebXR grip controllers and hand controllers and respond
 * to the event to manage the corresponding handler classes.
 */
export class XrInput {

    constructor(context)
    {
        this.context = context ;
        this._controllerModelFactory = new XRControllerModelFactory();
        this._leftHandController = undefined ;
        this._rightHandController = undefined ;
        this._head = new XrHead(this.context) ;
        
        const xr = context.renderer.xr 
        this.setupController(0, xr);
        this.setupController(1, xr);

        this._leftPointer = new Pointer() ;
        this.context.scene.add(this._leftPointer) ;
        this._rightPointer = new Pointer() ;
        this.context.scene.add(this._rightPointer) ;

        this._isFlying = false;

        this._origin = this.context.renderer.xr.getReferenceSpace();
    }

    onAnimate() { 
        this._head.update();
        this._leftHandController?.onAnimate();       
        this._rightHandController?.onAnimate();   
        
        this.updateDebugPointers(this._leftPointer, this._leftHandController);
        this.updateDebugPointers(this._rightPointer, this._rightHandController);

        this.movePlayer();
        this.rotatePlayer();
        this.movePlayerY(true);
    }

    updateDebugPointers(pointer, controller) {
        if (!controller || !controller.pointerActive) {
            pointer.visible = false ;
            return ;
        }
        
        pointer.visible = true ;
        if(controller.select) {
            pointer.material.color = PointerPressedColor ;
        } else {
            pointer.material.color = PointerActiveColor ;
        }
        pointer.setFromDir(controller.pointerWOrigin, controller.pointerWDirection);
    }

    setupController(index, xr) {
        // Controller
        const controllerGrip = xr.getControllerGrip(index);
        const controllerModel = this._controllerModelFactory.createControllerModel(controllerGrip);
        controllerGrip.add(controllerModel);
        const axis = new THREE.AxesHelper(0.2)
        controllerModel.add(axis);
        this.context.scene.add(controllerGrip);
        
        // Events
        controllerGrip.addEventListener('connected', (event) => this.onControllerConnect(event, controllerGrip));
        controllerGrip.addEventListener('disconnected', (event) => this.onControllerDisconnect(event, controllerGrip));
    }

    onControllerConnect(event, controllerGrip){
        const data = event.data ;
        this.logData(data) ;
        let gamepad = event.data.gamepad ;
        if (data.handedness == "right") {
            if(!data.hand) {
                this._rightHandController = new XrMechanicalControllerInput(this.context, controllerGrip, gamepad, 'right');
            }
            this.addEvents(controllerGrip, this._rightHandController);
            this._rightHandController.onConnect();
        }
        if (data.handedness == "left") {
            if(!data.hand) {
                this._leftHandController = new XrMechanicalControllerInput(this.context, controllerGrip, gamepad, 'left');
            }
            this.addEvents(controllerGrip, this._leftHandController);
            this._leftHandController.onConnect();
        }
    }

    onControllerDisconnect(event, controllerGrip, hand) {
        const data = event.data ;
        this.logData(data) ;
        if (data.handedness == "right") {
            this._rightHandController?.onDisconnect();
            this._rightHandController = undefined ;
        }
        if (data.handedness == "left") {
            this._leftHandController?.onDisconnect();
            this._leftHandController = undefined;
        }
    }

    logData(data) {
        console.info(`Controller ${data.handedness} connected gamepad${data.gamepad?"✔":"❌"} grip${data.gripSpace?"✔":"❌"} hand${data.hand?"✔":"❌"}`)
    }
    
    addEvents(controller, hand)
    {
        controller.addEventListener('selectstart', () => {
            hand.select = true;
        });
        controller.addEventListener('selectend', () => {
            hand.select = false;
        });

        controller.addEventListener('squeezestart', () => {
            hand.squeeze = true;
        });
        controller.addEventListener('squeezeend', () => {
            hand.squeeze = false;
        });
    }

    /**
     * Make the player move (on x & z axes) by applying translation on referenceSpace. 
     * 
     * @returns void
     */
    movePlayer() {

        if (!this._leftHandController || !this._leftHandController.thumbStick) {
            return;
        }
        
        const referenceSpace = this.context.renderer.xr.getReferenceSpace();
        if (!referenceSpace) {
            return;
        }
        
        const moveX = this._leftHandController.thumbStick.x;
        const moveZ = this._leftHandController.thumbStick.y;
        
        const speed = 0.03; //meter or unite by frame
        
        const forward = new THREE.Vector3();
        forward.copy(this._head.forward);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3();
        right.copy(this._head.right);
        right.y = 0;
        right.normalize();
        
        const moveDirection = new THREE.Vector3();
        moveDirection.addScaledVector(forward, -moveZ);
        moveDirection.addScaledVector(right, moveX);
        
        const offsetTransform = new XRRigidTransform(
            {
                x: - moveDirection.x * speed,
                y: 0,
                z: - moveDirection.z * speed
            },
            {x: 0, y: 0, z: 0, w: 1}
        );
        
        try {
            const newReferenceSpace = referenceSpace.getOffsetReferenceSpace(offsetTransform);
                        this.context.renderer.xr.setReferenceSpace(newReferenceSpace);
        } catch (e) {
            console.error("Error during referenceSpace modification", e);
        }
    }

    /**
     * Make the player move y axe by applying translation on referenceSpace. This function handle the flying mode. 
     * 
     * @param always true if flying mode is always on (jump should be disable)
     * 
     * @returns void
     */
    movePlayerY(always = false) {
        if (!(this._isFlying || always) || !this._rightHandController || !(this._rightHandController._gamePad.buttons.length > 5) 
            || !(this._rightHandController.buttonA || this._rightHandController.buttonB)) {
            return;
        }
        
        const referenceSpace = this.context.renderer.xr.getReferenceSpace();
        if (!referenceSpace) {
            return;
        }

        let speed = 0.03; //meter or unite by frame

        if(this._rightHandController.buttonA){
            speed = -speed;
        }

        const offsetTransform = new XRRigidTransform(
            {
                x: 0,
                y: speed,
                z: 0
            },
            {x: 0, y: 0, z: 0, w: 1}
        );
        try {
            const newReferenceSpace = referenceSpace.getOffsetReferenceSpace(offsetTransform);
                        this.context.renderer.xr.setReferenceSpace(newReferenceSpace);
        } catch (e) {
            console.error("Error during referenceSpace modification", e);
        }
    }

    /**
     * Entry point of a a jump, this method init a jump which will be handle by updateJump()
     * If a double press on button A is detected, it toggle the flying mode.
     * @returns void
     */
    jumpPlayer() {
        if (!this._rightHandController || !(this._rightHandController._gamePad.buttons.length > 4) || !this._rightHandController.buttonA) {
            return;
        }
        
        if (!this._isJumping && !this._isFlying) {
            this._isJumping = true;
            this._jumpStartTime = Date.now();
            this._jumpHeight = 0.5; //in meter or unit
            this._jumpDuration = 0.8; // second
            this._currentJumpHeight = 0;
            this._isFlying = false;
        }else{
            if(this._lastButtonATrigger && 50 < (Date.now() - this._lastButtonATrigger) && (Date.now() - this._lastButtonATrigger) < 400){
                this._isFlying = !this._isFlying;
                this._isJumping = false;
            }
        }

        this._lastButtonATrigger = Date.now();
    }

    /**
     * Jump animation, it make a translation of referenceSpace with y axes if the player is jumping
     * 
     * @returns void
     */
    updateJump() {
        if (!this._isJumping) {
            return;
        }
        
        const referenceSpace = this.context.renderer.xr.getReferenceSpace();
        if (!referenceSpace) {
            this._isJumping = false;
            return;
        }
        
        // Compute jump progression
        const elapsedTime = (Date.now() - this._jumpStartTime) / 1000;
        const jumpProgress = Math.min(elapsedTime / this._jumpDuration, 1.0);
        
        // y = 4 * h * t * (1 - t) with h is max height, t is progress (0-1)
        // no clue why I need to put minus on everything
        const newHeight = -(this._jumpHeight * 4 * jumpProgress * (1 - jumpProgress));
        
        const deltaY = newHeight - this._currentJumpHeight;
        this._currentJumpHeight = newHeight;
        
        const offsetTransform = new XRRigidTransform(
            {
                x: 0,
                y: deltaY,
                z: 0
            },
            {x: 0, y: 0, z: 0, w: 1}
        );
        
        try {
            const newReferenceSpace = referenceSpace.getOffsetReferenceSpace(offsetTransform);
            this.context.renderer.xr.setReferenceSpace(newReferenceSpace);
            
            if (jumpProgress >= 1.0) {
                this._isJumping = false;
            }
        } catch (e) {
            console.error("Error while jumping", e);
            this._isJumping = false;
        }
    }
    
    /**
     * Make rotation when left or right joystick is pushed
     * 
     * @param discrete true if discrete rotation mode is enabled (30 degrees rotation)
     * 
     * @returns void
     */
    rotatePlayer(discrete = false) {
        if (!this._rightHandController || !this._rightHandController.thumbStick) {
            return;
        }
        
        const referenceSpace = this.context.renderer.xr.getReferenceSpace();
        if (!referenceSpace) {
            return;
        }
        
        const joystickX = this._rightHandController.thumbStick.x;
        
        if (!this._rotationState) {
            this._rotationState = {
                isLeftTriggered: false,
                isRightTriggered: false,
                lastRotationTime: 0,
                lastJoystickValue: 0,
                currentRotationSpeed: 0,
                targetRotationSpeed: 0,
                rotationDirection: 0,
                rotationInProgress: false
            };
        }
        let rotationAngle = 0;

        if (discrete) {
            const threshold = 0.7;
            rotationAngle = Math.PI / 6; // 30 degrees
            const rotationDelay = 250; // 250 ms
            
            const currentTime = Date.now();
            if (currentTime - this._rotationState.lastRotationTime < rotationDelay) {
                return;
            }
            
            if (Math.abs(joystickX) < threshold) {
                return;
            }

            rotationAngle = Math.sign(joystickX) * rotationAngle;

        }else{
            
            const accelerationFactor = 0.02;  // small = slow
            const decelerationFactor = 0.1;   // small = slow
            const maxRotationSpeed = Math.PI / 180;  
            
            if (Math.abs(joystickX) > 0.1) {
                this._rotationState.rotationDirection = Math.sign(joystickX);
                this._rotationState.targetRotationSpeed = Math.pow(Math.abs(joystickX), 2) * maxRotationSpeed;
                this._rotationState.rotationInProgress = true;
            } else {
                this._rotationState.targetRotationSpeed = 0;
            }
            
            if (this._rotationState.currentRotationSpeed < this._rotationState.targetRotationSpeed) {
                // acceleration
                this._rotationState.currentRotationSpeed += (this._rotationState.targetRotationSpeed - this._rotationState.currentRotationSpeed) * accelerationFactor;
            } else if (this._rotationState.currentRotationSpeed > this._rotationState.targetRotationSpeed) {
                // deceleration
                this._rotationState.currentRotationSpeed -= (this._rotationState.currentRotationSpeed - this._rotationState.targetRotationSpeed) * decelerationFactor;
            }
            
            rotationAngle = this._rotationState.currentRotationSpeed * this._rotationState.rotationDirection;
        }

        const viewerPose = this.context.renderer.xr.getFrame().getViewerPose(referenceSpace);
        const position = viewerPose.transform.position;

        const applyRotation = (angle) => {
            const rotationQuaternion = {
                x: 0,
                y: Math.sin(angle / 2),
                z: 0,
                w: Math.cos(angle / 2)
            };
            
            try {
                // Step 1: move to center
                const moveToOrigin = new XRRigidTransform(
                    { x: position.x, y: 0, z: position.z },
                    { x: 0, y: 0, z: 0, w: 1 }
                );
                let newReferenceSpace = referenceSpace.getOffsetReferenceSpace(moveToOrigin);
                
                // Step 2: apply rotation
                const rotate = new XRRigidTransform(
                    { x: 0, y: 0, z: 0 },
                    rotationQuaternion
                );
                newReferenceSpace = newReferenceSpace.getOffsetReferenceSpace(rotate);
                
                // Step 3: back to initial position
                const moveBack = new XRRigidTransform(
                    { x: -position.x, y: 0, z: -position.z },
                    { x: 0, y: 0, z: 0, w: 1 }
                );
                newReferenceSpace = newReferenceSpace.getOffsetReferenceSpace(moveBack);
                
                this.context.renderer.xr.setReferenceSpace(newReferenceSpace);
            } catch (e) {
                console.error("Error while rotating", e);
            }
        };
        
        applyRotation(rotationAngle);
        this._rotationState.lastRotationTime = Date.now();
        this._rotationState.lastJoystickValue = joystickX;
    }
}