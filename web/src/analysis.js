import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";


let _experimentName = document.getElementById("_experimentName").value,
    _subjectID = document.getElementById("_subjectID").value

let colorMap = d3.schemeCategory10, eventSelector, epochSelector, eventsGraph, eventsData

let getEEGEpochsEventsCsv = () => {
    d3.csv(`/zcc/getEEGEpochsEvents.csv?experimentName=${_experimentName}&subjectID=${_subjectID}`).then((data) => {
        eventsData = data;

        let events = [...new Set(data.map(d => d.Event))],
            container = document.getElementById('zcc-eventSelectContainer');
        container.innerHTML = '';
        container = d3.select(container);

        eventSelector = container.append('div').append('label').text('Choose event:').append('select').on('change', (e) => {
            onSelectEvent(e.target.value)
        })

        eventSelector.selectAll('option').data(events).enter().append('option').attr('value', d => d).text(d => d)

        epochSelector = container.append('div').append('label').text('Choose epoch:').append('select').on('change', (e) => {
            onSelectEpoch(e.target.value)
        })

        eventsGraph = container.append('div')

        onSelectEvent(eventsData[0].Event)
        onSelectEpoch(eventsData[0].Timestamp)

    }).catch((err) => {
        console.log(err)
        setTimeout(getEEGEpochsEventsCsv, 1000)
    })
}

let onSelectEvent = (event) => {
    console.log('On select event:', event)

    let data = eventsData.filter(d => d.Event === event)

    epochSelector.selectAll('option').data([]).exit().remove()
    epochSelector.selectAll('option').data(data).enter().append('option').attr('value', d => d.Timestamp).text(d => d.Timestamp)
    console.log('Updated epochSelector', epochSelector)

    onSelectEpoch(data[0].Timestamp)

    d3.csv(`/zcc/getEEGEvokedData.csv?experimentName=${_experimentName}&subjectID=${_subjectID}&event=${event}`).then(csv => {
        csv.map(d => {
            for (let k in d) {
                d[k] = parseFloat(d[k])
            }
        })
        console.log(csv)
        let plt,
            chNames = csv.columns.filter(d => d.length > 0 && d !== '_times'),
            lines = [],
            container = document.getElementById('zcc-evokedWaveContainer');

        lines = chNames.map(ch => Plot.line(csv, { x: d => d._times - 0.0, y: d => d[ch] - 0.0, stroke: d => ch, tip: true }))

        plt = Plot.plot({
            x: { nice: true },
            y: { nice: true },
            title: 'Event: ' + event,
            color: { legend: true },
            grid: true,
            height: 400,
            marks: lines
        })

        container.innerHTML = '<div></div>'
        container.replaceChild(plt, container.firstChild)

        plotGeometry(csv)
    })

    let plotGeometry = (croppedData, enlargeSensorName = '', secs = 0.3) => {
        let values = croppedData.find(d => d._times >= secs)
        d3.csv('/asset/montage/sensor.csv').then(sensors => {
            console.log(sensors, croppedData)
            let plt,
                d2x = (d) => d.theta * Math.cos(d.phi),
                d2y = (d) => d.theta * Math.sin(d.phi),
                chNames = croppedData.columns.filter(d => d.length > 0 && d !== '_times'),
                goodSensors = chNames.map(ch => sensors.find(d => d.name === ch)).filter(d => d),
                badSensors = chNames.filter(ch => !sensors.find(d => d.name === ch)),
                container = document.getElementById('zcc-evokedGeometryContainer');

            goodSensors.map((d, i) =>
                Object.assign(d, {
                    x: parseFloat(d.x),
                    y: parseFloat(d.z),
                    z: parseFloat(d.y),
                    value: values[d.name],
                    color: colorMap[i % 10]
                })
            );

            goodSensors.map((sensor) => {
                Object.assign(sensor, xyz2polar(sensor));
            });

            console.log('The goodSensors (has pos in montage):', goodSensors)
            console.log('The badSensors (not has pos in montage):', badSensors)

            plt = Plot.plot({
                x: { nice: true },
                y: { nice: true },
                width: 600,
                grid: true,
                color: { nice: true, legend: true, scheme: "RdBu", reverse: true, domain: [-1e-5, 1e-5] },
                aspectRatio: 1.0,
                marks: [
                    Plot.contour(goodSensors, { x: d2x, y: d2y, fill: 'value', blur: 2, interval: 1e-6, opacity: 0.5 }),
                    Plot.dot(goodSensors, {
                        x: d2x,
                        y: d2y,
                        fill: "color",
                        r: d => enlargeSensorName === d.name ? 3 : 1,
                        tip: true
                    }),
                    Plot.text(goodSensors, {
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

            container.innerHTML = '<div></div>'
            container.replaceChild(plt, container.firstChild)
        })
    }
}

let onSelectEpoch = (timestamp) => {
    console.log('On select epoch (timestamp):', timestamp)
    let plt,
        container = eventsGraph._groups[0][0],
        extent = d3.extent(eventsData, d => d.Timestamp - 0);

    console.log(eventsData)

    plt = Plot.plot({
        x: { nice: true, domain: extent },
        y: { nice: true },
        color: { legend: true },
        grid: true,
        height: 400,
        marks: [
            Plot.dot(eventsData, {
                x: d => d.Timestamp - 0,
                fy: d => d.Event - 0,
                r: 8,
                fill: d => d.Event
            }),
            Plot.dot(eventsData.filter(d => d.Timestamp === timestamp), {
                x: d => d.Timestamp - 0,
                fy: d => d.Event - 0,
                r: 10,
                stroke: 'red'
            }),
            Plot.text(eventsData, {
                x: d => d.Timestamp - 0,
                fy: d => d.Event - 0,
                text: 'Event',
                fill: 'white'
            })
        ]
    })

    container.innerHTML = '<div></div>'
    container.replaceChild(plt, container.firstChild)
}

getEEGEpochsEventsCsv()


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
