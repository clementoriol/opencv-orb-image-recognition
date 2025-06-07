export const cameraResolutionMap = {
  "1080p": { height: 1080 },
  "720p": { height: 720 },
  "480p": { height: 480 },
  "360p": { height: 360 },
  "240p": { height: 240 },
};
export type CameraResolution = keyof typeof cameraResolutionMap;

export const buildCameraSettings = (
  resolution: CameraResolution
): MediaStreamConstraints => {
  return {
    audio: false,
    video: {
      facingMode: { ideal: "environment" }, // Use rear camera by default
      height: { ideal: getResolutionHeight(resolution) }, // Set ideal height
      width: {
        ideal: getResolutionHeight(resolution) * getCameraIdealAspectRatio(),
      }, // Set ideal width
      aspectRatio: { ideal: getCameraIdealAspectRatio() }, // Use ideal aspect ratio based on screen size
    },
  };
};

export const getResolutionHeight = (resolution: CameraResolution): number => {
  return cameraResolutionMap[resolution].height;
};

export const getCameraIdealAspectRatio = (): number => {
  if (screen.width > screen.height) {
    return screen.width / screen.height; // Landscape
  } else {
    return screen.height / screen.width; // Portrait
  }
};

export const updateCameraSettings = (
  videoElement: HTMLVideoElement,
  resolution: CameraResolution
) => {
  const stream = videoElement.srcObject as MediaStream;
  if (!stream) {
    throw new Error("No video stream found when updating camera settings");
  }
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error(
      "No video track found in the stream when updating camera settings"
    );
  }
  const updatedCameraSettings = buildCameraSettings(resolution);
  videoTrack.applyConstraints(
    updatedCameraSettings.video as MediaTrackConstraints
  );
};
