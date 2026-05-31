import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type { NormalizedLandmark };

export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
} as const;

const WASM_URL  = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Minimum ms between detections (~30 fps cap so GPU isn't hammered)
const DETECT_INTERVAL_MS = 33;

export class PoseEngine {
  private landmarker!: PoseLandmarker;
  video!: HTMLVideoElement;
  private lastDetectTs = 0;
  landmarks: NormalizedLandmark[] = [];
  ready = false;

  async init(): Promise<HTMLVideoElement> {
    const video = document.createElement("video");
    video.playsInline = true;
    video.autoplay    = true;
    video.muted       = true;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;

    // Wait for metadata + first frame
    await new Promise<void>((res) => {
      video.onloadedmetadata = () => video.play().then(() => res()).catch(() => res());
    });
    // Extra safety: wait for actual pixel data
    await new Promise<void>((res) => {
      if (video.readyState >= 2) { res(); return; }
      video.onloadeddata = () => res();
    });

    this.video = video;

    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.ready = true;
    return video;
  }

  detect() {
    if (!this.ready) return;
    if (!this.video || this.video.readyState < 2 || this.video.paused) return;

    const now = performance.now();
    // Time-based throttle — avoids the currentTime-same-frame trap on webcam streams
    if (now - this.lastDetectTs < DETECT_INTERVAL_MS) return;
    this.lastDetectTs = now;

    try {
      const result = this.landmarker.detectForVideo(this.video, now);
      if (result.landmarks[0]) {
        this.landmarks = result.landmarks[0];
      }
    } catch {
      // Silently skip frame on transient GPU / timing errors
    }
  }

  /** Raw landmark (original frame coords, y↓ increases downward) */
  get(idx: number): NormalizedLandmark {
    return this.landmarks[idx] ?? { x: 0.5, y: 0.5, z: 0, visibility: 0 };
  }

  /** Mirrored x — use when canvas draws the video flipped horizontally */
  mx(idx: number) { return 1 - this.get(idx).x; }

  /** Mirrored midpoint of two landmarks */
  mid(a: number, b: number) {
    return {
      x: (this.mx(a) + this.mx(b)) / 2,
      y: (this.get(a).y + this.get(b).y) / 2,
    };
  }

  isVisible(idx: number, threshold = 0.4): boolean {
    return (this.get(idx).visibility ?? 0) > threshold;
  }
}
