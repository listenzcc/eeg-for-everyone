import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";


let _experimentName = document.getElementById("_experimentName").value,
    _subjectID = document.getElementById("_subjectID").value

let colorMap = d3.schemeCategory10,
    // UI components
    eventLabelSelector,
    epochsTimeStampSelector,
    sensorNamesSelector,
    secsSelector,

    // Plot graphics
    eventsGraph,
    evokedDataGraph,
    evokedGeometryGraph,

    // Dynamic data
    eventsData,
    montageSensors,
    evokedData,
    chNames;

/**
 * Fetches the epochs events CSV data and initializes the events and sensors.
 *
 * @returns {void}
 *
 * @example
 * startsWithEpochsEventsCsv();
 */
let startsWithEpochsEventsCsv = () => {
    // Fetch epochs events
    d3.csv(`/zcc/getEEGEpochsEvents.csv?experimentName=${_experimentName}&subjectID=${_subjectID}`).then((data) => {
        eventsData = csvParseInt(data);
        console.log('Fetched eventsData', eventsData)

        // Fetch montage sensor
        d3.csv('/asset/montage/sensor.csv').then(sensors => {
            montageSensors = betterMontageSensors(sensors)
            console.log('Fetched montageSensors', montageSensors)
            onLoadEventsAndSensors()
        })

    }).catch((err) => {
        // If not ready, wait 1000 ms and try again
        console.log('Waiting for backend computing ...', err)
        setTimeout(startsWithEpochsEventsCsv, 1000)
    })
}

// ! The very start of the funcs
startsWithEpochsEventsCsv()

/**
 * Creates the event selector and associated graph.
 *
 * @returns {void}
 *
 * @example
 * mkEventSelector();
 */
let onLoadEventsAndSensors = () => {
    let events = [...new Set(eventsData.map(d => d.label))],
        container = document.getElementById('zcc-eventSelectContainer');

    // Refresh container
    container.innerHTML = '';
    container = d3.select(container);

    // Append event label selector
    {
        let div = container.append('div').html(`
<div>
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose event
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `)

        eventLabelSelector = div.select('select')
        eventLabelSelector.on('change', (e) => {
            onSelectEventLabel()
        })

        eventLabelSelector.selectAll('option').data(events).enter().append('option').attr('value', d => d).text(d => d)
    }
    // eventLabelSelector = container.append('div').append('label').text('Choose event:').append('select').on('change', (e) => {
    //     onSelectEventLabel()
    // })
    // eventLabelSelector.selectAll('option').data(events).enter().append('option').attr('value', d => d).text(d => d)

    // Append time stamp selector
    epochsTimeStampSelector = container.append('div').append('label').text('Choose epoch:').append('select').on('change', (e) => {
        onSelectEpochTimeStamp()
    })
    // ! Will be appended children by onSelectEventLabel(x)

    // Add graph
    eventsGraph = container.append('div')

    // Initialize the graph as selecting the 1st epoch
    onSelectEventLabel()
    onSelectEpochTimeStamp()
}

/**
 * Handles the onload event for the evoked data.
 *
 * @returns {void}
 *
 * @example
 * onloadEvokedData();
 */
