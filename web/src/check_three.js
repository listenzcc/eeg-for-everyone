console.log("check_three.js starts. >>>>>>>>");

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { SDFGeometryGenerator } from 'three/addons/geometries/SDFGeometryGenerator.js';

{
    console.log(THREE, THREE.Scene);
    console.log(OrbitControls);
    console.log(GUI);
    console.log(Stats);

    let renderer, stats, meshFromSDF, scene, camera, clock, controls;

    const settings = {
        res: 4,
        bounds: 1,
        kTheta: 1,
        kPhi: 2,
        autoRotate: true,
        wireframe: true,
        material: "normal", // "normal", "depth"
        vertexCount: "0",
    },
        container = document.getElementById('three-canvas-container') || document.body.appendChild(document.createElement('div'));

    console.log(container)

    // Example SDF from https://www.shadertoy.com/view/MdXSWn -->

    const shader = () => {
        const { kTheta, kPhi } = settings;
        console.log(settings)

        return /* glsl */ `
float dist(vec3 p) {
	p.xyz = p.xzy;
	p *= 1.2;
	vec3 z = p;
    // Circle example
    // return length(p) - 0.5;

	vec3 dz=vec3(0.0);
	float power = 8.0;
	float r, theta, phi;
	float dr = 1.0;

    float a=${kTheta.toFixed(2)}; //1.0; //0.3;
    float b=${kPhi.toFixed(2)}; //1.0; //0.7;
	
	float t0 = 1.0;
	for(int i = 0; i < 7; ++i) {
		r = length(z);
		if(r > 2.0) continue;
		theta = atan(z.y / z.x);
		#ifdef phase_shift_on
		phi = asin(z.z / r) ;
		#else
		phi = asin(z.z / r);
		#endif
		
		dr = pow(r, power - 1.0) * dr * power + 1.0;
	
		r = pow(r, power);
		theta = theta * power;
		phi = phi * power;

        theta *= a;
        phi *= b;
		
		z = r * vec3(cos(theta)*cos(phi), sin(theta)*cos(phi), sin(phi)) + p;
		
		t0 = min(t0, r);
	}

	return 0.5 * log(r) * r / dr;
}
`;
    }


    const getContainerSize = () => {
        const w = container.clientWidth,
            h = container.clientHeight; //w * 3 / 4;
        return { w, h }
    }

    let init = () => {
        const { w, h } = getContainerSize();
        // const w = window.innerWidth;
        // const h = window.innerHeight;

        camera = new THREE.OrthographicCamera(
            w / -2,
            w / 2,
            h / 2,
            h / -2,
            0.01,
            1600
        );
        camera.position.z = 1100;

        scene = new THREE.Scene();

        clock = new THREE.Clock();

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        // document.body.appendChild(renderer.domElement);
        container.appendChild(renderer.domElement);
        renderer.domElement.style.position = 'absolute';

        stats = new Stats();
        // document.body.appendChild(stats.dom);
        Object.assign(stats.dom.style, { position: 'relative' });
        container.appendChild(stats.dom);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;


        //

        const panel = new GUI();

        panel.add(settings, "res", 1, 4, 1).name("Res").onFinishChange(compile);
        panel
            .add(settings, "bounds", 1, 5, 1)
            .name("Bounds")
            .onFinishChange(compile);
        panel.add(settings, 'kTheta', 0.1, 2, 0.01).name("KTheta").onFinishChange(compile);
        panel.add(settings, 'kPhi', 0.1, 2, 0.01).name("KPhi").onFinishChange(compile);
        panel
            .add(settings, "material", ["depth", "normal"])
            .name("Material")
            .onChange(setMaterial);
        panel.add(settings, "wireframe").name("Wireframe").onChange(setMaterial);
        panel.add(settings, "autoRotate").name("Auto Rotate");
        panel.add(settings, "vertexCount").name("Vertex count").listen().disable();

        // panel.domElement.style.position = 'relative'
        Object.assign(panel.domElement.style, { position: 'relative', right: '0px' });
        container.appendChild(panel.domElement)
        console.log(panel)

        //

        compile();
    }


    const compile = () => {
        const generator = new SDFGeometryGenerator(renderer);
        const geometry = generator.generate(
            Math.pow(2, settings.res + 2),
            shader(),
            settings.bounds
        );
        geometry.computeVertexNormals();

        if (meshFromSDF) {
            // updates mesh

            meshFromSDF.geometry.dispose();
            meshFromSDF.geometry = geometry;
        } else {
            // inits meshFromSDF : THREE.Mesh

            meshFromSDF = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
            scene.add(meshFromSDF);

            const scale = (Math.min(window.innerWidth, window.innerHeight) / 2) * 0.66;
            meshFromSDF.scale.set(scale, scale, scale);

            setMaterial();
        }

        settings.vertexCount = geometry.attributes.position.count;
    }

    const setMaterial = () => {
        meshFromSDF.material.dispose();

        if (settings.material == "depth") {
            meshFromSDF.material = new THREE.MeshDepthMaterial();
        } else if (settings.material == "normal") {
            meshFromSDF.material = new THREE.MeshNormalMaterial();
        }

        meshFromSDF.material.wireframe = settings.wireframe;
    }

    const onWindowResize = () => {
        // const w = window.innerWidth;
        // const h = window.innerHeight;
        // const w = container.clientWidth,
        //     h = container.clientHeight;
        const { w, h } = getContainerSize();

        renderer.setSize(w, h);

        camera.left = w / -2;
        camera.right = w / 2;
        camera.top = h / 2;
        camera.bottom = h / -2;

        camera.updateProjectionMatrix();
    }

    const render = () => {
        renderer.render(scene, camera);
    }

    const animate = () => {
        requestAnimationFrame(animate);

        controls.update();

        if (settings.autoRotate) {
            meshFromSDF.rotation.y += Math.PI * 0.05 * clock.getDelta();
        }

        render();

        stats.update();
    }

    init();
    animate();

    window.addEventListener("resize", onWindowResize);
    onWindowResize();
}

console.log("<<<<<<<< check_three.js finishes.");
