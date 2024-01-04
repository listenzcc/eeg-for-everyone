import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import normals from "https://cdn.jsdelivr.net/npm/angle-normals@1.0.0/+esm";

// Properties and variables
let colorMap = d3.schemeCategory10,
    // Parameter from form
    _experimentName = document.getElementById("_experimentName").value,
    _subjectID = document.getElementById("_subjectID").value,
    // Graph containers
    _zccBrainContainer = document.getElementById("zcc-brainContainer"),
    _zccEEGGeometryContainer = document.getElementById(
        "zcc-eegGeometryContainer"
    ),
    _zccEventsContainer = document.getElementById("zcc-eventsContainer"),
    _zccEEGDataContainer = document.getElementById("zcc-eegDataContainer"),
    _zccEEGDataControllerContainer = document.getElementById(
        "zcc-eegDataControllerContainer"
    ),
    _zccStartSetupContainer = document.getElementById('zcc-startSetupContainer'),
    // rawInfoTable
    _rawInfoTbody = d3.select("#zcc-rawInfoTbody");

let everythingIsFine = {
    info: false,
    montage: false,
    events: false,
    data: false
}

let checkEverythingIsFine = () => {
    let allPassed = true;
    for (const key in everythingIsFine) {
        if (Object.hasOwnProperty.call(everythingIsFine, key) && !everythingIsFine[key]) {
            allPassed = false;
            console.warn('Not ready:', key)
        }
    }
    if (allPassed) {
        _zccStartSetupContainer.style.display = 'block'
        console.log('Everything is fine:', everythingIsFine)
    }
}

// ThreeJS stuff
let cube,
    camera,
    renderer,
    scene,
    stats,
    brainMesh,
    texts,
    eegSensors,
    events,
    eegDataSegment;


// Start analysis
d3.json(`/zcc/startWithEEGRaw.json?experimentName=${_experimentName}&subjectID=${_subjectID}`).then((startAnalysis) => {
    console.log('Start analysis:', startAnalysis)
    getRawInfo();
    drawRawMontage();
    drawEvents();
})



let drawEEGRawData = (seconds = 0, windowLength = 3) => {
    if (document.getElementById('zcc-SelectedEEGSeconds')) {
        seconds = document.getElementById('zcc-SelectedEEGSeconds').value;
    }

    // Dim out the current graph
    {
        let svg = d3.select(_zccEEGDataContainer).select('svg').node()
        if (svg) {
            svg.style.filter = 'opacity(0.1)'
        }
    }
    d3.csv(
        `/zcc/getEEGRawData.csv?experimentName=${_experimentName}&subjectID=${_subjectID}&seconds=${seconds}&windowLength=${windowLength}`
    ).then((dataCsv) => {
        let chNames = dataCsv.columns.filter((d) => d && d !== "seconds");
        dataCsv.map((d) => {
            dataCsv.columns.map((c) => (d[c] = parseFloat(d[c])));
        });
        console.log('Got eeg data:', dataCsv)
        console.log('Sensor names:', chNames)
        eegDataSegment = dataCsv;

        if (_zccEEGDataControllerContainer.childElementCount === 0) {
            {
                let select = d3.select(_zccEEGDataControllerContainer)
                    .append('div').attr('class', 'w-96')
                    .append('label').text('Select sensor:')
                    .append("select").attr('id', 'zcc-SelectedEEGSensorName')

                select
                    .selectAll("option")
                    .data(['--'].concat(chNames))
                    .enter()
                    .append("option")
                    .attr("value", (d) => d)
                    .text((d) => d)

                select
                    .on('input', e => {
                        let name = e.target.value
                        plotEEGData(chNames, name)
                        plotSensorsFlat(name)
                        console.log('Re-plot the eeg data by sensor name:', name)
                        texts.map(text => {
                            text.name === name ? Object.assign(text.scale, { x: 3, y: 3, z: 3 }) : Object.assign(text.scale, { x: 1, y: 1, z: 1 })
                        })
                        console.log('Enlarged sensor by sensor name:', name)
                    })
            }

            {
                let select = d3.select(_zccEEGDataControllerContainer)
                    .append('div').attr('class', 'w-96')
                    .append('label').text('Select seconds:')
                    .append("select").attr('id', 'zcc-SelectedEEGSeconds')

                select
                    .selectAll("option")
                    .data(events)
                    .enter()
                    .append("option")
                    .attr("value", (d) => d.seconds)
                    .text((d) => {
                        let s = d.label.padEnd(8) + " | " + d.seconds.toFixed(2)
                        console.log(s)
                        return s
                    })

                select
                    .on('input', e => {
                        let seconds = e.target.value

                        // Request eeg data since the center second is changed.
                        drawEEGRawData(seconds)

                        plotEvents(seconds)
                        console.log('Position to seconds:', seconds)
                    })

            }
        }

        let highlightChannel = document.getElementById('zcc-SelectedEEGSensorName').value;
        console.log('Highlight sensor by name: ', highlightChannel)
        plotEEGData(chNames, highlightChannel);

        everythingIsFine.data = true
        checkEverythingIsFine()
    });
};

