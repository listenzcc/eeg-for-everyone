console.log("profile.js starts. >>>>>>>>");

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm'

let _experimentName = document.getElementById('_experimentName').value

d3.csv('/zcc/experiments.csv').then(raw => {
    console.log(raw)

    let div = d3.select('#zcc-experiment-container')
    div.selectAll('div').data([]).exit().remove()

    div.selectAll('div').data(raw).enter().append('div').html(d => `
<div class="relative lg:pl-8">
    <svg aria-hidden="true" viewBox="0 0 6 6"
        class="absolute left-[-0.5px] top-[0.5625rem] hidden h-1.5 w-1.5 overflow-visible lg:block fill-blue-600 stroke-blue-600">
        <path d="M3 0L6 3L3 6L0 3Z" stroke-width="2" stroke-linejoin="round"></path>
    </svg>
    <div class="relative">
        <div class="font-mono text-sm text-blue-600">
            <button class="ui-not-focus-visible:outline-none" role="tab" type="button"
                aria-selected="true" tabindex="0" data-headlessui-state="selected"
                onclick="location.href='/template/profile.html?experimentName=${d.name}'"
                >

                <span class="inset-0">${d.detail}</span>

                <div class="text-left mt-1.5 block text-2xl font-semibold tracking-tight text-blue-900">
                    <span>${d.name}</span>
                </div>
            </button>
        </div>
    </div>
</div>
    `)

})

d3.csv(`/zcc/data_files.csv?experimentName=${_experimentName}`).then(raw => {
    console.log(raw)

    let div = d3.select('#zcc-data-container')
    div.selectAll('div').data([]).exit().remove()

    div.selectAll('div').data(raw).enter().append('div').html(d => `
<div onclick="location.href='/template/analysis.html?subjectID=${d.subjectID}&experimentName=${d.experiment}'">
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

console.log("<<<<<<<<<< profile.js starts.");