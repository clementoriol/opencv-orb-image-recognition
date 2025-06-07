import Stats from "stats.js";
import debounce from "lodash/debounce";
import {
  buildCameraSettings,
  updateCameraSettings,
  type CameraResolution,
} from "./cameraSettings";
import { drawCameraFrameOnCanvas, resizeCameraCanvas } from "./cameraCanvas";

type StartCameraOptions = {
  showFps?: boolean;
  resolution?: CameraResolution;
};

export const startCamera = async ({
  videoElement,
  canvasElement,
  onEachCameraFrame,
  options: userOptions,
}: {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  onEachCameraFrame: (
    frameCount: number,
    videoCanvasContext: CanvasRenderingContext2D
  ) => void;
  options?: StartCameraOptions;
}) => {
  const DEFAULT_OPTIONS: Required<StartCameraOptions> = {
    showFps: true,
    resolution: "720p" as CameraResolution, // Default resolution
  };
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  if (!videoElement) {
    throw new Error("Cannot find video element");
  }
  if (!canvasElement) {
    throw new Error("Cannot find canvasElement");
  }
  const ctx = canvasElement.getContext("2d");
  if (!ctx) throw new Error("Cannot get Canvas 2D context");

  // Update canvas size on load and resize
  resizeCameraCanvas(canvasElement);

  const handleResize = debounce(
    () => {
      resizeCameraCanvas(canvasElement);
      updateCameraSettings(videoElement, options.resolution);
    },
    300, // run max once every 300ms
    { leading: true, trailing: true }
  );
  window.addEventListener("resize", handleResize);
  const cameraSettings = buildCameraSettings(options.resolution);

  // Note: max FPS are capped to the camera FPS, so on some devices you may not be able to go above 30 FPS
  const fpsMeter = options?.showFps ? new Stats() : undefined;
  if (fpsMeter) {
    fpsMeter.showPanel(0); // Show FPS panel
    document.body.appendChild(fpsMeter.dom);
  }

  let frameCount = 0;
  const frameProcessingLoop: VideoFrameRequestCallback = () => {
    fpsMeter?.begin();
    frameCount++;
    drawCameraFrameOnCanvas(videoElement, canvasElement);
    onEachCameraFrame(frameCount, ctx);
    fpsMeter?.end();
    videoElement.requestVideoFrameCallback(frameProcessingLoop);
  };

  const stream = await navigator.mediaDevices.getUserMedia(cameraSettings);
  videoElement.srcObject = stream;
  videoElement.onloadedmetadata = () => {
    videoElement.play();
    // Frame processing loop
    videoElement.requestVideoFrameCallback(frameProcessingLoop);
  };
};