let plotEEGData = (chNamesFull, highlightChannel) => {
    let dataCsv = eegDataSegment,
        container = _zccEEGDataContainer,
        chNames,
        marks1,
        marks2,
        plt;

    if (highlightChannel !== '--' && chNamesFull.find(d => d === highlightChannel)) {
        chNames = [highlightChannel]
    } else {
        chNames = chNamesFull
    }

    marks1 = chNames.map((name) => {
        let data = dataCsv.map((d) =>
            Object.assign({}, { name, y: d[name], seconds: d.seconds })
        ),
            select = eegSensors.find((d) => d.name === name),
            color = select ? select.color : "#333333";

        return Plot.line(data, { x: "seconds", y: "y", stroke: color });
    })

    // console.log(events)
    if (events) {
        let selectedEvents = events.filter(d => d.seconds < d3.max(dataCsv, d => d.seconds) && d.seconds > d3.min(dataCsv, d => d.seconds))
        console.log('Found events inside eeg data time range:', selectedEvents)
        marks2 = selectedEvents.map(d => Plot.ruleX([d.seconds]))
        marks2.push(Plot.text(selectedEvents, { x: 'seconds', text: 'label', fontSize: 20 }))
    } else {
        marks2 = []
    }

    plt = Plot.plot({
        y: { nice: true, label: 'µV' },
        height: container.clientWidth * 0.5,
        width: container.clientWidth,
        grid: true,
        color: { nice: true, legend: true, scheme: "Turbo" },
        marks: marks1.concat(marks2),
    });

    container.innerHTML = `<div style="overflow-wrap: break-word">${chNames}</div>`;
    // container.replaceChild(plt, container.firstChild);
    container.appendChild(plt)
};

let drawEvents = () => {
    d3.csv(
        `/zcc/getEEGRawEvents.csv?experimentName=${_experimentName}&subjectID=${_subjectID}`
    ).then((eventsCsv) => {
        eventsCsv.map((d) =>
            Object.assign(d, {
                seconds: parseFloat(d.seconds),
                timestamp: parseInt(d.timestamp),
                label: "L:" + d.label
            })
        );
        events = eventsCsv
        console.log('Fetched events:', events)
        plotEvents();
        everythingIsFine.events = true
        checkEverythingIsFine()
    });
};

let plotEvents = (targetSeconds) => {
    let eventsCsv = events,
        container = _zccEventsContainer,
        plt;

    plt = Plot.plot({
        x: { nice: true, domain: d3.extent(eventsCsv, d => d.seconds) },
        y: { nice: true },
        marginLeft: 80,
        height: container.clientWidth * 0.3,
        width: container.clientWidth,
        grid: true,
        color: { nice: true, legend: true, scheme: "Turbo", range: [0.2, 1.0] },
        // aspectRatio: 1.0,
        marks: [
            Plot.dot(eventsCsv, {
                x: "seconds",
                fy: "label",
                r: 7,
                fill: 'label',
                tip: true,
            }),
            Plot.text(eventsCsv, {
                x: "seconds",
                fy: "label",
                text: 'label'
            }),
            Plot.ruleX([targetSeconds || 0])
        ],
    });

    container.innerHTML = "<div></div>";
    container.replaceChild(plt, container.firstChild);
};

/**
 * Retrieves raw information using an HTTP request and updates the DOM with the received data.
 *
 * @returns {void}
 *
 * @example
 * getRawInfo();
 */
let getRawInfo = () => {
    d3.json(
        `/zcc/getEEGRawInfo.json?experimentName=${_experimentName}&subjectID=${_subjectID}`
    ).then((raw) => {
        let array = json2array(raw);

        _rawInfoTbody.selectAll("tr").data([]).exit().remove();
        let tr = _rawInfoTbody
            .selectAll("tr")
            .data(array)
            .enter()
            .append("tr")
            .attr("class", "bg-white border-b dark:bg-gray-800 dark:border-gray-700");
        tr.append("th")
            .text((d) => d.name)
            .attr("scope", "row")
            .attr(
                "class",
                "px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
            );
        tr.append("td").text((d) => d.value);

        everythingIsFine.info = true
        checkEverythingIsFine()
    });
};

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
    for (let name in json)
        array.push({ name, value: JSON.stringify(json[name]) });
    return array;
};

