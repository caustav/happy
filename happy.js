const video = document.getElementById('video')

var jqVideo = $('#video')

var profile
var detectionN

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

var readCurrentProfile = function () {
    return new Promise(function (resolve) {
        $.get('/happy/current', function (data) {
            profile = data
            resolve(data)
        })
    });
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video)
    $('body').append(canvas)
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize);

    readCurrentProfile().then(()=> {
        (async () => {

            console.log("1 " + new Date().toUTCString());

            loadAlreadyLabeledImages().then(function (loadAlreadyImages) {
                faceMatcher = new faceapi.FaceMatcher(loadAlreadyImages, 0.6)
                console.log("2 " + new Date().toUTCString());
                readFaceExpression(faceMatcher, canvas)
            })
        })();        
    })
})

function isTimeOut(startTime, currentTime) {
    var ret = false;
    var diff = currentTime - startTime
    var diffInSeconds = Math.floor(diff / 1000);
    if (diffInSeconds > 25) {
        ret = true
        console.log("Image not matched !!!."  + new Date().toUTCString())
        $('.status-text').html("Sorry! You are failed to login.")
        $('.overlay-desc').css('display', 'none')
    }
    return ret
}

async function getImageFromVideo(canvas) {
    var canvasMem = document.createElement('canvas');
    canvasMem.width = canvas.width
    canvasMem.height = canvas.height;
    var ctx = canvasMem.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    var dataURI = canvasMem.toDataURL('image/jpeg')
    const img = await faceapi.fetchImage(dataURI)
    return img
}

async function readFaceExpression(faceMatcher, canvas) {
    var isHappy = false;
    var isNeutral = false;
    var hImage
    var nImage

    var startTime = new Date()    

    var img
    var detection;
    var isFailed
    while(true) {
        img = await getImageFromVideo(canvas)
        var detections = await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
        detection = detections[0]

        if (detections.length > 1) {
            $('.overlay-desc').css('display', 'none')
            $('.status-text').html("Multiple face detected.")
            jqVideo.css('opacity', "0")
            isFailed = true
            break;
        }  
        
        if (isTimeOut(startTime, new Date)) {
            isFailed = true
            break;
        }

        if (detection) {
            $('.overlay-desc').css('display', 'none')
            jqVideo.css('opacity', "1")
            $('.status-text').html(" ")

            if (detection.expressions != undefined &&
                (detection.expressions.happy || detection.expressions.neutral)) {

                // console.log("H : " + detection.expressions.happy)
                // console.log("N : " + detection.expressions.neutral)
    
                if (detection.expressions.happy < detection.expressions.neutral) {
                    isNeutral = true;
                    nImage = img
    
                } else if ((detection.expressions.happy > detection.expressions.neutral) &&
                        (detection.expressions.happy - detection.expressions.neutral > .3)){

                    isHappy = true;
                    hImage = img
                }
            }

            if (isNeutral && isHappy) {

                $('.overlay-desc').css('display', 'block')
                $('.status-text').html("Scanning your image.")
                jqVideo.css('opacity', "0")

                isHappy = false;
                isNeutral = false;
                break
            }
        }
    }

    var faceRecogTimer = setTimeout(async () => {

        var ret = await isImageIdentical(nImage, hImage, startTime)
        console.log("faceRecogTimer " + ret)
        if (ret == false) {
            $('.overlay-desc').css('display', 'none')
            $('.status-text').html("Sorry! You are failed to login.")
            jqVideo.css('opacity', "0")
            isFailed = true
        }else {
            console.log("Open the connection." + new Date().toUTCString())                    
        }

        if (detectionN == undefined || detectionN.descriptor == undefined) {
            clearTimeout(faceRecogTimer)
            return
        }

        result = faceMatcher.findBestMatch(detectionN.descriptor)
        console.log(result.distance)            
        if (result.distance <= .5) {
            console.log("Image matched !!!."  + new Date().toUTCString())
            $('.overlay-desc').css('display', 'none')
            $('.status-text').html("Face is matched.")
            $('video').trigger('pause');
            clearTimeout(faceRecogTimer)

            setTimeout(async () => {
                window.location.href="http://localhost:8020/landing.html";
            }, 300)
        }
    }, 100)
}

async function isImageIdentical(imgN, imgH, startTime) {
    var ret = false
    const descriptions = []
    var detection
    while(!detection){
        if (isTimeOut(startTime, new Date)) {
            return
        }
        detection = await faceapi.detectSingleFace(imgN).withFaceLandmarks().withFaceDescriptor()   
    }    
    detectionN = detection
    descriptions.push(detection.descriptor)
    var labeledDescriptors = new faceapi.LabeledFaceDescriptors(profile, descriptions)
    var faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6)
    var detectionH
    while(!detectionH){
        if (isTimeOut(startTime, new Date)) {
            return
        }
        var detectionsH = await faceapi.detectAllFaces(imgH).withFaceLandmarks().withFaceDescriptors()
        if (detectionsH.length > 1) {
            $('.overlay-desc').css('display', 'none')
            $('.status-text').html("Multiple face detected.")
            jqVideo.css('opacity', "0")
            isFailed = true
            return
        }
        detectionH = detectionsH[0]
    }   
    var result = faceMatcher.findBestMatch(detectionH.descriptor)
    console.log('isImageIdentical ' + result)

    if (result.distance <= .5) {
        ret = true
    }
    return ret
}

function loadAlreadyLabeledImages() {

    return new Promise(function (resolve) {

        readSavedFaceDescriptors(profile).then(function (faceDescriptors) {

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
            resolve(new faceapi.LabeledFaceDescriptors(profile, proxydescriptors))
        })
    })
}