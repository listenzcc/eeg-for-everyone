import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

let _experimentName = document.getElementById("_experimentName").value,
    _subjectID = document.getElementById("_subjectID").value

let setup = {
    events: { status: 'pending', value: undefined, name: 'events' },
    filter: { status: 'pending', value: undefined, name: 'filter' },
    crop: { status: 'pending', value: undefined, name: 'crop' },
}

let checkSetups = () => {
    console.log('Current setup:', setup)

    let passed = true

    for (const name in setup) {
        if (Object.hasOwnProperty.call(setup, name) && setup[name].status !== 'finished') {
            passed = false
            console.warn('Invalid setup:', name)
        }
    }

    if (passed) {
        document.getElementById('zcc-startAnalysisContainer').style = ''
        console.log('All setup finished', setup)
    } else {
        document.getElementById('zcc-startAnalysisContainer').style = 'display: none'
    }
}

/**
 * Sets up the crop configuration based on the provided input elements.
 *
 * @returns {void}
 *
 * @example
 * cropSetup();
 */
let cropSetup = () => {
    let tMinInput = document.getElementById('zcc-tMin'),
        tMaxInput = document.getElementById('zcc-tMax'),
        setupButton = document.getElementById('zcc-cropSetupButton'),
        setupContainer = document.getElementById('zcc-cropSetupContainer');

    let handleSetup = () => {
        d3.select(setupButton).on('click', e => {
            let obj = setup.crop,
                container = d3.select(setupContainer),
                span = d3.select(setupButton).select('span')

            if (obj.status === 'pending') {
                // Switch status pending -> finished
                let tMin = parseFloat(tMinInput.value),
                    tMax = parseFloat(tMaxInput.value);

                if (!(tMin < 0 && tMax > 0)) {
                    // Basic check failed
                    console.error('Invalid input:', { tMin, tMax })
                    return
                }

                let value = { tMin, tMax }

                Object.assign(obj, { value, status: 'finished' })

                // Hide the setting div
                container.attr('style', 'display: none')
                // Update the slogan
                span.text('Crop setup: ' + JSON.stringify(value))
            } else if (obj.status === 'finished') {
                // Switch status finished -> pending
                Object.assign(obj, { value: undefined, status: 'pending' })
                // Hide the setting div
                container.attr('style', '')
                // Update the slogan
                span.text('Crop pending')
            }

            // Summary all the setups
            checkSetups()
        })
    }

    handleSetup()
}

/**
 * Sets up the filter configuration based on the provided input elements.
 *
 * @returns {void}
 *
 * @example
 * filterSetup();
 */
let filterSetup = () => {
    let lFreqInput = document.getElementById('zcc-lFreq'),
        hFreqInput = document.getElementById('zcc-hFreq'),
        downSamplingInput = document.getElementById('zcc-downSampling'),
        setupButton = document.getElementById('zcc-filterSetupButton'),
        setupContainer = document.getElementById('zcc-filterSetupContainer')

    downSamplingInput.value = 10


    let handleSetup = () => {
        d3.select(setupButton).on('click', e => {
            let obj = setup.filter,
                container = d3.select(setupContainer),
                span = d3.select(setupButton).select('span')

            if (obj.status === 'pending') {
                // Switch status pending -> finished
                let hFreq = parseFloat(hFreqInput.value),
                    lFreq = parseFloat(lFreqInput.value),
                    downSampling = parseInt(downSamplingInput.value);

                if (!(lFreq > 0 && hFreq > 0 && hFreq > lFreq && downSampling > 0)) {
                    // Basic check failed
                    console.error('Invalid input:', { lFreq, hFreq, downSampling })
                    return
                }

                let value = { hFreq, lFreq, downSampling }

                Object.assign(obj, { value, status: 'finished' })

                // Hide the setting div
                container.attr('style', 'display: none')
                // Update the slogan
                span.text('Filter setup: ' + JSON.stringify(value))
            } else if (obj.status === 'finished') {
                // Switch status finished -> pending
                Object.assign(obj, { value: undefined, status: 'pending' })
                // Hide the setting div
                container.attr('style', '')
                // Update the slogan
                span.text('Filter pending')
            }

            // Summary all the setups
            checkSetups()
        })
    }

    handleSetup()
}

/**
 * Sets up event toggles and event plot based on the provided CSV data.
 *
 * @returns {Array} - The event toggles.
 *
 * @example
 * eventsSetup();
 */
