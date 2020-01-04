$('body').ready(function () {
    $('.overlay-desc').css('display', 'none')
});


function onClickUploadImageInfo() {
    $('.overlay-desc').css('display', 'block')
    $('.admin-container').css('opacity', .5)
    
    var userId = $('.userInput')[0].value
    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
    ]).then(async () => {
        await uploadImageInfo(userId)
        $('.overlay-desc').css('display', 'none')
        $('.admin-container').css('opacity', 1)
    })
}

var upload = function (userId, data) {
    return new Promise(function (resolve) {
        $.post('/descriptor/' + userId, {labeledDescriptor:data}, function (data) {
            console.log(data)
            resolve(data)
        })
    });
}

async function uploadImageInfo(userId) {
    const descriptions = []
    const labeledFaceDescriptorsArray = []
    for (let i = 1; i <= 5; i++) {
        const img = await faceapi.fetchImage(`/images/${userId}/${i}.jpg`)
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
        descriptions.push(detection.descriptor)
    }
    labeledFaceDescriptorsArray.push(new faceapi.LabeledFaceDescriptors(userId, descriptions))
    var labeledFaceDescriptors = JSON.stringify(labeledFaceDescriptorsArray)

    upload(userId, labeledFaceDescriptors).then(function(data){
        console.log('Success : ' + data)
    }) 
}