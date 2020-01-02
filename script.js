const video = document.getElementById('video')

var jqVideo = $('#video')

$('body').ready(function () {
    jqVideo.css('opacity', "0");
    $('.overlay-desc').css('display', 'block')
    $('.status-text').html("Smile when camera is on")
});

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
]).then(startVideo)

function startVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

var readSavedFaceDescriptors = function (userId) {
    return new Promise(function (resolve) {
        $.get('/descriptor/' + userId, function (data) {
            resolve(data)
        })
    });
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video)
    $('body').append(canvas)
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize);

    (async () => {

        console.log("1 " + new Date().toUTCString());

        loadAlreadyLabeledImages().then(function (loadAlreadyImages) {
            faceMatcher = new faceapi.FaceMatcher(loadAlreadyImages, 0.6)
            console.log("2 " + new Date().toUTCString());
            readFaceExpression(faceMatcher, canvas)
        })
    })();
})

function isTimeOut(startTime, currentTime) {
    var ret = false;
    var diff = currentTime - startTime
    var diffInSeconds = Math.floor(diff / 1000);
    if (diffInSeconds > 15) {
        ret = true
        console.log("Image not matched !!!."  + new Date().toUTCString())
        $('.status-text').html("Image not matched !!!.")
        $('.overlay-desc').css('display', 'none')
    }
    return ret
}

async function readFaceExpression(faceMatcher, canvas) {
    var isHappy = false;
    var isNeutral = false;

    var startTime = new Date()

    var detection;
    while(true) {
        detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()

        if (isTimeOut(startTime, new Date)) {
            break;
        }

        if (detection) {
            $('.overlay-desc').css('display', 'none')
            jqVideo.css('opacity', "1")
            $('.status-text').html(" ")

            if (detection.expressions != undefined &&
                (detection.expressions.happy || detection.expressions.neutral)) {
    
                if (detection.expressions.happy < detection.expressions.neutral) {
                    isNeutral = true;
    
                } else if (detection.expressions.happy > detection.expressions.neutral) {
                    isHappy = true;
                }
            }

            if (isNeutral && isHappy) {
                console.log("Open the connection." + new Date().toUTCString())
                isHappy = false;
                isNeutral = false;
                break;
            }
        }
    }

    $('.overlay-desc').css('display', 'block')
    $('.status-text').html("Scanning your image.")
    jqVideo.css('opacity', "0");

    setTimeout(async () => {
        while(true) {
            detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor()
            if (isTimeOut(startTime, new Date)) {
                break;
            }
            if (detection && detection.descriptor) {
                result = faceMatcher.findBestMatch(detection.descriptor)
                console.log(result.distance)            
                if (result.distance <= .5) {
                    console.log("Image matched !!!."  + new Date().toUTCString())
                    $('.overlay-desc').css('display', 'none')
                    $('.status-text').html("Image is matched.")
                    $('video').trigger('pause');
                    break;
                }
            }
        }
    }, 100)
}

async function loadLabeledImages() {
    const labels = ['kc']
    return Promise.all(
        labels.map(async label => {
            const descriptions = []
            for (let i = 1; i <= 6; i++) {
                const img = await faceapi.fetchImage(`/images/${label}/${i}.jpg`)
                const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
                descriptions.push(detection.descriptor)
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions)
        })
    )
}

function loadAlreadyLabeledImages() {

    return new Promise(function (resolve) {

        readSavedFaceDescriptors('kc').then(function (faceDescriptors) {

            var labeledFaceDescriptors = JSON.parse(faceDescriptors)
            var proxydescriptors = [];
            $.each(labeledFaceDescriptors, function (_, labeledFaceDescriptor) {
                $.each(labeledFaceDescriptor._descriptors, function (i, descriptor) {
                    fArray = new Float32Array(Object.keys(descriptor).length)
                    $.each(descriptor, function (index, value) {
                        fArray[index] = value
                    })
                    proxydescriptors.push(fArray)
                })
            })
            resolve(new faceapi.LabeledFaceDescriptors("kc", proxydescriptors))
        })
    })
}