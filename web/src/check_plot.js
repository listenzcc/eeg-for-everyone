console.log("check_plot.js starts. >>>>>>>>");

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
import * as simplexNoise from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/+esm'

{
    console.log(Plot)

    const container = document.getElementById('d3plot-canvas-container') || document.body.appendChild(document.createElement('div')),
        n = 500,
        scaleX = d3.scaleLinear().domain([-1, 1]).range([-100, 100]),
        scaleY = d3.scaleLinear().domain([-1, 1]).range([-100, 100]),
        rnd = d3.randomUniform(),
        { createNoise3D, createNoise2D } = simplexNoise,
        noise2D = createNoise2D(),
        noise3D = createNoise3D(),
        data = [];

    const getContainerSize = () => {
        const w = container.clientWidth,
            h = container.clientHeight; //w * 3 / 4;
        return { w, h }
    }

    let x, y, v, t = 67567.67565, k = 1e4;
    for (let i = 1; i < n + 1; i++) {
        x = noise3D(t, 0.3, i)
        y = noise3D(t, 0.7, i)
        v = noise3D(t, x, y)
        data.push({ i, x: scaleX(x), y: scaleY(y), value: v })
    }

    console.log(data)
    console.log(noise3D)

    const refresh = () => {
        const { w, h } = getContainerSize(),
            t = (performance.now() / 1000 / 100) % 100000;


        data.map(d => {
            x = noise3D(t, 0.3, d.i)
            y = noise3D(t, 0.5, d.i)
            v = noise3D(t, x, y)
            Object.assign(d, { x: scaleX(x), y: scaleY(y), value: v })
        })

        const plt = Plot.plot({
            width: w,
            height: h - 40,
            grid: true,
            x: { nice: true },
            y: { nice: true },
            color: { nice: true, legend: true },
            marks: [
                Plot.voronoi(data, { x: 'x', y: 'y', fill: 'value', stroke: 'gray', opacity: 0.5 }),
                Plot.dot(data, { tip: true, x: 'x', y: 'y', fill: 'value', stroke: 'white' })
            ]
        })

        container.innerHTML = ''
        container.append(plt)

    }

    // const animate = () => {
    //     requestAnimationFrame(animate)
    //     refresh();
    // }
    // animate()

    window.addEventListener("resize", refresh);
    refresh();
}

console.log("<<<<<<<< check_plot.js finishes.");