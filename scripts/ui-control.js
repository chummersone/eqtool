function toMel(f) {
    return 2595 * Math.log10(1 + (f / 700))
}

function fromMel(m) {
    return 700 * ((10 ** (m / 2595)) - 1)
}

function doNothing(x) {
    return x
}

function playAudio(context, file) {
    const reader = new FileReader()
    reader.onloadend = (e) => {
        context.audioNode.src = e.target.result

        var promise = context.audioNode.play()
        if (promise) {
            //Older browsers may not return a promise, according to the MDN website
            promise.catch((error) => {
                console.log(error)
                window.alert("Error loading audio file.\n\nTry a different file, or a different browser.")
            });
        }
        context.audioCtx.resume()
    };
    reader.readAsDataURL(file)
}

function addBiquadControl(context) {
    const index = context.eq.numBiquads
    const num = String(Date.now())

    // Add biquad and its response
    var biquad = context.eq.addBiquad()

    // The group of biquad controls
    var group = document.createElement("div")
    group.className = "controlGroup"

    // Add the filter type select box
    var typeControl = document.createElement("div")
    typeControl.className = "control"
    var typeLabel = document.createElement("label")
    typeLabel.htmlFor = "biquadType-" + num
    var typeInput = document.createElement("select")
    typeInput.id = typeLabel.htmlFor
    types = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch"]
    for (var i = 0; i < types.length; i++) {
        var option = document.createElement("option")
        option.value = types[i]
        option.text = types[i]
        typeInput.appendChild(option)
    }
    typeInput.addEventListener("change", function(event) {
        biquad.type = event.target.value
        context.eq.redraw();
    })
    typeInput.value = biquad.type.defaultValue
    typeControl.append(typeLabel, typeInput)

    // Add remaining controls
    function createNumberInput(id, min, max, step, value, convertTo, convertFrom) {
        var control = document.createElement("div")
        control.className = "control"
        var label = document.createElement("label")
        label.htmlFor = id

        var slider = document.createElement("input")
        slider.type = 'range'
        slider.id = id
        slider.min = convertTo(min)
        slider.max = convertTo(max)
        slider.step = (convertTo(max) - convertTo(min)) / ((max - min) / step)
        slider.value = convertTo(value)

        var number = document.createElement("input")
        number.type = 'number'
        number.id = id + '_number'
        number.min = min
        number.max = max
        number.step = step
        number.value = value

        slider.addEventListener("change", function(event) {
            number.value = convertFrom(slider.value)
            biquad.frequency.value = number.value
            context.eq.redraw();
        })
        number.addEventListener("change", function(event) {
            slider.value = convertTo(number.value)
            biquad.frequency.value = number.value
            context.eq.redraw()
        })

        control.append(label, slider, number)
        return control
    }

    var freqControl = createNumberInput("biquadFrequency-" + num, 1, 20000, 1, biquad.frequency.defaultValue, toMel, function(m) { return Math.round(fromMel(m)) })

    var qControl = createNumberInput("biquadQ-" + num, 0, 14, 0.00001, biquad.Q.defaultValue, doNothing, doNothing)

    var gainControl = createNumberInput("biquadGain-" + num, -40, 40, 0.1, biquad.gain.defaultValue, doNothing, doNothing)

    var removeButton = document.createElement("div")
    removeButton.className = "button"
    removeButton.id = "biquadDelete-" + num
    removeButton.innerHTML = "Delete"
    removeButton.addEventListener("click", function(event) {
        context.eq.removeBiquad(biquad)
        group.remove()
        context.eq.redraw();
    })

    // Add the controls to the group
    group.append(typeControl, freqControl, qControl, gainControl, removeButton)
    context.eq.redraw();
    document.getElementById("filterControls").append(group)
}