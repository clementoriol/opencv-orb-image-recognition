/*
  We draw the camera feed to a canvas element.
  This is useful for : 
  - Making sure the camera feed is displayed on the full screen (because we can't guarantee the video resolution will match the screen resolution)
  - Processing only the displayed area of the camera feed, since we give only the canvas content to our detection algorithms.
*/
export const drawCameraFrameOnCanvas = (
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement
) => {
  const canvasAspect = canvasElement.width / canvasElement.height;
  const ctx = canvasElement.getContext("2d");

  if (!ctx) {
    throw new Error("Cannot get Canvas 2D context");
  }

  const { videoWidth, videoHeight } = videoElement;

  const videoAspect = videoWidth / videoHeight;

  if (videoWidth === 0 || videoHeight === 0) {
    // Video not ready yet
    return;
  }

  // Compute the coordinates for cropping the video to fit the canvas
  let sx, sy, sW, sH;
  if (videoAspect > canvasAspect) {
    sW = videoHeight * canvasAspect;
    sH = videoHeight;
    sx = (videoWidth - sW) / 2;
    sy = 0;
  } else {
    sW = videoWidth;
    sH = videoWidth / canvasAspect;
    sx = 0;
    sy = (videoHeight - sH) / 2;
  }

  // Draw the cropped video frame onto the canvas
  ctx.drawImage(
    videoElement,
    sx,
    sy,
    sW,
    sH,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );
};

export const resizeCameraCanvas = (canvasElement: HTMLCanvasElement) => {
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;
};
