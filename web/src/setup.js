import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm";
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

let _experimentName = document.getElementById("_experimentName").value,
    _subjectID = document.getElementById("_subjectID").value,
    zccEventTogglesContainer = document.getElementById("zcc-eventTogglesContainer"),
    zccEventPlotContainer = document.getElementById("zcc-eventsPlotContainer")


let eventsFullRecord, eventToggles

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
    eventsFullRecord = eventsCsv
    console.log('Events full record:', eventsFullRecord)
    createEventToggles()
});

let createEventToggles = () => {
    let toggles = {}

    eventsFullRecord.map(({ label }) => {
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

    zccEventTogglesContainer.innerHTML = ''
    d3.select(zccEventTogglesContainer).append('div').attr('class', 'grid space-y-2').selectAll('label').data(eventToggles).enter().append('label').html(d => `
<label class="max-w-xs flex justify-between p-3 w-full bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400">
<div>
<span class="text-sm text-gray-500 ms-3 dark:text-gray-400">${d.label}</span>
<span class="text-sm text-gray-500 ms-3 dark:text-gray-400">${d.count}</span>
</div>
<input checked=true type="checkbox" class="shrink-0 mt-0.5 border-gray-200 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-blue-500 dark:checked:border-blue-500 dark:focus:ring-offset-gray-800">
</label>
    `).on('change', (e, d) => {
        d.active = e.target.checked
        eventTogglesOnChange()
    })

    eventTogglesOnChange()

    return eventToggles
}

let eventTogglesOnChange = () => {
    console.log(eventToggles)

    let container = zccEventPlotContainer,
        plt;

    let extent = d3.extent(eventsFullRecord, d => d.seconds),
        events = eventsFullRecord.filter(d => eventToggles.find(e => e.label === d.label && e.active));
    console.log(events)

    plt = Plot.plot({
        x: { nice: true, domain: extent },
        y: { nice: true },
        grid: true,
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
