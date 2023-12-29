
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";


let _experimentName = document.getElementById("_experimentName").value,
    _subjectID = document.getElementById("_subjectID").value

let colorMap = d3.schemeCategory10,
    // Globals 
    chNames,
    eventsData,
    timesData,
    montageSensors,

    // Single sensor data
    sensorData,
    parsedSensorData,
    selectedSensorName,
    selectedEventLabel,

    // Selectors
    eventLabelSelector,
    epochTimestampSelector,
    epochDomainSelector,
    secsSelector,

    // Containers
    geometryGraphContainer,
    epochsTimeCourseContainer,
    averagedAnalysisContainer
    ;


/**
 * Fetches the epochs events CSV data and initializes the events and sensors.
 *
 * @returns {void}
 *
 * @example
 * startsWithEpochsEventsCsv();
 */
let firstThingFirst = () => {
    // Fetch epochs events
    d3.csv(`/zcc/getEEGEpochsEvents.csv?experimentName=${_experimentName}&subjectID=${_subjectID}`).then((data) => {
        eventsData = csvParseInt(data);
        console.log('Fetched eventsData', eventsData)

        // Fetch montage sensor
        d3.csv('/asset/montage/sensor.csv').then(sensors => {
            montageSensors = betterMontageSensors(sensors)
            console.log('Fetched montageSensors', montageSensors)
        })


        d3.csv(`/zcc/getEEGEvokedData.csv?experimentName=${_experimentName}&subjectID=${_subjectID}&event=${eventsData[0].label}`).then(csv => {
            let evokedData = csvParseFloat(csv)
            chNames = evokedData.columns.filter(d => d.length > 0 && d !== '_times')
            console.log('Fetched chNames', chNames)
            console.log('Checked chNames', checkChNames())

            appendSensorSelector()
        })

    }).catch((err) => {
        // If not ready, wait 1000 ms and try again
        console.log('Waiting for backend computing ...', err)
        setTimeout(firstThingFirst, 1000)
    })
}

firstThingFirst()

let appendSensorSelector = () => {
    let container = document.getElementById('zcc-sensorSelectorContainer')
    container.innerHTML = ''
    container = d3.select(container)

    let div = container.append('div').html(`
<div class="flex w-full px-4 py-4">
</div>
    `).select('div')

    // Append selection & options
    let { goodSensors, badSensorNames } = checkChNames(),
        data = goodSensors.map(d => d.name).sort().concat(badSensorNames.sort());
    selectedSensorName = data[0]

    div.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose sensor
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select').on('change', (e) => {
        selectedSensorName = e.target.value
        plotGeometryGraph()
        onSelectSensor()
    }).selectAll('option').data(data).enter().append('option').attr('value', d => d).text(d => d)


    // Append geometry container
    geometryGraphContainer = div.append('div').html(`
<div class="w-[600px]"></div>
    `)

    plotGeometryGraph()
    onSelectSensor()
}

let onSelectSensor = () => {
    d3.csv(`/zcc/getEEGSingleSensorData.csv/?experimentName=${_experimentName}&subjectID=${_subjectID}&sensorName=${selectedSensorName}`).then(csv => {
        sensorData = csvParseFloat(csv)
        console.log('Fetched the sensorData:', sensorData)
        onLoadSingleSensorData()
    })
}