let onloadEvokedData = () => {
    chNames = evokedData.columns.filter(d => d.length > 0 && d !== '_times')

    let container = document.getElementById('zcc-evokedDataContainer'),
        // Good sensors are the sensors in both evokedData and montageSensors
        goodSensors = chNames.map(ch => montageSensors.find(d => d.name === ch)).filter(d => d),
        // Bad sensor names are the names only in evokedData
        badSensorNames = chNames.filter(ch => !montageSensors.find(d => d.name === ch));

    chNames = chNames.map(name => {
        let isGoodSensor = goodSensors.findIndex(d => d.name === name) > -1,
            color = isGoodSensor ? goodSensors.find(d => d.name === name).color : 'gray';
        return Object.assign({ name }, { color, isGoodSensor })
    })

    console.log('The chNames are generated:', chNames)
    console.log('The goodSensors (has pos in montage):', goodSensors)
    console.log('The badSensorNames (not has pos in montage):', badSensorNames)

    // Refresh container
    container.innerHTML = ''
    container = d3.select(container);

    // Append sensor names selector
    sensorNamesSelector = container.append('div').attr('class', 'flex flex-wrap')
    sensorNamesSelector.selectAll('label').data(chNames).enter().append('label').html(d => `
<label class="max-w-xs flex justify-between p-3 w-24 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400">
    <div>
        <span class="font-semibold text-sm text-gray-500 ms-3 dark:text-gray-400" style="color: ${d.color}">${d.name}</span>
    </div>
    <input type="checkbox" class="shrink-0 mt-0.5 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800">
</label>
    `)
    sensorNamesSelector.selectAll('label').select('label').select('input').property('checked', d => d.isGoodSensor).on('change', e => redrawEvokedGraphics())

    // Toggle for show|hide all the sensors
    {
        let div = container.append('div').html(`
<div class="max-w-xs flex justify-between p-3 w-full">
</div>
        `)

        div = div.select('div')

        div.append('div').html(d => `
<button type="button" class="px-4 py-2 font-semibold text-sm bg-blue-900 text-white rounded-lg shadow-lg">
    Hide all sensors
</button>
    `).on('click', e => {
            sensorNamesSelector.selectAll('label').select('label').select('input').property('checked', d => false)
            redrawEvokedGraphics()
        })

        div.append('div').html(d => `
<button type="button" class="px-4 py-2 font-semibold text-sm bg-blue-900 text-white rounded-lg shadow-lg">
    Show all sensors
</button>
    `).on('click', e => {
            sensorNamesSelector.selectAll('label').select('label').select('input').property('checked', d => d.isGoodSensor)
            redrawEvokedGraphics()
        })

    }

    // Append secs selector
    secsSelector = container.append('div').append('label').text('Choose time:').append('select').on('change', (e) => {
        redrawEvokedGraphics()
    })
    secsSelector.selectAll('option').data(evokedData.slice(0, evokedData.length - 1)).enter().append('option').attr('value', d => d._times).text(d => d._times)

    // Add evoked data graph
    evokedDataGraph = container.append('div')

    // Append evoked geometry graph
    {
        let container = document.getElementById('zcc-evokedGeometryContainer');
        container.innerHTML = ''
        container = d3.select(container)
        evokedGeometryGraph = container.append('div')
        redrawEvokedGraphics()
    }

}

/**
 * Redraws the evoked graphics based on the selected parameters.
 * It includes evokedDataGraph and evokedGeometryGraph.
 *
 * @returns {void}
 *
 * @example
 * redrawEvokedGraphics();
 */
let redrawEvokedGraphics = () => {
    // Good sensors are the sensors in both evokedData and montageSensors
    let secs = parseFloat(secsSelector.node().value),
        goodSensors = chNames.map(({ name }) => montageSensors.find(d => d.name === name)).filter(d => d);

    let plotEvokedDataGraph = () => {
        let plt,
            lines,
            container = evokedDataGraph.node(),
            times = evokedData.map(d => d._times),
            checks = sensorNamesSelector.selectAll('label').select('label').select('input').nodes().map(d => d.checked),
            displayChNames = chNames.filter((d, i) => checks[i])

        console.log('Display chNames:', displayChNames)

        lines = displayChNames.map(({ name, color }) => Plot.line(evokedData, {
            x: d => d._times,
            y: d => d[name],
            stroke: d => color,
            tip: true
        }))

        plt = Plot.plot({
            x: { nice: true, domain: d3.extent(times) },
            y: { nice: true, nice: true },
            title: 'Event label: ' + evokedData.eventLabel,
            grid: true,
            height: 400,
            marks: lines.concat([
                Plot.ruleX([secs])
            ])
        })

        container.innerHTML = ''
        container.appendChild(plt)
    }

    let plotEvokedGeometryGraph = () => {
        let plt,
            d2x = (d) => d.theta * Math.cos(d.phi),
            d2y = (d) => d.theta * Math.sin(d.phi),
            container = evokedGeometryGraph.node(),
            data = evokedData.find(e => e._times > secs);

        goodSensors.map(d => Object.assign(d, { value: data[d.name] }))

        plt = Plot.plot({
            x: { nice: true },
            y: { nice: true },
            width: 600,
            grid: true,
            color: { nice: true, legend: true, scheme: "RdBu", reverse: true, domain: [-1e-5, 1e-5] },
            aspectRatio: 1.0,
            marks: [
                Plot.contour(goodSensors, {
                    x: d2x,
                    y: d2y,
                    fill: 'value',
                    blur: 10,
                    interval: 1e-6,
                    opacity: 0.5
                }),
                Plot.dot(goodSensors, {
                    x: d2x,
                    y: d2y,
                    fill: "color",
                    r: 2,
                    tip: true
                }),
                Plot.text(goodSensors, {
                    x: d2x,
                    y: d2y,
                    fill: "color",
                    text: "name",
                    fontSize: 15,
                    dx: 10,
                    dy: 10,
                }),
            ],
        });
        container.innerHTML = ''
        container.appendChild(plt)
    }

    plotEvokedDataGraph()
    plotEvokedGeometryGraph()
}

/**
 * Handles the event when an event label is selected.
 *
 * @param {string} eventLabel - The selected event label. The 3rd column of the events record in MNE
 * @returns {void}
 *
 * @example
 * onSelectEventLabel(5);
 */
