import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';

// Initialize the backend
await tf.ready();

let detector: poseDetection.PoseDetector | null = null;

/**
 * Loads the MoveNet pose detection model.
 * MoveNet is a fast and accurate model for real-time pose estimation.
 */
export const loadPoseModel = async (): Promise<poseDetection.PoseDetector> => {
  if (detector) return detector;

  const model = poseDetection.SupportedModels.MoveNet;
  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER, // Thunder is more accurate than Lightning
  };

  detector = await poseDetection.createDetector(model, detectorConfig);
  console.log('Pose Detection Model Loaded');
  return detector;
};

/**
 * Detects poses in a given image (HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement).
 */
export const detectPose = async (imageElement: poseDetection.PoseDetectorInput): Promise<poseDetection.Pose[]> => {
  const model = await loadPoseModel();
  const poses = await model.estimatePoses(imageElement);
  return poses;
};

/**
 * Helper to convert base64 image to HTMLImageElement for processing.
 */
export const base64ToImage = (base64: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = base64;
  });
};
