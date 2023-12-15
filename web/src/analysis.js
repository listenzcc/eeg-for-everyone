import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.8.5/+esm'

let _experimentName = document.getElementById('_experimentName').value,
    _subjectID = document.getElementById('_subjectID').value;

d3.json(`/zcc/eegAnalysis.json?experimentName=${_experimentName}&subjectID=${_subjectID}`).then(raw => {
    console.log(raw)
})