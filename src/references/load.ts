import references from "./references.json";
import cv from "@techstark/opencv-js";

export interface ReferenceImage {
  name: string;
  matGray: InstanceType<typeof cv.Mat>;
  keypoints: InstanceType<typeof cv.KeyPointVector>;
  descriptors: InstanceType<typeof cv.Mat>;
  originalWidth: number; // must match the actual pixel width on disk
  originalHeight: number; // must match the actual pixel height on disk
}

export const loadReferenceImages = async (orb: InstanceType<typeof cv.ORB>) => {
  const processedReferences: ReferenceImage[] = [];

  for (const ref of references) {
    const img = new Image();
    img.src = ref.url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => {
        throw new Error(`Failed to load reference image: ${ref.name}`);
      };
    });

    // Read the image into a Mat
    const matOriginal = cv.imread(img);
    const matGray = new cv.Mat();
    cv.cvtColor(matOriginal, matGray, cv.COLOR_RGBA2GRAY);
    matOriginal.delete();

    // Detect ORB keypoints + descriptors
    const mask = new cv.Mat();
    const keypoints = new cv.KeyPointVector();
    const descriptors = new cv.Mat();
    orb.detectAndCompute(matGray, new cv.Mat(), keypoints, descriptors);
    mask.delete();

    const nRefKP = keypoints.size();
    if (nRefKP < 20) {
      console.warn(
        `"${ref.name}" has only ${nRefKP} keypoints. Consider richer detail or more ORB features.`
      );
    }

    processedReferences.push({
      name: ref.name,
      matGray,
      keypoints,
      descriptors,
      originalWidth: img.width, // matches the offline resized dimensions
      originalHeight: img.height, // matches the offline resized dimensions
    });
  }

  return processedReferences;
};
