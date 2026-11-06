const video = document.getElementById("cameraVideo");
const sobelCanvas = document.getElementById("sobelCanvas");
const sobelContext = sobelCanvas.getContext("2d");
const differenceCanvas = document.getElementById("differenceCanvas");
const differenceContext = differenceCanvas.getContext("2d");
const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
const status = document.getElementById("cameraStatus");
const startButton = document.getElementById("startCameraBtn");
const stopButton = document.getElementById("stopCameraBtn");

const processingWidth = 320;
let stream = null;
let animationFrame = null;
let videoFrameRequest = null;
let previousFrame = null;

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);

async function startCamera() {
  startButton.disabled = true;
  status.textContent = "Requesting camera access...";

  try {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera access requires HTTPS or localhost.");
    }

    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
    await video.play();
    stopButton.disabled = false;
    status.textContent = "Camera is on.";
    scheduleFrame();
  } catch (error) {
    stopCamera();
    if (error.name === "NotAllowedError") {
      status.textContent = "Camera access was blocked. Allow it in your browser's site settings, then try again.";
    } else if (error.message === "Camera access requires HTTPS or localhost.") {
      status.textContent = error.message;
    } else if (error.name === "NotFoundError") {
      status.textContent = "No camera was found on this device.";
    } else {
      status.textContent = "Could not start the camera. Check camera access and try again.";
    }
    startButton.disabled = false;
  }
}

function renderSobel() {
  if (!stream) return;

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    scheduleFrame();
    return;
  }

  const width = processingWidth;
  const height = Math.round(width * video.videoHeight / video.videoWidth);
  if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sobelCanvas.width = width;
    sobelCanvas.height = height;
    differenceCanvas.width = width;
    differenceCanvas.height = height;
    previousFrame = null;
    document.querySelectorAll(".camera-frame").forEach(frame => {
      frame.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
    });
  }

  sourceContext.drawImage(video, 0, 0, width, height);
  const source = sourceContext.getImageData(0, 0, width, height);
  const difference = differenceContext.createImageData(width, height);
  for (let offset = 0; offset < source.data.length; offset += 4) {
    const change = previousFrame
      ? (Math.abs(source.data[offset] - previousFrame[offset]) +
        Math.abs(source.data[offset + 1] - previousFrame[offset + 1]) +
        Math.abs(source.data[offset + 2] - previousFrame[offset + 2])) / 3
      : 0;
    const intensity = Math.min(255, Math.max(0, change - 10) * 5);
    difference.data[offset] = intensity;
    difference.data[offset + 1] = intensity;
    difference.data[offset + 2] = intensity;
    difference.data[offset + 3] = 255;
  }
  differenceContext.putImageData(difference, 0, 0);
  previousFrame = new Uint8ClampedArray(source.data);

  const grayscale = new Float32Array(width * height);
  const output = sobelContext.createImageData(width, height);

  for (let pixel = 0; pixel < grayscale.length; pixel++) {
    const offset = pixel * 4;
    grayscale[pixel] =
      source.data[offset] * 0.299 +
      source.data[offset + 1] * 0.587 +
      source.data[offset + 2] * 0.114;
    output.data[offset + 3] = 255;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixel = y * width + x;
      const topLeft = grayscale[pixel - width - 1];
      const top = grayscale[pixel - width];
      const topRight = grayscale[pixel - width + 1];
      const left = grayscale[pixel - 1];
      const right = grayscale[pixel + 1];
      const bottomLeft = grayscale[pixel + width - 1];
      const bottom = grayscale[pixel + width];
      const bottomRight = grayscale[pixel + width + 1];
      const horizontal = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const vertical = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
      const magnitude = Math.min(255, Math.hypot(horizontal, vertical) / 4);
      const offset = pixel * 4;
      output.data[offset] = magnitude;
      output.data[offset + 1] = magnitude;
      output.data[offset + 2] = magnitude;
    }
  }

  sobelContext.putImageData(output, 0, 0);
  scheduleFrame();
}

function scheduleFrame() {
  if (!stream) return;

  if (typeof video.requestVideoFrameCallback === "function") {
    videoFrameRequest = video.requestVideoFrameCallback(renderSobel);
  } else {
    animationFrame = requestAnimationFrame(renderSobel);
  }
}

function stopCamera() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  if (videoFrameRequest !== null && typeof video.cancelVideoFrameCallback === "function") {
    video.cancelVideoFrameCallback(videoFrameRequest);
    videoFrameRequest = null;
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  video.srcObject = null;
  sourceCanvas.width = 0;
  sourceCanvas.height = 0;
  sobelCanvas.width = 0;
  sobelCanvas.height = 0;
  differenceCanvas.width = 0;
  differenceCanvas.height = 0;
  previousFrame = null;
  stopButton.disabled = true;
  startButton.disabled = false;
  status.textContent = "Camera is off.";
}
