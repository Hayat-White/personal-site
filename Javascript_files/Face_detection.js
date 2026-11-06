const video = document.getElementById("cameraVideo");
const sobelCanvas = document.getElementById("sobelCanvas");
const sobelContext = sobelCanvas.getContext("2d");
const sourceCanvas = document.createElement("canvas");
const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
const capturedCanvas = document.getElementById("capturedFrame");
const capturedContext = capturedCanvas.getContext("2d");
const capturedPanel = document.getElementById("capturedFramePanel");
const downloadLink = document.getElementById("downloadFrameLink");
const status = document.getElementById("cameraStatus");
const startButton = document.getElementById("startCameraBtn");
const stopButton = document.getElementById("stopCameraBtn");
const captureButton = document.getElementById("captureFrameBtn");

const processingWidth = 320;
let stream = null;
let animationFrame = null;

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);
captureButton.addEventListener("click", captureFrame);

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
    animationFrame = requestAnimationFrame(renderSobel);
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
  animationFrame = requestAnimationFrame(renderSobel);

  if (!video.videoWidth || !video.videoHeight) return;

  const width = processingWidth;
  const height = Math.round(width * video.videoHeight / video.videoWidth);
  if (sourceCanvas.width !== width || sourceCanvas.height !== height) {
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sobelCanvas.width = width;
    sobelCanvas.height = height;
    document.querySelectorAll(".camera-frame").forEach(frame => {
      frame.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
    });
  }

  sourceContext.drawImage(video, 0, 0, width, height);
  const source = sourceContext.getImageData(0, 0, width, height);
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
  captureButton.disabled = false;
}

function captureFrame() {
  if (!stream || !video.videoWidth || !video.videoHeight) return;

  capturedCanvas.width = video.videoWidth;
  capturedCanvas.height = video.videoHeight;
  capturedContext.drawImage(video, 0, 0, capturedCanvas.width, capturedCanvas.height);
  downloadLink.href = capturedCanvas.toDataURL("image/png");
  capturedPanel.hidden = false;
  status.textContent = "Unfiltered frame captured.";
}

function stopCamera() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
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
  captureButton.disabled = true;
  stopButton.disabled = true;
  startButton.disabled = false;
  status.textContent = "Camera is off.";
}