let eventsSetup = () => {

    let togglesContainer = document.getElementById("zcc-eventTogglesContainer"),
        plotContainer = document.getElementById("zcc-eventsPlotContainer"),
        switchAllToggle = document.getElementById('zcc-eventsSwitchAllToggle'),
        setupButton = document.getElementById("zcc-eventsSetupButton"),
        setupContainer = document.getElementById("zcc-eventsSetupContainer");

    let fullRecord, eventToggles

    d3.csv(
        `/zcc/getEEGRawEvents.csv?experimentName=${_experimentName}&subjectID=${_subjectID}`
    ).then((eventsCsv) => {
        eventsCsv.map((d) =>
            Object.assign(d, {
                seconds: parseFloat(d.seconds),
                samples: parseInt(d.samples),
                label: ("00" + d.label).slice(-3),
            })
        );
        fullRecord = eventsCsv
        console.log('Events full record:', fullRecord)
        createEventToggles()
        handleSetup()
    });

    let handleSetup = () => {
        d3.select(setupButton).on('click', e => {
            let obj = setup.events,
                container = d3.select(setupContainer),
                span = d3.select(setupButton).select('span')

            if (obj.status === 'pending') {
                // Switch status pending -> finished
                // Doing nothing if no events are selected
                let value = eventToggles.filter(d => d.active)
                if (eventToggles.filter(d => d.active).length > 0) {
                    Object.assign(obj, { value, status: 'finished' })
                    // Hide the setting div
                    container.attr('style', 'display: none')
                    // Update the slogan
                    span.text('Events selected: ' + value.map(d => parseInt(d.label)).join(', '))
                } else {
                    console.error('Invalid input:', value)
                }
            } else if (obj.status === 'finished') {
                // Switch status finished -> pending
                Object.assign(obj, { value: undefined, status: 'pending' })
                // Show the setting div
                container.attr('style', '')
                // Update the slogan
                span.text('Events pending')
            }

            // Summary all the setups
            checkSetups()
        })
    }

    let createEventToggles = () => {
        let toggles = {};

        fullRecord.map(({ label }) => {
            let { count, active, num } = toggles[label] || { count: 0, active: true, num: parseInt(label) }
            toggles[label] = { count: count + 1, active, num }
        })

        eventToggles = []
        for (const key in toggles) {
            if (Object.hasOwnProperty.call(toggles, key)) {
                eventToggles.push(Object.assign({ label: key }, toggles[key]))
            }
        }
        eventToggles.sort((a, b) => parseInt(a.label) - parseInt(b.label))

        let colormap = d3.schemeCategory10
        eventToggles.map((d, i) => Object.assign(d, { color: colormap[i % 10] }))

        togglesContainer.innerHTML = ''
        d3.select(togglesContainer).append('div').attr('class', 'grid space-y-2').selectAll('label').data(eventToggles).enter().append('label').html(d => `
<label class="max-w-xs flex justify-between p-3 w-full bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400">
<div>
<span class="text-sm text-gray-500 ms-3 dark:text-gray-400">${d.label}</span>
<span class="text-sm text-gray-500 ms-3 dark:text-gray-400">${d.count}</span>
</div>
<input checked=true type="checkbox" class="zcc-allEventToggles shrink-0 mt-0.5 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800">
</label>
    `).on('change', (e, d) => {
            d.active = e.target.checked
            if (!d.active) {
                switchAllToggle.checked = false
            }
            eventTogglesOnChange()
        })

        d3.select(switchAllToggle).on('change', (e) => {
            eventToggles.map(d => d.active = e.target.checked)
            eventTogglesOnChange()
            let doms = document.getElementsByClassName('zcc-allEventToggles')
            for (let i = 0; i < doms.length; i++) {
                doms[i].checked = e.target.checked
            }
        })

        eventTogglesOnChange()

        return eventToggles
    }

    let eventTogglesOnChange = () => {
        console.log('Current event toggles:', eventToggles)

        let container = plotContainer,
            plt;

        let extent = d3.extent(fullRecord, d => d.seconds),
            events = fullRecord.filter(d => eventToggles.find(e => e.label === d.label && e.active));
        console.log('Selected events:', events)

        plt = Plot.plot({
            x: { nice: true, domain: extent },
            y: { nice: true },
            grid: true,
            height: 400,
            marks: [
                Plot.dot(events, {
                    x: 'seconds',
                    fy: 'label',
                    r: 8,
                    fill: d => eventToggles.find(e => e.label === d.label).color
                }),
                Plot.text(events, {
                    x: 'seconds',
                    fy: 'label',
                    text: d => parseInt(d.label),
                    fill: 'white'
                })
            ]
        })

        container.innerHTML = '<div></div>'
        container.replaceChild(plt, container.firstChild)
    }
}

eventsSetup()
filterSetup()
cropSetup()