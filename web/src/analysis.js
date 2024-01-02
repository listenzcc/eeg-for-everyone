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
    evokedDataCorrelationGraph,

    // Dynamic data
    eventsData,
    montageSensors,
    evokedData,
    evokedComplexData,
    evokedDataCorrelationMatrix,
    chNames,

    // Data type of timeCourse or freqDomain
    dataTypeOptions = [
        { type: 'timeCourse', axis: '_times', unit: 'Secs', noun: 'time', domain: [-20, 20], scaleType: 'linear', contourInterval: 5 }, // timeCourse
        { type: 'freqDomain', axis: '_freq', unit: 'Hz', noun: 'freq', domain: undefined, scaleType: 'log', contourInterval: undefined }, // PSD
    ],
    dataType = Object.assign({}, dataTypeOptions[0]);

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

            document.getElementById('zcc-singleSensorContainer').style.display = 'none'
            document.getElementById('zcc-startSingleSensorAnalysisContainer').style.display = ''
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
    let events = [...new Set(eventsData.map(d => d.label))].sort((a, b) => a - b),
        container = document.getElementById('zcc-eventSelectContainer');

    // Refresh container
    container.innerHTML = '';
    container = d3.select(container);

    {

        let controllerContainer = container.append('div').html(`
<div class="flex w-full px-4 py-4">
</div>
        `).select('div')

        // Append event label selector
        {
            eventLabelSelector = controllerContainer.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose event
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select')

            eventLabelSelector.on('change', (e) => {
                onSelectEventLabel()
            })

            eventLabelSelector.selectAll('option').data(events).enter().append('option').attr('value', d => d).text(d => d)
        }


        // Append time stamp selector
        {
            epochsTimeStampSelector = controllerContainer.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose epoch timeStamp
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select')

            epochsTimeStampSelector.on('change', (e) => {
                onSelectEpochTimeStamp()
            })
            // ! Will be appended children by onSelectEventLabel(x)
        }

        // Append data type selector
        {

            let select = controllerContainer.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose DataType
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select').on('change', (e) => {
                let d = dataTypeOptions.find(d => d.type === e.target.value)
                Object.assign(dataType, d)
                // console.log(dataType, d, e.target.value, dataTypeOptions)
                onSelectEventLabel()
            })

            select.selectAll('option').data(dataTypeOptions).enter().append('option').attr('value', d => d.type).text(d => d.type)
        }
    }

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
    chNames = evokedData.columns.filter(d => d.length > 0 && d !== dataType.axis)

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

    computeEvokedDataCorrelation();

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

    // Add evoked data displaying controller
    {
        let div = container.append('div').html(`
<div class="max-w-xs flex justify-between p-3 w-full items-end">
</div>
        `).select('div')

        // Append toggle for hiding all the sensors
        div.append('div').html(d => `
<div class="px-4">
    <button type="button" class="px-4 py-2 w-48 font-semibold text-sm bg-white border-blue-900 border text-blue-900 rounded-lg shadow-lg">
        Hide all sensors
    </button>
</div>
    `).on('click', e => {
            sensorNamesSelector.selectAll('label').select('label').select('input').property('checked', d => false)
            redrawEvokedGraphics()
        })

        // Append toggle for showing all the sensors
        div.append('div').html(d => `
<div class="px-4">
    <button type="button" class="px-4 py-2 w-48 font-semibold text-sm bg-blue-900 text-white rounded-lg shadow-lg">
        Show all sensors
    </button>
</div>
    `).on('click', e => {
            sensorNamesSelector.selectAll('label').select('label').select('input').property('checked', d => d.isGoodSensor)
            redrawEvokedGraphics()
        })

        // Append toggle for views
        div.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Toggle views
    </label>
    <select class="relative w-64 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select').on('change', (e) => {
            let { value } = e.target;

            sensorNamesSelector.node().style.display = value.includes('Sensor') ? '' : 'none'
            let nodes = evokedDataGraph.selectAll('figure').nodes()
            nodes[0].style.display = value.includes('Curve') ? '' : 'none'
            nodes[1].style.display = value.includes('Rect') ? '' : 'none'

        }).selectAll('option').data([
            'Sensor | Curve | Rect',
            'Sensor | Curve',
            'Sensor | Rect',
            'Curve | Rect',
            'Curve',
            'Rect',
            'Sensor'
        ]).enter().append('option').attr('value', d => d).text(d => d)

    }

    // Append evoked data graph
    evokedDataGraph = container.append('div')

    {
        let div = container.append('div').html(`
<div class="max-w-xs flex justify-between p-3 w-full items-end">
</div>
        `).select('div')

        // Append secs selector
        // Fine selector in selection menu style
        secsSelector = div.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose ${dataType.noun} (Fine)
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select').on('change', (e) => {
            redrawEvokedGraphics()
        })
        secsSelector.selectAll('option').data(evokedData.slice(0, evokedData.length - 1)).enter().append('option').attr('value', d => d[dataType.axis]).text(d => d[dataType.axis])

        // Course selector in sliding style
        div.append('div').html(`
<div class="px-4 w-48">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose ${dataType.noun} (Corse)
    </label>
    <input class="slide py-1.5" type="range" min="0" max="${evokedData.length - 2}" value="1" step="1" >
</div>
        `).select('input').on('change', (e) => {
            secsSelector.node().value = evokedData[parseInt(e.target.value)][dataType.axis]
            redrawEvokedGraphics()
        })
    }

    // Append evoked geometry graph
    {
        let container = document.getElementById('zcc-evokedGeometryContainer');
        container.innerHTML = ''
        container = d3.select(container)
        evokedGeometryGraph = container.append('div')
    }

    // Append evoked data correlation graph
    {
        let container = document.getElementById('zcc-evokedDataCorrelationContainer');
        container.innerHTML = ''
        container = d3.select(container)
        evokedDataCorrelationGraph = container.append('div')
    }

    // Every thing is fine
    redrawEvokedGraphics()

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
        goodSensors = chNames.map(({ name }) => montageSensors.find(d => d.name === name)).filter(d => d),
        data = evokedData.find(e => e[dataType.axis] > secs);

    goodSensors.map(d => Object.assign(d, { value: data[d.name] }))

    let plotEvokedDataGraph = () => {
        let pltCurve,
            lines,
            pltCell,
            cellData = [],
            container = evokedDataGraph.node(),
            times = evokedData.map(d => dataType.typeName === 'timeCourse' ? d[dataType.axis] : parseInt(d[dataType.axis])),
            checks = sensorNamesSelector.selectAll('label').select('label').select('input').nodes().map(d => d.checked),
            displayChNames = chNames.filter((d, i) => checks[i])

        console.log('Display chNames:', displayChNames)
        container.innerHTML = ''

        {
            lines = displayChNames.map(({ name, color }) => Plot.line(evokedData, {
                x: d => d[dataType.axis],
                y: d => d[name] * 1e6,
                stroke: d => color,
            }))

            pltCurve = Plot.plot({
                x: { nice: true, domain: d3.extent(times), label: dataType.unit },
                y: { nice: true, nice: true, label: "μV", type: dataType.scaleType },
                title: 'Curve view | Event label: ' + evokedData.eventLabel,
                grid: true,
                height: 300,
                width: container.clientWidth,
                marks: lines.concat([
                    Plot.ruleX([secs]),
                    Plot.ruleY([0]),
                    Plot.text(goodSensors.filter(d => displayChNames.findIndex(e => e.name === d.name) > -1), { x: secs, y: d => d.value * 1e6, text: 'name', fill: 'color', dx: 20, fontSize: 20 }),
                    Plot.text(goodSensors.filter(d => displayChNames.findIndex(e => e.name === d.name) > -1), { x: evokedData[evokedData.length - 1][dataType.axis], y: d => d.value * 1e6, text: 'name', fill: 'color', dx: 10, dy: 20, fontSize: 10 }),
                ])
            })

            container.appendChild(pltCurve)
        }

        {
            chNames.map(({ name }) => evokedData.map(d => {
                cellData.push({ name, value: d[name] * 1e6, secs: d[dataType.axis], isSelected: displayChNames.findIndex(e => e.name === name) > -1 })
            }))

            pltCell = Plot.plot({
                color: {
                    legend: true,
                    scheme: 'RdBu',
                    reverse: true,
                    label: 'μV',
                    domain: dataType.domain,
                    type: dataType.scaleType
                },
                x: {
                    nice: true,
                    label: dataType.unit,
                    ticks: dataType.type === 'timeCourse' ? [times[0], 0, times[times.length - 1]] : [times[0], times[times.length - 1]]
                },
                y: { nice: true, ticks: displayChNames.map(d => d.name) },
                title: 'Rect view | Event label: ' + evokedData.eventLabel,
                height: 300,
                width: container.clientWidth,
                marks: [
                    Plot.cell(cellData, { x: 'secs', y: 'name', fill: d => d.isSelected ? d.value : undefined, tip: true }),
                    Plot.ruleX([secs]),
                ]
            })

            container.appendChild(pltCell)
        }
    }

    let plotEvokedGeometryGraph = () => {
        let plt,
            aspectRatio,
            d2x = (d) => d.theta * Math.cos(d.phi),
            d2y = (d) => d.theta * Math.sin(d.phi),
            container = evokedGeometryGraph.node();

        {
            let xRange = d3.extent(goodSensors, d2x),
                yRange = d3.extent(goodSensors, d2y)

            aspectRatio = (yRange[1] - yRange[0]) / (xRange[1] - xRange[0])
        }

        plt = Plot.plot({
            x: { nice: true },
            y: { nice: true },
            title: dataType.unit + ": " + secs,
            width: container.clientWidth,
            aspectRatio: aspectRatio || 1.0,
            color: {
                nice: true, legend: true, scheme: "RdBu", reverse: true, range: [0, 1], label: 'μV',
                domain: dataType.domain,
                type: dataType.scaleType
            },
            marks: [
                Plot.contour(goodSensors, {
                    x: d2x,
                    y: d2y,
                    fill: d => d.value * 1e6,
                    stroke: '#33333333',
                    blur: 10,
                    interval: dataType.contourInterval,
                    opacity: 0.5,
                    tip: true
                }),
                Plot.dot(goodSensors, {
                    x: d2x,
                    y: d2y,
                    fill: "color",
                    r: 2,
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

    let plotEvokedDataCorrelationGraph = () => {
        let plt,
            container = evokedDataCorrelationGraph.node(),
            checks = sensorNamesSelector.selectAll('label').select('label').select('input').nodes().map(d => d.checked),
            displayChNames = chNames.filter((d, i) => checks[i]),
            dataMatrix = evokedDataCorrelationMatrix.filter(d => displayChNames.findIndex(e => e.name === d.n1) > -1)

        plt = Plot.plot({
            x: { nice: true },
            y: { nice: true, reverse: true, axis: 'right' },
            title: 'Correlation',
            width: container.clientWidth,
            height: container.clientWidth,
            color: { nice: true, legend: true, scheme: "PiYG" },
            aspectRatio: 1.0,
            marks: [
                Plot.cell(dataMatrix, { x: 'n1', y: 'n2', fill: d => d.n1 === d.n2 ? undefined : d.corr, tip: true })
            ]

        })

        container.innerHTML = ''
        container.appendChild(plt)
    }

    plotEvokedDataGraph()
    plotEvokedGeometryGraph()
    plotEvokedDataCorrelationGraph()
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

    d3.csv(`/zcc/getEEGEvokedData.csv?experimentName=${_experimentName}&subjectID=${_subjectID}&event=${eventLabel}&dataType=${dataType.type}`).then(csv => {
        if (dataType.type === 'freqDomain') {
            evokedComplexData = csvParseComplex(csv)
            console.log('Fetched evoked complex data:', evokedComplexData)
        }
        evokedData = csvParseFloat(csv)
        evokedData.map(d => d[dataType.axis] = parseFloat(d[dataType.axis].toFixed(2)))
        evokedData.eventLabel = eventLabel
        console.log('Fetched evoked data:', evokedData)

        onloadEvokedData()
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
        width: container.clientWidth,
        color: { legend: true, scale: 'ordinal', columns: 7 },
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
    let max = -1e6,
        min = 1e6;

    if (dataType.type === 'freqDomain') {
        let re, im, split

        csv.map(d => {
            for (let c in d) {
                if (c === "" || c === "_freq") { d[c] = parseFloat(d[c]); continue }
                split = d[c].split(',')
                re = parseFloat(split[0])
                im = parseFloat(split[1])
                d[c] = Math.sqrt(re * re + im * im)
                max = d[c] > max ? d[c] : max
                min = d[c] < min ? d[c] : min
            }
        })

        Object.assign(csv, { max, min })
        return csv
    }

    csv.map(d => {
        for (let c in d) {
            d[c] = parseFloat(d[c])
            max = d[c] > max ? d[c] : max
            min = d[c] < min ? d[c] : min
        }
    })

    Object.assign(csv, { max, min })

    return csv
}

let csvParseComplex = (csv) => {
    let re, im, split;
    return csv.map(d => {
        let row = {}
        for (let c in d) {
            if (c === "" || c === "_freq") {
                row[c] = parseFloat(d[c]);
                continue
            }
            split = d[c].split(',')
            re = parseFloat(split[0])
            im = parseFloat(split[1])
            row[c] = { re, im }
        }
        return row
    })
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

    sensors.map((s) => Object.assign(s, {
        color: d3.hsl(s.phi / Math.PI / 2 * 360, s.theta / Math.PI, 0.5).hex()
    }))

    return sensors
}

/**
 * Computes the correlation matrix for the evoked data.
 *
 * @returns {void}
 *
 * @example
 * computeCorrelation();
 */
let computeEvokedDataCorrelation = () => {
    let s1,
        s2,
        re1,
        re2,
        im1,
        im2,
        r1,
        r2,
        buffer,
        mean,
        std,
        nSubOne = evokedData.length - 1,
        goodSensors = chNames.map(({ name }) => montageSensors.find(d => d.name === name)).filter(d => d);

    evokedDataCorrelationMatrix = []

    let normalize = (array) => {
        mean = d3.mean(array)
        std = Math.pow(d3.variance(array), 0.5)
        return array.map(d => (d - mean) / std)
    }

    goodSensors.map(({ name: n1 }) => {
        goodSensors.map(({ name: n2 }) => {
            if (dataType.type === 'freqDomain') {
                re1 = evokedComplexData.map(d => d[n1].re)
                im1 = evokedComplexData.map(d => d[n1].im)
                r1 = evokedComplexData.map(d => Math.sqrt(Math.pow(d[n1].re, 2) + Math.pow(d[n1].im, 2)))
                re2 = evokedComplexData.map(d => d[n2].re)
                im2 = evokedComplexData.map(d => d[n2].im)
                r2 = evokedComplexData.map(d => Math.sqrt(Math.pow(d[n2].re, 2) + Math.pow(d[n2].im, 2)))
                buffer = re1.map((re1, i) => re1 * re2[i] - im1[i] * im2[i])

                evokedDataCorrelationMatrix.push({ n1, n2, corr: d3.sum(buffer) / Math.sqrt(d3.variance(r1) * d3.variance(r2)) / nSubOne })
            } else {
                s1 = normalize(evokedData.map(d => 1e6 * d[n1]))
                s2 = normalize(evokedData.map(d => 1e6 * d[n2]))
                s1 = s1.map((v1, i) => Object.assign({}, { v1, v2: s2[i] }))
                evokedDataCorrelationMatrix.push({ n1, n2, corr: d3.sum(s1, d => d.v1 * d.v2 / nSubOne) })
            }
        })
    })

}