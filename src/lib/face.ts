// Face recognition helpers using face-api.js (browser-side)
import * as faceapi from "face-api.js";

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();
  return loadingPromise;
}

export const detectorOptions = () =>
  new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

export async function getFaceDescriptor(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
) {
  const result = await faceapi
    .detectSingleFace(input, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ?? null;
}

export async function getAllFaceDescriptors(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
) {
  return faceapi
    .detectAllFaces(input, detectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();
}

export type KnownFace = {
  pessoaId: number;
  nome: string;
  descriptor: Float32Array;
};

export function bestMatch(
  query: Float32Array,
  known: KnownFace[],
  threshold = 0.55,
): { match: KnownFace | null; distance: number; confidence: number } {
  if (known.length === 0) return { match: null, distance: 1, confidence: 0 };
  let best = known[0];
  let bestDist = faceapi.euclideanDistance(query, known[0].descriptor);
  for (let i = 1; i < known.length; i++) {
    const d = faceapi.euclideanDistance(query, known[i].descriptor);
    if (d < bestDist) {
      bestDist = d;
      best = known[i];
    }
  }
  // Convert distance (0..1+) to a confidence percentage
  const confidence = Math.max(0, Math.min(1, 1 - bestDist));
  return {
    match: bestDist <= threshold ? best : null,
    distance: bestDist,
    confidence,
  };
}

export function descriptorToArray(d: Float32Array): number[] {
  return Array.from(d);
}

export function arrayToDescriptor(a: unknown): Float32Array {
  return new Float32Array(a as number[]);
}
