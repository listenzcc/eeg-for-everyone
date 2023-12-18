import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm'
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import normals from 'https://cdn.jsdelivr.net/npm/angle-normals@1.0.0/+esm'


// Properties and variables
let colorMap = d3.schemeCategory10,
    // Parameter from form 
    _experimentName = document.getElementById('_experimentName').value,
    _subjectID = document.getElementById('_subjectID').value,
    // Brain graph containers
    _zccBrainContainer = document.getElementById('zcc-brainContainer'),
    _zccEEGGeometryContainer = document.getElementById('zcc-eegGeometryContainer'),
    // rawInfoTable
    _rawInfoTbody = d3.select('#zcc-rawInfoTbody')

// ThreeJS stuff
let cube, camera, renderer, brainMesh, scene, stats, texts, aparcNodes, eegSensors, eegGeometrySensors;


// Main loop
d3.json(`/zcc/startWithEEGRaw.json?experimentName=${_experimentName}&subjectID=${_subjectID}`).then(raw => {
    getRawInfo()
    drawRawMontage()
})

/**
 * Retrieves raw information using an HTTP request and updates the DOM with the received data.
 *
 * @returns {void}
 *
 * @example
 * getRawInfo();
 */
let getRawInfo = () => {
    d3.json(`/zcc/getEEGRawInfo.json?experimentName=${_experimentName}&subjectID=${_subjectID}`).then(raw => {
        let array = json2array(raw)

        _rawInfoTbody.selectAll('tr').data([]).exit().remove()
        let tr = _rawInfoTbody.selectAll('tr').data(array).enter().append('tr').attr('class', 'bg-white border-b dark:bg-gray-800 dark:border-gray-700')
        tr.append('th').text(d => d.name).attr('scope', 'row').attr('class', 'px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white')
        tr.append('td').text(d => d.value)
    })
}

/**
* Converts a JSON object into an array of key-value pairs.
*
* @param {Object} json - The JSON object to convert.
* @returns {Array} - An array of objects containing the name and value of each key-value pair in the JSON object.
*
* @example
* const json = { name: "John", age: 30 };
* const array = json2array(json);
* console.log(array); // [{ name: "John", value: "\"John\"" }, { name: "age", value: "30" }]
*/
let json2array = (json) => {
    let array = [];
    for (let name in json) array.push({ name, value: JSON.stringify(json[name]) })
    return array
}


let drawRawMontage = () => {
    // Load glass brain assets
    d3.csv('/asset/fsaverage/glass-cells.csv').then((cells) => {
        d3.csv('/asset/fsaverage/glass-vertices.csv').then((vertices) => {
            // Build mesh for the glass brain
            main(cells, vertices)

            // Load aparc node assets
            d3.json('/asset/fsaverage/aparc.json').then((aparcRaw) => {
                let name, color, xyz, buffer = [];

                for (let i in aparcRaw.name) {
                    name = aparcRaw.name[i]
                    color = '#aaaaaa'  // aparcRaw.color[i]
                    xyz = aparcRaw.xyz[i]

                    // ! The xyz map is correct, x:0, y:2, z:1
                    buffer.push({ i, name, color, x: meter2centimeter(xyz[0]), y: meter2centimeter(xyz[2]), z: meter2centimeter(xyz[1]) })
                }

                aparcNodes = appendSpheres(buffer)

                d3.json(`/zcc/getEEGRawMontage.json?experimentName=${_experimentName}&subjectID=${_subjectID}`).then(montageJson => {
                    console.log(montageJson)
                    d3.csv('/asset/montage/sensor.csv').then(sensorCSV => {
                        let sensors = sensorCSV //.filter(d => montageJson.ch_names.find(e => e === d.name))

                        // Fix position x, y, z
                        sensors.map(d => Object.assign(d, { x: parseFloat(d.x), y: parseFloat(d.z), z: parseFloat(d.y) }))
                        sensors.map(d => Object.assign(d, { x: meter2centimeter(d.x), y: meter2centimeter(d.y), z: meter2centimeter(d.z) }))

                        // Set colors, the invalid sensors' color are set to black
                        sensors.map((d, i) => Object.assign(d, { i, color: colorMap[i % 10] }))
                        sensors.map(d => d.color = montageJson.ch_names.find(e => e === d.name) ? d.color : '#000000')

                        sensors.map(sensor => { Object.assign(sensor, xyz2polar(sensor)) })

                        console.log(sensors)
                        plotSensorsGeometry(sensors)

                        eegSensors = appendSpheres(sensors, 0.2)

                        let loader = new FontLoader();

                        loader.load(
                            // resource URL
                            'https://unpkg.com/three@0.158.0/examples/fonts/helvetiker_regular.typeface.json',

                            // onLoad callback
                            function (font) {
                                // do something with the font
                                console.log('Loaded font', font);
                                appendTexts(sensors, font)
                            },

                            // onProgress callback
                            function (xhr) {
                                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                            },

                            // onError callback
                            function (err) {
                                console.log('An error happened');
                            }
                        );
                    })
                })
            })
        })
    })
}