let drawRawMontage = () => {
    // Load glass brain assets
    d3.csv("/asset/fsaverage/glass-cells.csv").then((cells) => {
        d3.csv("/asset/fsaverage/glass-vertices.csv").then((vertices) => {
            // Build mesh for the glass brain
            main(cells, vertices);

            // Load aparc node assets
            d3.json("/asset/fsaverage/aparc.json").then((aparcRaw) => {
                let name,
                    color,
                    opacity,
                    xyz,
                    buffer = [];

                for (let i in aparcRaw.name) {
                    name = aparcRaw.name[i];
                    color = "#ffffff"; // aparcRaw.color[i]
                    xyz = aparcRaw.xyz[i];
                    opacity = 0.2;

                    // ! The xyz map is correct, x:0, y:2, z:1
                    buffer.push({
                        i,
                        name,
                        color,
                        opacity,
                        x: meter2centimeter(xyz[0]),
                        y: meter2centimeter(xyz[2]),
                        z: meter2centimeter(xyz[1]),
                    });
                }

                appendSpheres(buffer);

                d3.json(
                    `/zcc/getEEGRawMontage.json?experimentName=${_experimentName}&subjectID=${_subjectID}`
                ).then((montageJson) => {
                    // console.log(montageJson)
                    d3.csv("/asset/montage/sensor.csv").then((sensorCSV) => {
                        let sensors = sensorCSV; //.filter(d => montageJson.ch_names.find(e => e === d.name))

                        // Fix position x, y, z
                        sensors.map((d) =>
                            Object.assign(d, {
                                x: parseFloat(d.x),
                                y: parseFloat(d.z),
                                z: parseFloat(d.y),
                            })
                        );
                        sensors.map((d) =>
                            Object.assign(d, {
                                x: meter2centimeter(d.x),
                                y: meter2centimeter(d.y),
                                z: meter2centimeter(d.z),
                            })
                        );

                        // Set colors, the invalid sensors' color are set to gray
                        sensors.map((d, i) =>
                            Object.assign(d, { i, color: colorMap[i % 10] })
                        );
                        sensors.map(
                            (d) =>
                            (d.color = montageJson.ch_names.find((e) => e === d.name)
                                ? d.color
                                : "#333333")
                        );
                        sensors.map((sensor) => {
                            Object.assign(sensor, xyz2polar(sensor));
                        });

                        eegSensors = sensors;
                        appendSpheres(sensors, 0.2);

                        plotSensorsFlat();
                        drawEEGRawData();

                        everythingIsFine.montage = true
                        checkEverythingIsFine()

                        let loader = new FontLoader();

                        loader.load(
                            // resource URL
                            "https://unpkg.com/three@0.158.0/examples/fonts/helvetiker_regular.typeface.json",

                            // onLoad callback
                            function (font) {
                                // do something with the font
                                console.log("Loaded font", font);
                                appendTexts(sensors, font);
                            },

                            // onProgress callback
                            function (xhr) {
                                console.log('Font onProgress:', (xhr.loaded / xhr.total) * 100 + "% loaded");
                            },

                            // onError callback
                            function (err) {
                                console.error("Loaded font failed");
                            }
                        );
                    });
                });
            });
        });
    });
};

let meter2centimeter = d3.scaleLinear().domain([0, 1]).range([0, 100]);

/**
 * Append spheres to the scene based on the buffer.
 * @param {Array} buffer The buffer of {name, color, x, y, z}
 */
let appendSpheres = (
    buffer,
    size = 0.1,
    transparent = true,
    flatShading = true
) => {
    let geometry, material, mesh;
    let meshes = buffer.map(({ name, color, opacity, x, y, z }) => {
        material = new THREE.MeshPhongMaterial({
            color,
            opacity: opacity || 1.0,
            transparent,
            flatShading,
        });
        geometry = new THREE.SphereGeometry(size, 20);
        mesh = new THREE.Mesh(geometry, material);

        Object.assign(mesh.position, { x, y, z });
        return mesh;
    });

    meshes.map((mesh) => {
        scene.add(mesh);
    });

    return meshes;
};

let appendTexts = (buffer, font) => {
    let geometry, material, mesh;
    texts = buffer.map(({ name, color, x, y, z }, i) => {
        (geometry = new TextGeometry(name, {
            font,
            size: 0.6,
            height: 0.1,
        })),
            (material = new THREE.MeshPhongMaterial({
                color,
                opacity: 0.9,
                transparent: true,
            })),
            (mesh = new THREE.Mesh(geometry, material));

        Object.assign(mesh.position, { x, y, z });
        scene.add(mesh);
        mesh.name = name
        return mesh;
    });
};