let onLoadSingleSensorData = () => {
    let sd, secs, v, secsArray;


    secsArray = []
    {
        let data = sensorData[sensorData.length - 1]
        timesData = {}
        for (let j in data) {
            if (j !== "") {
                timesData[j] = data[j]
                secsArray.push(data[j])
            }
        }
    }
    console.log('Fetched the timesData:', timesData)

    parsedSensorData = []

    eventsData.map((ed, i) => {
        sd = sensorData[i];
        for (let j in sd) {
            if (j === "") {
                continue
            }
            v = sd[j]
            secs = timesData[j]
            parsedSensorData.push(Object.assign({ v, secs }, ed))
        }
    })

    console.log('Generated parsedSensorData:', parsedSensorData)

    let container = document.getElementById('zcc-sensorGraphicsContainer')
    container.innerHTML = ''
    container = d3.select(container)

    {
        let events = [...new Set(eventsData.map(d => d.label))].sort((a, b) => a - b),
            controllerContainer = container.append('div').html(`
<div class="flex flex-wrap w-full px-4 py-4">
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
                onChangeEventLabelSelector()
            })

            eventLabelSelector.selectAll('option').data(events).enter().append('option').attr('value', d => d).text(d => d)
        }

        // Append time stamp selector
        {
            epochTimestampSelector = controllerContainer.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose epoch timeStamp
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select').on('change', (e) => {
                plotSensorTimeCourse()
                plotAveragedSensorTimeCourse()
            })
            // ! Will be appended children by onSelectEventLabel(x)
        }

        // Append seconds selector
        {
            secsSelector = controllerContainer.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Choose secs.
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
    `).select('select').on('change', (e) => {
                plotSensorTimeCourse()
                plotAveragedSensorTimeCourse()
            })

            secsSelector.selectAll('option').data(secsArray).enter().append('option').attr('value', d => d).text(d => d)
        }

        // Append domain selector
        {
            epochDomainSelector = controllerContainer.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Signal domain (μV)
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
            `).select('select').on('change', (e) => {
                plotSensorTimeCourse()
                plotAveragedSensorTimeCourse()
            })

            epochDomainSelector.selectAll('option').data([-1, 20, 50, 100, 200]).enter().append('option').attr('value', d => d).text(d => d)
        }

        {
            controllerContainer.append('div').html(`
<div class="px-4">
    <label class="block text-sm font-bold leading-6 text-gray-900">
        Toggle views
    </label>
    <select class="relative w-48 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"></select>
</div>
            `).select('select').on('change', e => {
                let { value } = e.target;
                epochsTimeCourseContainer.node().style.display = value.includes('TimeCourseView') ? '' : 'none'
                averagedAnalysisContainer.node().style.display = value.includes('AveragedView') ? '' : 'none'
            }).selectAll('options').data([
                'TimeCourseView | AveragedView',
                'AveragedView',
            ]).enter().append('option').attr('value', d => d).text(d => d)
        }
    }

    epochsTimeCourseContainer = container.append('div').html(`
<div class='w-full'></div>
    `).select('div')

    averagedAnalysisContainer = container.append('div').html(`
<div class='w-full'></div>
    `).select('div')

    onChangeEventLabelSelector()
}

let onChangeEventLabelSelector = () => {
    selectedEventLabel = parseInt(eventLabelSelector.node().value)

    let data = eventsData.filter(d => d.label === selectedEventLabel)
    console.log('On select event label:', selectedEventLabel, ', Got data:', data)

    epochTimestampSelector.selectAll('option').data([]).exit().remove()
    epochTimestampSelector.selectAll('option').data(data).enter().append('option').attr('value', d => d.timeStamp).text(d => d.timeStamp)
    console.log('Updated epochSelector', epochTimestampSelector)
    plotSensorTimeCourse()
    plotAveragedSensorTimeCourse()
}

let plotAveragedSensorTimeCourse = () => {
    d3.csv(`/zcc/getEEGSingleSensorAveragedData.csv/?experimentName=${_experimentName}&subjectID=${_subjectID}&sensorName=${selectedSensorName}&eventLabel=${selectedEventLabel}`).then(csv => {
        let container = averagedAnalysisContainer.node(),
            seconds = parseFloat(secsSelector.node().value),
            data = [];

        console.log(seconds)

        for (let i in timesData) {
            data.push(Object.assign({ v: parseFloat(csv[0][i]) }, { secs: timesData[i] }))
        }

        container.innerHTML = ''

        {
            let plt,
                secsData = data.filter(d => d.secs === seconds)
                ;

            plt = Plot.plot({
                x: { nice: true },
                y: { nice: true, label: 'μV' },
                color: { legend: true, scheme: 'RdBu' },
                grid: true,
                title: `Averaged time course | Sensor ${selectedSensorName} | Event label ${selectedEventLabel}`,
                width: container.clientWidth,
                marks: [
                    Plot.ruleY([0], { stroke: '#FEDFE1' }),
                    Plot.ruleX([seconds]),
                    Plot.ruleX([0], { stroke: '#FEDFE1' }),
                    Plot.line(data, { x: 'secs', y: value2muVolt }),
                    Plot.dot(data, { x: 'secs', y: value2muVolt, tip: true, fill: value2muVolt, stroke: 'black', strokeWidth: 0.5, r: 3 }),
                    Plot.dot(secsData, { x: 'secs', y: value2muVolt, fill: value2muVolt, r: 16, strokeWidth: 2, stroke: 'white' }),
                    Plot.text(secsData, { x: 'secs', y: value2muVolt, text: d => value2muVolt(d).toFixed(2), fontSize: 12, fontWeight: 'bold' })
                ]
            })

            container.appendChild(plt)
        }

    }).catch(error => {
        console.log(error)
    })
}

let plotSensorTimeCourse = () => {
    let container = epochsTimeCourseContainer.node(),
        eventLabel = parseInt(eventLabelSelector.node().value),
        timestamp = parseInt(epochTimestampSelector.node().value),
        seconds = parseFloat(secsSelector.node().value);

    container.innerHTML = ''

    // Append epochs time course figure
    {
        let plt,
            domain = undefined,
            d = parseFloat(epochDomainSelector.node().value);

        if (d > 0) {
            domain = [-d, d]
        }

        plt = Plot.plot({
            x: { nice: true },
            y: { nice: true, label: 'μV', domain },
            color: { scheme: 'tableau10' },
            title: `Time course | Sensor ${selectedSensorName} | EventLabel ${eventLabel} | TimeStamp ${timestamp}`,
            width: container.clientWidth,
            marks: [
                d > 0 ? Plot.frame() : undefined,
                Plot.line(parsedSensorData,
                    { x: 'secs', y: value2muVolt, fy: 'label', stroke: 'timeStamp', opacity: 0.4 }),
                Plot.ruleX([0]),
                Plot.ruleX([seconds], { stroke: 'red' }),
                Plot.line(parsedSensorData.filter(d => d.label === eventLabel && d.timeStamp === timestamp),
                    { x: 'secs', y: value2muVolt, fy: 'label', stroke: 'black', strokeWidth: 3, tip: true })
            ],
        })
        container.appendChild(plt)
    }

    {
        let plt;

        plt = Plot.plot({
            x: { nice: true },
            y: { nice: true, label: 'μV' },
            color: { scheme: 'RdBu' },
            title: `Time course (2) | Sensor ${selectedSensorName} | EventLabel ${eventLabel} | TimeStamp ${timestamp}`,
            width: container.clientWidth,
            marks: [
                Plot.dot(parsedSensorData,
                    { x: 'secs', y: value2muVolt, fy: 'label', fill: value2muVolt, r: 2 }
                ),
                Plot.ruleX([0]),
                Plot.ruleX([seconds], { stroke: 'red' }),
                Plot.line(parsedSensorData.filter(d => d.label === eventLabel && d.timeStamp === timestamp),
                    { x: 'secs', y: value2muVolt, fy: 'label', stroke: 'black', strokeWidth: 3, tip: true })
            ],
        })
        container.appendChild(plt)
    }

    // Append epochs box figure
    {
        let plt,
            data = parsedSensorData.filter(d => d.secs === seconds),
            selectedEpochData = data.filter(d => d.timeStamp === timestamp)
            ;

        plt = Plot.plot({
            x: { nice: true, label: 'μV' },
            y: { nice: true },
            color: { scheme: 'dark2', legend: true },
            width: container.clientWidth,
            title: `Box view | Sensor ${selectedSensorName} | TimeStamp ${timestamp} | Seconds ${seconds}`,
            marks: [
                Plot.boxX(data,
                    { x: value2muVolt, fy: 'label', fill: 'label', tip: true }
                ),
                Plot.dot(selectedEpochData,
                    { x: value2muVolt, fy: 'label', stroke: 'red', r: 5, tip: true }
                ),
                Plot.text(selectedEpochData,
                    { x: value2muVolt, fy: 'label', fill: 'red', text: value2muVolt, fontSize: 12, fontWeight: 'bold', dy: -12, tip: true }
                )
            ]
        })

        container.appendChild(plt)
    }
}

let plotGeometryGraph = () => {
    let plt,
        { goodSensors, badSensorNames } = checkChNames(),
        d2x = (d) => d.theta * Math.cos(d.phi),
        d2y = (d) => d.theta * Math.sin(d.phi),
        container = geometryGraphContainer.node();

    plt = Plot.plot({
        x: { nice: true },
        y: { nice: true },
        title: 'Geometry',
        width: container.clientWidth,
        aspectRatio: 1.0,
        marks: [
            Plot.ruleX([d2x(goodSensors.find(d => d.name === selectedSensorName))]),
            Plot.ruleY([d2y(goodSensors.find(d => d.name === selectedSensorName))]),
            Plot.dot(goodSensors, {
                x: d2x,
                y: d2y,
                fill: d => d.name === selectedSensorName ? d.color : d.color,
                r: 15,
            }),
            Plot.text(goodSensors, {
                x: d2x,
                y: d2y,
                fill: d => d.name === selectedSensorName ? 'black' : "white",
                text: "name",
                fontSize: d => d.name === selectedSensorName ? 20 : 10,
                fontWeight: "bold",
                dx: 0,
                dy: 0
            }),
        ],
    })

    container.innerHTML = ''
    container.appendChild(plt)
}

let checkChNames = () => {
    // Good sensors are the sensors in both evokedData and montageSensors
    let goodSensors = chNames.map(ch => montageSensors.find(d => d.name === ch)).filter(d => d),
        // Bad sensor names are the names only in evokedData
        badSensorNames = chNames.filter(ch => !montageSensors.find(d => d.name === ch));

    return { goodSensors, badSensorNames }
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

let value2muVolt = (d) => {
    return d.v * 1e6
}