let getRawMontage = () => {
    d3.json(`/zcc/getEEGRawMontage.json?experimentName=${_experimentName}&subjectID=${_subjectID}`).then(montageJson => {
        console.log(montageJson)
        d3.csv('/asset/montage/sensor.csv').then(sensorCsv => {
            sensorCsv.map(d => Object.assign(d, { x: parseFloat(d.x), y: parseFloat(d.y), z: parseFloat(d.z) }))
            sensorCsv.map((d, i) => Object.assign(d, { i, color: colorMap[i % 10] }))
            sensorCsv = sensorCsv.filter(d => montageJson.ch_names.find(e => e === d.name))
            console.log(sensorCsv)
        })
    })
}


let meter2centimeter = d3.scaleLinear().domain([0, 1]).range([0, 100])

/**
 * Append spheres to the scene based on the buffer.
 * @param {Array} buffer The buffer of {name, color, x, y, z}
 */
let appendSpheres = (buffer, size = 0.1, opacity = 1.0, transparent = true, flatShading = true) => {

    let geometry, material, mesh;
    let meshes = buffer.map(({ name, color, x, y, z }) => {
        material = new THREE.MeshPhongMaterial({
            color, opacity, transparent, flatShading
        })
        geometry = new THREE.SphereGeometry(size, 20)
        mesh = new THREE.Mesh(geometry, material)

        Object.assign(mesh.position, { x, y, z })
        return mesh
    })

    meshes.map(mesh => {
        scene.add(mesh)
    })

    return meshes
}

let appendTexts = (buffer, font) => {
    let geometry, material, mesh;
    texts = buffer.map(({ name, color, x, y, z }, i) => {
        geometry = new TextGeometry(name, {
            font,
            size: 0.6,
            height: 0.1,
        }),
            material = new THREE.MeshPhongMaterial({ color, opacity: 0.9, transparent: true }),
            mesh = new THREE.Mesh(geometry, material);

        Object.assign(mesh.position, { x, y, z })
        scene.add(mesh)
        return mesh
    })
}


let main = (cells, vertices) => {
    let brainModel = mkBrainModel(cells, vertices),
        geometry = mkGeometry(mkVertices(brainModel));

    brainMesh = mkBrainMesh(geometry);

    init();

    scene.add(brainMesh);

    stats = new Stats();
    Object.assign(stats.dom.style, { position: 'relative' });
    // _zccBrainContainer.appendChild(stats.dom);
    _zccBrainContainer.appendChild(renderer.domElement)

    let render = () => {
        if (texts) {
            texts.map(text => { text ? text.lookAt(camera.position) : false })
        }
        renderer.render(scene, camera)
    }


    let animate = () => {
        cube.rotation.z += 0.01;
        cube.rotation.y += 0.01;

        render()

        stats.update()

        requestAnimationFrame(animate)
    }
    animate()

    window.addEventListener("resize", onWindowResize);
    onWindowResize();
}

let getContainerSize = () => {
    const w = _zccBrainContainer.clientWidth,
        h = _zccBrainContainer.clientWidth;
    return { w, h }
}

let onWindowResize = () => {
    const { w, h } = getContainerSize();

    renderer.setSize(w, h);

    camera.left = w / -2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = h / -2;
    camera.aspect = w / h;

    camera.updateProjectionMatrix();
}

