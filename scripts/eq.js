function dB(x) {
    return 20 * Math.log10(x)
}

class ParametricEQ {

    constructor(audioContext) {
        this.audioContext = audioContext
        this.biquads = []
        this.input = audioContext.createGain()
        this.output = audioContext.createGain()
        this.input.connect(this.output)
        this.input.gain.value = 1.0
        this.output.gain.value = 1.0
    }

    addBiquad() {
        var bq = this.audioContext.createBiquadFilter()
        if (0 == this.numBiquads) {
            this.input.disconnect(this.output)
            this.input.connect(bq)
        } else {
            this.biquads[this.numBiquads - 1].disconnect(this.output)
        }
        this.biquads.push(bq)
        bq.connect(this.output)
        if (1 < this.numBiquads) {
            this.biquads[this.numBiquads - 2].connect(bq)
        }
        return bq
    }

    removeBiquad(index) {
        if ((index >= 0) && (index < this.numBiquads) && (this.numBiquads > 0)) {
            // disconnect nodes
            this.input.disconnect(this.biquads[0])
            this.biquads[this.numBiquads - 1].disconnect(this.output)
            if (this.numBiquads > 1) {
                for (let i = 0; i < this.numBiquads - 1; i++) {
                    this.biquads[i].disconnect(this.biquads[i + 1])
                }
            }

            // remove biquad
            this.biquads.splice(index, 1)

            // reconnect nodes
            if (this.numBiquads > 0) {
                if (this.numBiquads > 1) {
                    for (let i = 0; i < this.numBiquads - 1; i++) {
                        this.biquads[i].connect(this.biquads[i + 1])
                    }
                }
                this.input.connect(this.biquads[0])
                this.biquads[this.numBiquads - 1].connect(this.output)
            } else {
                this.input.connect(this.output)
            }
        }
    }

    get numBiquads() {
        return this.biquads.length
    }

    getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput) {
        var nPoints = frequencyArray.length
        var tmpMag = new Float32Array(nPoints)
        var tmpPhase = new Float32Array(nPoints)
        phaseResponseOutput.fill(0)
        magResponseOutput.fill(this.input.gain.value * this.output.gain.value)

        for (let n = 0; n < this.numBiquads; n++) {
            this.biquads[n].getFrequencyResponse(frequencyArray, tmpMag, tmpPhase)
            for (let i = 0; i < nPoints; i++) {
                magResponseOutput[i] *= tmpMag[i]
                phaseResponseOutput[i] += tmpPhase[i]
            }
        }
    }

}


class EqGraph {

    #numPoints; // number of frequency points
    #fmin = 10;
    #fmax = 20000;

    constructor(magCtx, phsCtx) {

        this.#numPoints = 256
        this.frequency = new Float32Array(this.#numPoints)
        this.updateFrequencies()

        this.magnitudes = []
        this.phases = []

        this.overallMag = new Float32Array(this.#numPoints)
        this.overallPhase = new Float32Array(this.#numPoints)

        var xconfig = {
            type: 'logarithmic',
            min: this.#fmin,
            max: this.#fmax,
            title: {
                text: 'Frequency / Hz',
                display: true,
            },
            ticks: {
                callback: function(value, index, ticks) {
                    let log = Math.log10(value)
                    if (Math.round(log) == log) {
                        return value
                    } else {
                        return ''
                    }
                },
            },
        }

        Chart.defaults.elements.point = {
            pointStyle: false
        }

        this.magPlot = new Chart(magCtx, {
            type: 'line',
            data: {
                datasets: [{data: this.overallMag.map(dB), label: 'Overall'}],
                labels: this.frequency,
            },
            options: {
                scales: {
                    x: xconfig,
                    y: {
                        title: {
                            text: 'Magnitude / dB',
                            display: true,
                        },
                    }
                }
            }
        })

        this.phasePlot = new Chart(phsCtx, {
            type: 'line',
            data: {
                datasets: [{data: this.overallPhase, label: 'Overall'}],
                labels: this.frequency,
            },
            options: {
                scales: {
                    x: xconfig,
                    y: {
                        title: {
                            text: 'Phase / °',
                            display: true,
                        }
                    }
                }
            }
        })
    }

    updateFrequencies() {
        var logMin = Math.log10(this.#fmin)
        var logMax = Math.log10(this.#fmax)
        var step = (logMax - logMin) / (this.#numPoints - 1)
        for (let n = 0; n < this.#numPoints; n++) {
            this.frequency[n] = 10 ** (logMin + (n * step))
        }
    }

    get numPoints() {
        return this.#numPoints
    }

    get numPlots() {
        return this.magnitudes.length
    }

    addResponse(mag, phase) {
        var magCopy = new Float32Array(mag)
        var phaseCopy = new Float32Array(phase)
        this.magnitudes.push(magCopy)
        this.phases.push(phaseCopy)
        this.magPlot.data.datasets.push({data: magCopy.map(dB)})
        this.phasePlot.data.datasets.push({data: phaseCopy})
        this.redraw()
    }

    removeResponse(index) {
        if ((index > 0) && (index < this.numPlots)) {
            this.magnitudes.splice(index, 1)
            this.phases.splice(index, 1)
            this.magPlot.data.datasets.splice(index + 1, 1)
            this.phasePlot.data.datasets.splice(index + 1, 1)
            this.redraw()
        }

    }

    recalculateOverall() {
        this.overallMag.fill(1)
        this.overallPhase.fill(0)
        for (let i = 0; i < this.numPlots; i++) {
            for (let n = 0; n < this.numPoints; n++) {
                this.overallMag[n] *= this.magnitudes[i][n]
                this.overallPhase[n] += this.phases[i][n]
            }
        }
    }

    redraw() {
        this.recalculateOverall()
        for (let i = 0; i < this.numPlots; i++) {
            this.magPlot.data.datasets[i+1] = {data: this.magnitudes[i].map(dB)}
            this.phasePlot.data.datasets[i+1] = {data: this.phases[i]}
            this.magPlot.data.datasets[i+1]['label'] = i+1
            this.phasePlot.data.datasets[i+1]['label'] = i+1
        }
        let i = this.numPlots
        this.magPlot.data.datasets[0] = {data: this.overallMag.map(dB)}
        this.phasePlot.data.datasets[0] = {data: this.overallPhase}
        this.magPlot.data.datasets[0]['label'] = "Overall"
        this.phasePlot.data.datasets[0]['label'] = "Overall"

        this.magPlot.update()
        this.phasePlot.update()
    }

}
