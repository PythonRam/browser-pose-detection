function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];

        if (keypoint.score < minConfidence) {
            continue;
        }

        const {
            y,
            x
        } = keypoint.position;
        ctx.beginPath();
        ctx.arc(x * scale, y * scale, 3, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
    }
}

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
    ctx.beginPath();
    ctx.moveTo(ax * scale, ay * scale);
    ctx.lineTo(bx * scale, by * scale);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
        keypoints, minConfidence);

    adjacentKeyPoints.forEach((keypoints) => {
        drawSegment(toTuple(keypoints[0].position),
            toTuple(keypoints[1].position), color, scale, ctx);
    });
}

function drawBoundingBox(keypoints, ctx) {
    const boundingBox = posenet.getBoundingBox(keypoints);

    ctx.rect(boundingBox.minX, boundingBox.minY,
        boundingBox.maxX - boundingBox.minX, boundingBox.maxY - boundingBox.minY);

    ctx.stroke();
}

async function renderToCanvas(a, ctx) {
    const [height, width] = a.shape;
    const imageData = new ImageData(width, height);

    const data = await a.data();

    for (let i = 0; i < height * width; ++i) {
        const j = i * 4;
        const k = i * 3;

        imageData.data[j + 0] = data[k + 0];
        imageData.data[j + 1] = data[k + 1];
        imageData.data[j + 2] = data[k + 2];
        imageData.data[j + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
}

function renderImageToCanvas(image, size, canvas) {
    canvas.width = size[0];
    canvas.height = size[1];
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);
}

function drawHeatMapValues(heatMapValues, outputStride, canvas) {
    const ctx = canvas.getContext('2d');
    const radius = 5;
    const scaledValues = heatMapValues.mul(tf.scalar(outputStride, 'int32'));

    drawPoints(ctx, scaledValues, radius, color);
}

function drawPoints(ctx, points, radius, color) {
    const data = points.buffer().values;

    for (let i = 0; i < data.length; i += 2) {
        const pointY = data[i];
        const pointX = data[i + 1];

        if (pointX !== 0 && pointY !== 0) {
            ctx.beginPath();
            ctx.arc(pointX, pointY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }
}

function drawOffsetVectors(
    heatMapValues, offsets, outputStride, scale = 1, ctx) {
    const offsetPoints = posenet.singlePose.getOffsetPoints(
        heatMapValues, outputStride, offsets);

    const heatmapData = heatMapValues.buffer().values;
    const offsetPointsData = offsetPoints.buffer().values;

    for (let i = 0; i < heatmapData.length; i += 2) {
        const heatmapY = heatmapData[i] * outputStride;
        const heatmapX = heatmapData[i + 1] * outputStride;
        const offsetPointY = offsetPointsData[i];
        const offsetPointX = offsetPointsData[i + 1];

        drawSegment([heatmapY, heatmapX], [offsetPointY, offsetPointX],
            color, scale, ctx);
    }
}

function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

function isiOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
    return isAndroid() || isiOS();
}

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw 'Browser API navigator.mediaDevices.getUserMedia not available';
    }

    const video = document.getElementById('video');
    video.width = videoWidth;
    video.height = videoHeight;

    const mobile = isMobile();
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
            width: mobile ? undefined : videoWidth,
            height: mobile ? undefined : videoHeight
        }
    });
    video.srcObject = stream;

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadVideo() {
    const video = await setupCamera();
    video.play();
    return video;
}