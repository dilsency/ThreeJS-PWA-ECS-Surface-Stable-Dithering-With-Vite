// imports
// base
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";// import * as THREE from "three";
// entity-component-system (ECS)
import {EntityManager} from "./classes/ECS/entity_manager.js";
import {Entity} from "./classes/ECS/entity.js";
import {EntityComponent} from "./classes/ECS/entity_component.js";
// entity components
import {EntityComponentCameraControllerFirstPerson} from "./entity components/camera_controller_first_person.js";
import {EntityComponentCameraControllerFirstPersonInput} from "./entity components/camera_controller_first_person.js";
import {EntityComponentPlayerController} from "./entity components/player_controller.js";
import {EntityComponentPlayerControllerInput} from "./entity components/player_controller.js";
import {EntityComponentTestCube} from "./entity components/test_objects.js";
import {EntityComponentButtonPointerLock} from "./entity components/test_objects.js";

// bare minimum
var scene;
var sceneHUD;
var renderer;

var clock;
var clockTimeDelta = 0;
var clockTimeElapsed = 0;

var cameraPivot;
var camera;
var cameraHUD;

var cameraDirection;
var cameraPivotDirection;
var cameraFrustum;

// ECS
var entityManager;

//
var cube;

//
init();
function init()
{
    //
    function initBareMinimum()
    {
        //
        console.log("init bare minimum");

        //
        clock = new THREE.Clock();
        clock.start();

        //
        scene = new THREE.Scene();
        scene.environment = null;

        //
        sceneHUD = new THREE.Scene();
        sceneHUD.environment = null;

        //
        cameraPivot = new THREE.Object3D();
        cameraPivot.name = "cameraPivot";
        //cameraPivot.position.z = 5;
        scene.add(cameraPivot);
        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

        //
        cameraHUD = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
        sceneHUD.add(cameraHUD);

        //
        camera.up.set(0,1,0);

        camera.updateProjectionMatrix();
        cameraPivot.add(camera);
        cameraDirection = new THREE.Vector3();
        cameraPivotDirection = new THREE.Vector3();
        cameraFrustum = new THREE.Frustum();
        
        // default cam values
        camera.getWorldDirection(cameraDirection);
        cameraPivot.getWorldDirection(cameraPivotDirection);
        cameraFrustum.setFromProjectionMatrix(camera.projectionMatrix);

        //
        cameraHUD.up.set(0,1,0);
        cameraHUD.updateProjectionMatrix();

        //
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2");

        //
        renderer = new THREE.WebGLRenderer({ canvas, context });
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.domElement.id = "canvas";
        document.body.appendChild( renderer.domElement );
    }

    //
    function initECS()
    {
        //
        console.log("init ECS");

        //
        entityManager = new EntityManager(null);
    }

    //
    function initEntityComponents()
    {
        //
        console.log("init Entities");

        //
        const entityA = new Entity(null);
        entityManager.methodAddEntity(entityA);
        //
        entityA.methodAddComponentWithName("EntityComponentCameraControllerFirstPerson", new EntityComponentCameraControllerFirstPerson({scene: scene, camera: camera, cameraPivot: cameraPivot,}));
        entityA.methodAddComponentWithName("EntityComponentCameraControllerFirstPersonInput", new EntityComponentCameraControllerFirstPersonInput());
        //
        entityA.methodAddComponentWithName("EntityComponentPlayerController", new EntityComponentPlayerController({cameraPivot: cameraPivot,}));
        entityA.methodAddComponentWithName("EntityComponentPlayerControllerInput", new EntityComponentPlayerControllerInput());

        entityA.methodSetPosition(new THREE.Vector3(0.0,0.0,5.0));
        //

        //
        const entityB = new Entity(null);
        entityManager.methodAddEntity(entityB);
        entityB.methodAddComponentWithName("EntityComponentTestCube", new EntityComponentTestCube({scene:scene,name:"model",}));
        
        //
        const entityC = new Entity(null);
        entityManager.methodAddEntity(entityC);
        entityC.methodAddComponentWithName("EntityComponentButtonPointerLock", new EntityComponentButtonPointerLock({document:document,renderer:renderer,}));
        
        const entityD = new Entity(null);
        entityManager.methodAddEntity(entityD);
        entityD.methodSetPosition({x:-10,y:0,z:-10,});

        // sceneHUD

        const entityHUD = new Entity(null);
        entityManager.methodAddEntity(entityHUD);
        entityHUD.methodAddComponentWithName("EntityComponentTestCube", new EntityComponentTestCube({scene:sceneHUD,name:"model",
            //positionOffset:{x:-3.0,y:-1.5,z:-3.0},
            positionOffset:{x:-0,y:-0,z:-10.0},
        }));
    }

    //
    initBareMinimum();

    //
    initECS();
    initEntityComponents();

    //
    update();
}

function update()
{
    // must be first
    requestAnimationFrame((t) => {
        update();
      });

    //
    clockTimeDelta = clock.getDelta();
    clockTimeElapsed = clock.getElapsedTime();

    // https://threejs.org/manual/#en/responsive
    updateWindowSize();

    //
    updateEntityComponentSystem();

    // must be last
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.render(sceneHUD, cameraHUD);
}

function resizeRendererToMatchDisplaySize(renderer)
{
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

function updateWindowSize()
{
    if(resizeRendererToMatchDisplaySize(renderer))
    {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        // cameraHUD
        cameraHUD.aspect = canvas.clientWidth / canvas.clientHeight;
        cameraHUD.updateProjectionMatrix();
    }
}

function updateEntityComponentSystem()
{
    entityManager.methodUpdate(clockTimeElapsed, clockTimeDelta);
}