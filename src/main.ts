// src/main.ts
import "./style.css";
import cv from "@techstark/opencv-js";

// -----------------------------------------------------------------------------
// Derive a TS type for “DMatch” by inspecting DMatchVector.get()
type DMatch = ReturnType<InstanceType<typeof cv.DMatchVector>["get"]>;

// Global references
let videoElement!: HTMLVideoElement;
let canvasOverlay!: HTMLCanvasElement;
let ctxOverlay!: CanvasRenderingContext2D;
let streaming = false;

// ORB detector + BFMatcher
// You can bump maxFeatures if you need more keypoints on a 600px image
let orb!: InstanceType<typeof cv.ORB>;
let bfMatcher!: InstanceType<typeof cv.BFMatcher>;

interface ReferenceImage {
  name: string;
  matGray: InstanceType<typeof cv.Mat>;
  keypoints: InstanceType<typeof cv.KeyPointVector>;
  descriptors: InstanceType<typeof cv.Mat>;
  originalWidth: number; // must match the actual pixel width on disk
  originalHeight: number; // must match the actual pixel height on disk
}
const references: ReferenceImage[] = [];

// Tweak these as needed once your refs are all, say, ~600px on the long side:
const MIN_GOOD_MATCHES = 15; // how many ratio-test matches to accept
const RANSAC_REPROJ_THRESHOLD = 5; // in pixels, tighter => fewer outliers

// -----------------------------------------------------------------------------
// 1. Initialize camera + canvas + resize listener
async function initCamera(): Promise<void> {
  videoElement = document.getElementById("video") as HTMLVideoElement;
  canvasOverlay = document.getElementById(
    "canvas-overlay"
  ) as HTMLCanvasElement;
  const ctx = canvasOverlay.getContext("2d");
  if (!ctx) throw new Error("Cannot get 2D context");
  ctxOverlay = ctx;

  window.addEventListener("resize", adjustCanvasSize);
  window.addEventListener("orientationchange", adjustCanvasSize);

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = () => {
      videoElement.play();
      adjustCanvasSize();
      streaming = true;
      requestAnimationFrame(processVideoFrame);
    };
  } catch (err) {
    updateStatus(`Camera error: ${err}`);
    console.error(err);
  }
}

function adjustCanvasSize(): void {
  canvasOverlay.width = window.innerWidth;
  canvasOverlay.height = window.innerHeight;
}

// -----------------------------------------------------------------------------
// 2. Load references (assumes you’ve already resized them to 6O0px on the longest side)
async function loadReferenceImages(): Promise<void> {
  const refList = [
    { name: "cat", url: "/references/cat.jpg" },
    { name: "dog", url: "/references/dog.jpg" },
  ];

  for (const ref of refList) {
    const img = new Image();
    img.src = ref.url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn(`Failed to load ${ref.url}`);
        resolve();
      };
    });

    // Read the already-resized image into a Mat
    const matOriginal = cv.imread(img);
    const matGray = new cv.Mat();
    cv.cvtColor(matOriginal, matGray, cv.COLOR_RGBA2GRAY);
    matOriginal.delete();

    // Detect ORB keypoints + descriptors
    const keypoints = new cv.KeyPointVector();
    const descriptors = new cv.Mat();
    orb.detectAndCompute(matGray, new cv.Mat(), keypoints, descriptors);

    const nRefKP = keypoints.size();
    console.log(
      `Loaded "${ref.name}" (${img.width}×${img.height}) → ${nRefKP} keypoints`
    );
    if (nRefKP < 20) {
      console.warn(
        `"${ref.name}" has only ${nRefKP} keypoints. Consider richer detail or more ORB features.`
      );
    }

    references.push({
      name: ref.name,
      matGray,
      keypoints,
      descriptors,
      originalWidth: img.width, // matches the offline resized dimensions
      originalHeight: img.height, // matches the offline resized dimensions
    });

    updateStatus(`Loaded ${ref.name} (${nRefKP} KP)`);
  }
}