let main = (cells, vertices) => {
    let brainModel = mkBrainModel(cells, vertices),
        geometry = mkGeometry(mkVertices(brainModel));

    brainMesh = mkBrainMesh(geometry);

    init();

    scene.add(brainMesh);

    stats = new Stats();
    Object.assign(stats.dom.style, { position: "relative" });
    _zccBrainContainer.innerHTML = "";
    // _zccBrainContainer.appendChild(stats.dom);
    _zccBrainContainer.appendChild(renderer.domElement);

    let render = () => {
        if (texts) {
            texts.map((text) => {
                text ? text.lookAt(camera.position) : false;
            });
        }
        renderer.render(scene, camera);
    };

    let animate = () => {
        cube.rotation.z += 0.01;
        cube.rotation.y += 0.01;

        render();

        stats.update();

        requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener("resize", onWindowResize);
    onWindowResize();
};

let getContainerSize = () => {
    const w = _zccBrainContainer.clientWidth,
        h = _zccBrainContainer.clientWidth;
    return { w, h };
};

let onWindowResize = () => {
    const { w, h } = getContainerSize();

    renderer.setSize(w, h);

    camera.left = w / -2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = h / -2;
    camera.aspect = w / h;

    camera.updateProjectionMatrix();
};

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
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        let { w, h } = getContainerSize(),
            controls = new OrbitControls(camera, renderer.domElement);
        renderer.setSize(w, h);
        renderer.setPixelRatio(devicePixelRatio);
        // controls.addEventListener("change", () => renderer.render(scene, camera));
    }

    {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x001b42);
        scene.background = new THREE.Color(0xf3f4f6);
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
};

let mkBrainMesh = (brainGeometry) => {
    let material = new THREE.MeshPhongMaterial({
        color: "hsl(0,100%,100%)",
        opacity: 0.1,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    return new THREE.Mesh(brainGeometry, material);
};

let mkBrainModel = (cells, vertices) => {
    let scaler = 0.19;

    const _cells = cells.map((e) => [
        parseInt(e.v2),
        parseInt(e.v1),
        parseInt(e.v0),
    ]);

    const positions = vertices.map((e) => [
        parseFloat(e.z * scaler - 8.5),
        parseFloat(e.x * scaler - 6.8),
        parseFloat(e.y * scaler - 12),
    ]);

    const colors = cells.map(() => [0.4, 0.4, 0.4, 0.5]);

    return { cells: _cells, positions, colors };
};

let mkVertices = (meshModel) => {
    const vertices = [];

    let { positions, cells } = meshModel,
        norms = normals(cells, positions),
        uv3 = [
            [0, 0],
            [0, 1],
            [1, 0],
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
};

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
};

let plotSensorsFlat = (enlargeSensorName) => {
    let sensors = eegSensors;

    let plt,
        d2x = (d) => d.theta * Math.cos(d.phi),
        d2y = (d) => d.theta * Math.sin(d.phi);

    plt = Plot.plot({
        x: { nice: true },
        y: { nice: true },
        width: 600,
        grid: true,
        color: { nice: true, legend: true, scheme: "RdBu", reverse: true },
        aspectRatio: 1.0,
        marks: [
            // Plot.contour(sensors, { x: d2x, y: d2y, fill: 'v', blur: 4, interval: 0.3, opacity: 0.5 }),
            Plot.dot(sensors, { x: d2x, y: d2y, fill: "color", r: d => enlargeSensorName === d.name ? 3 : 1 }),
            Plot.text(sensors, {
                x: d2x,
                y: d2y,
                fill: "color",
                text: "name",
                fontSize: d => enlargeSensorName === d.name ? 40 : 15,
                dx: 10,
                dy: 10,
            }),
        ],
    });

    _zccEEGGeometryContainer.innerHTML = "<div></div>";
    _zccEEGGeometryContainer.replaceChild(
        plt,
        _zccEEGGeometryContainer.firstChild
    );
};

/**
 * Converts Cartesian coordinates (x, y, z) to polar coordinates (radius, theta, phi).
 *
 * @param {Object} obj - The object containing the Cartesian coordinates.
 * @param {number} obj.x - The x-coordinate.
 * @param {number} obj.y - The y-coordinate.
 * @param {number} obj.z - The z-coordinate.
 * @returns {Object} - The object containing the polar coordinates.
 * @property {number} radius - The radial distance from the origin.
 * @property {number} theta - The inclination angle from the positive y-axis.
 * @property {number} phi - The azimuthal angle from the positive x-axis.
 *
 * @example
 * const cartesian = { x: 1, y: 2, z: 3 };
 * const polar = xyz2polar(cartesian);
 * console.log(polar); // { radius: 3.7416573867739413, theta: 1.1071487177940904, phi: 1.2490457723982544 }
 */
let xyz2polar = (obj) => {
    let { x, y, z } = obj,
        radius = Math.sqrt(x * x + y * y + z * z),
        theta = Math.acos(y / radius),
        phi = Math.atan2(z, x);

    return { radius, theta, phi };
};