let onSelectEventLabel = () => {
    let eventLabel = parseInt(eventLabelSelector.node().value),
        data = eventsData.filter(d => d.label === eventLabel)
    console.log('On select event label:', eventLabel, ', Got data:', data)

    epochsTimeStampSelector.selectAll('option').data([]).exit().remove()
    epochsTimeStampSelector.selectAll('option').data(data).enter().append('option').attr('value', d => d.timeStamp).text(d => d.timeStamp)
    console.log('Updated epochSelector', epochsTimeStampSelector)

    onSelectEpochTimeStamp(data[0].timeStamp)

    d3.csv(`/zcc/getEEGEvokedData.csv?experimentName=${_experimentName}&subjectID=${_subjectID}&event=${eventLabel}`).then(csv => {
        evokedData = csvParseFloat(csv)
        evokedData.eventLabel = eventLabel
        console.log('Fetched evoked data:', evokedData)

        onloadEvokedData(evokedData)
    })

}

/**
 * Handles the event when an epoch timestamp is selected.
 *
 * @param {string} timestamp - The selected epoch timestamp. The 1st column of the events record in MNE.
 * @returns {void}
 *
 * @example
 * onSelectEpochTimeStamp(83767);
 */
let onSelectEpochTimeStamp = () => {
    let timestamp = parseInt(epochsTimeStampSelector.node().value)
    console.log('On select epoch (timestamp):', timestamp)

    let plt,
        container = eventsGraph.node(),
        extent = d3.extent(eventsData, d => d.timeStamp - 0);

    plt = Plot.plot({
        x: { nice: true, domain: extent },
        y: { nice: true },
        color: { legend: true, scale: 'ordinal' },
        grid: true,
        height: 400,
        marks: [
            Plot.dot(eventsData, {
                x: 'timeStamp',
                fy: 'label',
                r: 8,
                fill: d => 'Label: ' + d.label,
                tip: true
            }),
            Plot.dot(eventsData.filter(d => d.timeStamp === parseInt(timestamp)), {
                x: 'timeStamp',
                fy: 'label',
                r: 10,
                stroke: 'red'
            }),
            Plot.text(eventsData, {
                x: 'timeStamp',
                fy: 'label',
                text: 'label',
                fill: 'white'
            })
        ]
    })

    container.innerHTML = '<div></div>'
    container.replaceChild(plt, container.firstChild)
}


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

/**
 * Parses the CSV data and converts all values to integers.
 *
 * @param {Array} csv - The CSV data to parse.
 * @returns {Array} - The parsed CSV data with integer values.
 *
 * @example
 * const csvData = [{ a: '1', b: '2' }, { a: '3', b: '4' }];
 * const parsedData = csvParseInt(csvData);
 * console.log(parsedData); // [{ a: 1, b: 2 }, { a: 3, b: 4 }]
 */
let csvParseInt = (csv) => {
    csv.map(d => {
        for (let c in d) {
            d[c] = parseInt(d[c])
        }
    })
    return csv
}

/**
 * Parses the CSV data and converts all values to floats.
 *
 * @param {Array} csv - The CSV data to parse.
 * @returns {Array} - The parsed CSV data with float values.
 *
 * @example
 * const csvData = [{ a: '1.5', b: '2.7' }, { a: '3.2', b: '4.9' }];
 * const parsedData = csvParseFloat(csvData);
 * console.log(parsedData); // [{ a: 1.5, b: 2.7 }, { a: 3.2, b: 4.9 }]
 */
let csvParseFloat = (csv) => {
    csv.map(d => {
        for (let c in d) {
            d[c] = parseFloat(d[c])
        }
    })
    return csv
}

/**
 * Applies a better projection to the montage sensors.
 *
 * @param {Array} sensors - The sensors to apply the better projection to.
 * @returns {Array} - The sensors with the better projection applied.
 *
 * @example
 * const sensors = [{ x: '1', y: '2', z: '3' }, { x: '4', y: '5', z: '6' }];
 * const betterSensors = betterMontageSensors(sensors);
 * console.log(betterSensors); // [{ x: 1, y: 3, z: 2, color: '#000000' }, { x: 4, y: 6, z: 5, color: '#111111' }]
 */
let betterMontageSensors = (sensors) => {
    // ! The x-, z-, y- projection is correct since the two coordinates are aligned in this way
    sensors.map((s, i) =>
        Object.assign(s, {
            x: parseFloat(s.x),
            y: parseFloat(s.z),
            z: parseFloat(s.y),
            color: colorMap[i % 10]
        })
    );

    sensors.map((s) => {
        Object.assign(s, xyz2polar(s));
    });

    return sensors
}
