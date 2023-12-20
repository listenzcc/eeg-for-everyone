import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm'

let _experimentName = document.getElementById('_experimentName').value

// Update the list of experiment names
d3.csv('/zcc/getExperiments.csv').then(raw => {
    // Setup onclick href for every elements
    // By design, it refreshes the list of experiment names
    let href;
    raw.map(d => {
        href = `/template/profile.html?experimentName=${d.name}`
        Object.assign(d, { href })
    })
    console.log('Got experiments:', raw)

})

// Update the file list of the experiment
d3.csv(`/zcc/getDataFiles.csv?experimentName=${_experimentName}`).then(raw => {
    // Setup onclick href for every elements
    // By design, it jumps into the analysis page for the clicked data
    let href;
    raw.map(d => {
        href = `/template/raw.html?subjectID=${d.subjectID}&experimentName=${d.experiment}`
        Object.assign(d, { href })
    })
    console.log('Got data files:', _experimentName, '|', raw)

    // Clear existing doms
    let div = d3.select('#zcc-data-container')
    div.selectAll('div').data([]).exit().remove()

    // Insert new doms for elements
    div.selectAll('div').data(raw).enter().append('div').html(d => `
<div onclick="location.href='${d.href}'">
    <div class="group relative h-[17.5rem] transform overflow-hidden rounded-4xl">
        <div
            class="absolute bottom-6 left-0 right-4 top-0 rounded-4xl border transition duration-300 group-hover:scale-95 xl:right-6 border-blue-300">
        </div>

        <div class="absolute inset-0 bg-indigo-50" style="clip-path:url(#:R1aqlla:-0)">
            <img alt="" fetchpriority="high" width="1120" height="560" decoding="async"
                data-nimg="1"
                class="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-110"
                style="color:transparent"
                sizes="(min-width: 1280px) 17.5rem, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                src="/asset/img/EEG.png">
        </div>
    </div>

    <div>
        <h3 class="mt-8 font-display text-xl font-bold tracking-tight text-slate-900">
            <span>${d.experiment}</span>
        </h3>
        <p class="mt-1 text-base tracking-tight text-slate-500">
            <span>${d.path}</span>
        </p>
    </div>
<div>
`)

})