let init = () => {
    {
        let material = new THREE.MeshNormalMaterial(),
            geometry = new THREE.BoxGeometry(1, 1, 1);
        cube = new THREE.Mesh(geometry, material);
        cube.position.y = 0; // -10;
        cube.position.x = 0; // 20;
        cube.position.z = 0; // 20;
    }

    {
        let { w, h } = getContainerSize(),
            fov = 45,
            aspect = w / h,
            near = 0.1,
            far = 200;
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(25, 25, -25);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
    }

    {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        let { w, h } = getContainerSize(),
            controls = new OrbitControls(camera, renderer.domElement);
        renderer.setSize(w, h);
        renderer.setPixelRatio(devicePixelRatio);
        // controls.addEventListener("change", () => renderer.render(scene, camera));
    }

    {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x001b42);
        // scene.add(cube);

        let color = 0xffffff,
            intensity = 1,
            light = new THREE.AmbientLight(color, intensity);
        scene.add(light);

        let size = 40,
            divisions = 2,
            helper = new THREE.GridHelper(size, divisions, 0xa4cab6, 0x7a7374);
        helper.position.y = -10;
        // scene.add(helper);

    }
}


let mkBrainMesh = (brainGeometry) => {
    let material = new THREE.MeshPhongMaterial({
        color: "hsl(0,100%,100%)",
        opacity: 0.1,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    return new THREE.Mesh(brainGeometry, material);
}


let mkBrainModel = (cells, vertices) => {
    let scaler = 0.19;

    const _cells = cells.map((e) => [
        parseInt(e.v2),
        parseInt(e.v1),
        parseInt(e.v0)
    ]);

    const positions = vertices.map((e) => [
        parseFloat(e.z * scaler - 8.5),
        parseFloat(e.x * scaler - 6.8),
        parseFloat(e.y * scaler - 12)
    ]);

    const colors = cells.map(() => [0.4, 0.4, 0.4, 0.5]);

    return { cells: _cells, positions, colors };
}

let mkVertices = (meshModel) => {
    const vertices = [];

    let { positions, cells } = meshModel,
        norms = normals(cells, positions),
        uv3 = [
            [0, 0],
            [0, 1],
            [1, 0]
        ];

    let pos, norm, uv;
    for (let cell of cells) {
        for (let i = 0; i < 3; i++) {
            pos = positions[cell[i]];
            norm = norms[cell[i]];
            uv = uv3[i];
            vertices.push({ pos, norm, uv });
        }
    }

    return vertices;
}

let mkGeometry = (vertices) => {
    const geometry = new THREE.BufferGeometry();

    var positions = [],
        normals = [],
        uvs = [],
        positionNumComponents = 3,
        normalNumComponents = 3,
        uvNumComponents = 2;

    for (let vertex of vertices) {
        positions.push(...vertex.pos);
        normals.push(...vertex.norm);
        uvs.push(...vertex.uv);
    }

    const positionAttr = new THREE.BufferAttribute(
        new Float32Array(positions),
        positionNumComponents
    );
    const normalAttr = new THREE.BufferAttribute(
        new Float32Array(normals),
        normalNumComponents
    );
    const uvAttr = new THREE.BufferAttribute(
        new Float32Array(uvs),
        uvNumComponents
    );

    geometry.setAttribute("position", positionAttr);
    geometry.setAttribute("normal", normalAttr);
    geometry.setAttribute("uv", uvAttr);

    return geometry;
}

let plotSensorsGeometry = (sensors) => {

    let plt,
        d2x = (d) => d.theta * Math.cos(d.phi),
        d2y = (d) => d.theta * Math.sin(d.phi);

    plt = Plot.plot({
        x: { nice: true },
        y: { nice: true },
        width: 600,
        grid: true,
        color: { nice: true, legend: true, scheme: 'RdBu', reverse: true },
        aspectRatio: 1.0,
        marks: [
            // Plot.contour(sensors, { x: d2x, y: d2y, fill: 'v', blur: 4, interval: 0.3, opacity: 0.5 }),
            Plot.dot(sensors, { x: d2x, y: d2y, fill: 'color' }),
            Plot.text(sensors, { x: d2x, y: d2y, fill: 'color', text: 'name', fontSize: 15, dx: 10, dy: 10 }),
        ],
    })

    _zccEEGGeometryContainer.replaceChild(plt, _zccEEGGeometryContainer.firstChild)
}

let xyz2polar = (obj) => {
    let { x, y, z } = obj,
        radius = Math.sqrt(x * x + y * y + z * z),
        theta = Math.acos(y / radius),
        phi = Math.atan2(z, x);

    return { radius, theta, phi }
}