// -----------------------------------------------------------------------------
// 3. Main loop: crop+draw video, run ORB, match, draw box
function processVideoFrame(): void {
  if (!streaming) {
    requestAnimationFrame(processVideoFrame);
    return;
  }

  const width = canvasOverlay.width;
  const height = canvasOverlay.height;

  // 3.1 Compute “cover” crop for video (CSS object-fit: cover)
  const vidW = videoElement.videoWidth;
  const vidH = videoElement.videoHeight;
  if (vidW === 0 || vidH === 0) {
    requestAnimationFrame(processVideoFrame);
    return;
  }

  const canvasAspect = width / height;
  const videoAspect = vidW / vidH;

  let sx = 0,
    sy = 0,
    sW = vidW,
    sH = vidH;
  if (videoAspect > canvasAspect) {
    sW = vidH * canvasAspect;
    sx = (vidW - sW) / 2;
  } else {
    sH = vidW / canvasAspect;
    sy = (vidH - sH) / 2;
  }

  // 3.2 Draw cropped video into full-screen canvas
  ctxOverlay.drawImage(
    videoElement,
    sx,
    sy,
    sW,
    sH, // source rectangle on the <video>
    0,
    0,
    width,
    height // destination on the canvas
  );

  // 3.3 Grab pixels → RGBA Mat → Grayscale Mat
  const imgData = ctxOverlay.getImageData(0, 0, width, height);
  const matRGBA = cv.matFromImageData(imgData);
  const matGray = new cv.Mat();
  cv.cvtColor(matRGBA, matGray, cv.COLOR_RGBA2GRAY);
  matRGBA.delete();

  // 3.4 ORB detect + compute on the scene
  const keypointsScene = new cv.KeyPointVector();
  const descriptorsScene = new cv.Mat();
  orb.detectAndCompute(matGray, new cv.Mat(), keypointsScene, descriptorsScene);

  const nSceneKP = keypointsScene.size();
  console.log(`Scene has ${nSceneKP} keypoints`);
  if (nSceneKP < 20) {
    console.warn("Few scene keypoints; try better lighting or move closer");
  }

  // 3.5 Match each reference
  type MatchResult = {
    ref: ReferenceImage;
    goodMatches: DMatch[];
    homography: InstanceType<typeof cv.Mat>;
  };
  let bestMatch: MatchResult | null = null;

  for (const refImg of references) {
    const knnMatches = new cv.DMatchVectorVector();
    bfMatcher.knnMatch(descriptorsScene, refImg.descriptors, knnMatches, 2);

    // Lowe’s ratio test at 0.7
    const goodMatches: DMatch[] = [];
    for (let i = 0; i < knnMatches.size(); i++) {
      const pair = knnMatches.get(i);
      const m = pair.get(0);
      const n = pair.get(1);
      if (m.distance < 0.7 * n.distance) {
        goodMatches.push(m);
      }
      pair.delete();
    }

    console.log(
      `Ref "${refImg.name}": ${knnMatches.size()} raw, ${
        goodMatches.length
      } passed ratio`
    );
    if (goodMatches.length < MIN_GOOD_MATCHES) {
      knnMatches.delete();
      continue;
    }

    // Build point arrays for homography
    const srcPts: number[] = [];
    const dstPts: number[] = [];
    for (const m of goodMatches) {
      const scenePt = keypointsScene.get(m.queryIdx).pt;
      const refPt = refImg.keypoints.get(m.trainIdx).pt;
      srcPts.push(refPt.x, refPt.y);
      dstPts.push(scenePt.x, scenePt.y);
    }

    const srcMat = cv.matFromArray(goodMatches.length, 2, cv.CV_32F, srcPts);
    const dstMat = cv.matFromArray(goodMatches.length, 2, cv.CV_32F, dstPts);
    const mask = new cv.Mat();

    // RANSAC with 3px threshold
    const homography = cv.findHomography(
      srcMat,
      dstMat,
      cv.RANSAC,
      RANSAC_REPROJ_THRESHOLD,
      mask
    );
    let inliers = 0;
    for (let i = 0; i < mask.rows; i++) {
      if (mask.data[i] === 1) inliers++;
    }
    if (inliers < 0.8 * goodMatches.length) {
      homography.delete();
      srcMat.delete();
      dstMat.delete();
      mask.delete();
      knnMatches.delete();
      continue;
    }

    // Optional: refine with LMEDS on inliers
    const inSrc: number[] = [];
    const inDst: number[] = [];
    for (let i = 0; i < mask.rows; i++) {
      if (mask.data[i] === 1) {
        const m = goodMatches[i];
        const sPt = keypointsScene.get(m.queryIdx).pt;
        const rPt = refImg.keypoints.get(m.trainIdx).pt;
        inSrc.push(rPt.x, rPt.y);
        inDst.push(sPt.x, sPt.y);
      }
    }
    const inSrcMat = cv.matFromArray(inSrc.length / 2, 2, cv.CV_32F, inSrc);
    const inDstMat = cv.matFromArray(inDst.length / 2, 2, cv.CV_32F, inDst);
    const refinedH = cv.findHomography(inSrcMat, inDstMat, cv.LMEDS);
    homography.delete();
    srcMat.delete();
    dstMat.delete();
    mask.delete();

    if (!bestMatch || inliers > bestMatch.goodMatches.length) {
      if (bestMatch) bestMatch.homography.delete();
      bestMatch = { ref: refImg, goodMatches, homography: refinedH };
    } else {
      refinedH.delete();
    }

    knnMatches.delete();
    inSrcMat.delete();
    inDstMat.delete();
  }

  // 3.6 Cleanup scene Mats
  keypointsScene.delete();
  descriptorsScene.delete();
  matGray.delete();

  // 3.7 Draw the green quadrilateral on top of the same canvas
  if (bestMatch) {
    const w = bestMatch.ref.originalWidth; // must match your offline-resized width
    const h = bestMatch.ref.originalHeight; // must match your offline-resized height
    const corners = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      w,
      0,
      w,
      h,
      0,
      h,
    ]);
    const dstCorners = new cv.Mat();
    cv.perspectiveTransform(corners, dstCorners, bestMatch.homography);

    ctxOverlay.strokeStyle = "lime";
    ctxOverlay.lineWidth = 4;
    ctxOverlay.beginPath();
    for (let i = 0; i < 4; i++) {
      const x = dstCorners.data32F[i * 2];
      const y = dstCorners.data32F[i * 2 + 1];
      if (i === 0) ctxOverlay.moveTo(x, y);
      else ctxOverlay.lineTo(x, y);
    }
    ctxOverlay.closePath();
    ctxOverlay.stroke();

    bestMatch.homography.delete();
    corners.delete();
    dstCorners.delete();

    updateStatus(
      `Match: ${bestMatch.ref.name} — ${bestMatch.goodMatches.length} inliers`
    );
  } else {
    updateStatus("No match");
  }

  // 3.8 Loop
  requestAnimationFrame(processVideoFrame);
}

// -----------------------------------------------------------------------------
/** Update the status bar text. */
function updateStatus(text: string): void {
  const span = document.getElementById("status-text")!;
  span.textContent = text;
}

// -----------------------------------------------------------------------------
// 4. onRuntimeInitialized → set up ORB + BFMatcher, load refs, start camera
function onOpenCvReady(): void {
  orb = new cv.ORB(1000); // try 1000 if refs are 600px
  bfMatcher = new cv.BFMatcher(cv.NORM_HAMMING, false);

  updateStatus("OpenCV.js ready. Loading references...");
  loadReferenceImages().then(() => {
    updateStatus("References loaded. Starting camera...");
    initCamera();
  });
}

cv.onRuntimeInitialized = onOpenCvReady;
