console.log("profile.js starts. >>>>>>>>");

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm'

d3.csv('/experiments.csv').then(raw => {
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
            <button class="ui-not-focus-visible:outline-none"
                id="headlessui-tabs-tab-:R6cqlaqlla:" role="tab" type="button"
                aria-selected="true" tabindex="0" data-headlessui-state="selected"
                aria-controls="headlessui-tabs-panel-:R3alaqlla:">
                <span class="absolute inset-0"></span>${d.detail}
            </button>
        </div>
        <div class="mt-1.5 block text-2xl font-semibold tracking-tight text-blue-900">
            <span>${d.name}</span>
        </div>
    </div>
</div>
    `)

})

console.log("<<<<<<<<<< profile.js starts.");