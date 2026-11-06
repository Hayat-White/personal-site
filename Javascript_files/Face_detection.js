const video = document.getElementById("cameraVideo");
const overlay = document.getElementById("faceOverlay");
const context = overlay.getContext("2d");
const status = document.getElementById("cameraStatus");
const startButton = document.getElementById("startCameraBtn");
const stopButton = document.getElementById("stopCameraBtn");

let stream = null;
let detector = null;
let animationFrame = null;
let lastStatus = "";

startButton.addEventListener("click", startDetection);
stopButton.addEventListener("click", stopDetection);

async function startDetection() {
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

    status.textContent = "Loading face detector...";
    const { FaceDetector, FilesetResolver } = await import(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.mjs"
    );
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm/"
    );
    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
      },
      runningMode: "VIDEO",
      minDetectionConfidence: 0.5
    });

    stopButton.disabled = false;
    animationFrame = requestAnimationFrame(detectFaces);
  } catch (error) {
    stopDetection();
    if (error.name === "NotAllowedError") {
      status.textContent = "Camera access was blocked. Allow it in your browser's site settings, then try again.";
    } else if (error.message === "Camera access requires HTTPS or localhost.") {
      status.textContent = error.message;
    } else if (error.name === "NotFoundError") {
      status.textContent = "No camera was found on this device.";
    } else {
      status.textContent = "Could not start face detection. Check camera access and network connection, then try again.";
    }
    startButton.disabled = false;
  }
}

function detectFaces() {
  if (!detector || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    animationFrame = requestAnimationFrame(detectFaces);
    return;
  }

  if (overlay.width !== video.videoWidth || overlay.height !== video.videoHeight) {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
  }

  const results = detector.detectForVideo(video, performance.now());
  context.clearRect(0, 0, overlay.width, overlay.height);
  context.strokeStyle = "#42e695";
  context.lineWidth = Math.max(2, overlay.width / 240);

  for (const detection of results.detections) {
    const box = detection.boundingBox;
    context.strokeRect(box.originX, box.originY, box.width, box.height);
  }

  const nextStatus = results.detections.length
    ? `${results.detections.length} face${results.detections.length === 1 ? "" : "s"} detected.`
    : "No face detected.";
  if (nextStatus !== lastStatus) {
    status.textContent = nextStatus;
    lastStatus = nextStatus;
  }

  animationFrame = requestAnimationFrame(detectFaces);
}

function stopDetection() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (detector) {
    detector.close();
    detector = null;
  }
  video.srcObject = null;
  context.clearRect(0, 0, overlay.width, overlay.height);
  overlay.width = 0;
  overlay.height = 0;
  lastStatus = "";
  stopButton.disabled = true;
  startButton.disabled = false;
  status.textContent = "Camera is off.";
}
