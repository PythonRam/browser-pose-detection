const color = 'aqua';
const lineWidth = 2;
let videoHeight, videoWidth;

function toTuple({
    y,
    x
}) {
    return [y, x];
}


const guiState = {
    algorithm: 'single-pose',
    input: {
        mobileNetArchitecture: isMobile() ? '0.50' : '1.01',
        outputStride: 16,
        imageScaleFactor: 0.5,
    },
    singlePoseDetection: {
        minPoseConfidence: 0.1,
        minPartConfidence: 0.5,
    },
    multiPoseDetection: {
        maxPoseDetections: 2,
        minPoseConfidence: 0.1,
        minPartConfidence: 0.3,
        nmsRadius: 20.0,
    },
    output: {
        showVideo: true,
        showSkeleton: true,
        showPoints: true,
    },
    net: null,
};



async function detectPoseInRealTime(video, net) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const flipHorizontal = true; // since images are being fed from a webcam

    canvas.width = videoWidth;
    canvas.height = videoHeight;
    guiState.net = await posenet.load(1.01);

    async function poseDetectionFrame() {
        const imageScaleFactor = guiState.input.imageScaleFactor;
        const outputStride = Number(guiState.input.outputStride);

        let poses = [];
        let minPoseConfidence;
        let minPartConfidence;

        const pose = await guiState.net.estimateSinglePose(video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);

        minPoseConfidence = Number(
            guiState.singlePoseDetection.minPoseConfidence);
        minPartConfidence = Number(
            guiState.singlePoseDetection.minPartConfidence);



        ctx.clearRect(0, 0, videoWidth, videoHeight);

        if (guiState.output.showVideo) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-videoWidth, 0);
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            ctx.restore();
        }

        poses.forEach(({
            score,
            keypoints
        }) => {
            if (score >= minPoseConfidence) {
                if (guiState.output.showPoints) {
                    drawKeypoints(keypoints, minPartConfidence, ctx);
                }
                if (guiState.output.showSkeleton) {
                    drawSkeleton(keypoints, minPartConfidence, ctx);
                }
            }
        });
        requestAnimationFrame(poseDetectionFrame);
    }

    poseDetectionFrame();
}

async function bindPage() {
    const net = await posenet.load();
    videoWidth =  screen.width*0.6;
    videoHeight = screen.height*0.6;

    document.getElementById('loading').style.display = 'none';
    document.getElementById('main').style.display = 'block';

    let video;

    try {
        video = await loadVideo();
    } catch (e) {
        let info = document.getElementById('info');
        info.textContent = "this browser does not support video capture, or this device does not have a camera";
        info.style.display = 'block';
        throw e;
    }
    detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
bindPage();