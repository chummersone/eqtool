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
    function createNumberInput(id, min, max, step, value, onChange) {
        var control = document.createElement("div")
        control.className = "control"
        var label = document.createElement("label")
        label.htmlFor = id
        var input = document.createElement("input")
        input.id = id
        input.min = min
        input.max = max
        input.step = step
        input.value = value
        input.addEventListener("change", onChange)
        control.append(label, input)
        return control
    }

    var freqControl = createNumberInput("biquadFrequency-" + num, 1, 20000, 1, biquad.frequency.defaultValue, function(event) {
        biquad.frequency.value = Number(event.target.value)
        context.eq.redraw();
    })

    var qControl = createNumberInput("biquadQ-" + num, 0, 14, 0.00001, biquad.Q.defaultValue, function(event) {
        biquad.Q.value = Number(event.target.value)
        context.eq.redraw();
    })

    var gainControl = createNumberInput("biquadGain-" + num, -40, 40, 0.1, biquad.gain.defaultValue, function(event) {
        biquad.gain.value = Number(event.target.value)
        context.eq.redraw();
    })

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