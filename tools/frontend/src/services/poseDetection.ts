/**
 * WBA99 - ML Pose Detection Service
 * Provides real-time pose detection using TensorFlow.js MoveNet
 * 
 * This module provides two modes:
 * 1. WebView-based: Uses TensorFlow.js in a WebView for pose detection
 * 2. Simulated: Uses physics-based simulation for demo purposes
 */

// MoveNet keypoint indices
export const KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

// Skeleton connections for drawing
export const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],  // Face
  [5, 6],                          // Shoulders
  [5, 7], [7, 9],                  // Left arm
  [6, 8], [8, 10],                 // Right arm
  [5, 11], [6, 12],                // Torso
  [11, 12],                        // Hips
  [11, 13], [13, 15],              // Left leg
  [12, 14], [14, 16],              // Right leg
];

export interface Keypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface PoseResult {
  keypoints: Keypoint[];
  score: number;
  timestamp: number;
}

// Calculate angle between three points
export function calculateAngle(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
): number {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

// Get joint angles from keypoints
export function getJointAngles(keypoints: Keypoint[]): Record<string, number> {
  const angles: Record<string, number> = {};
  
  const getKp = (name: string) => keypoints.find(k => k.name === name);
  
  // Left elbow angle
  const leftShoulder = getKp('left_shoulder');
  const leftElbow = getKp('left_elbow');
  const leftWrist = getKp('left_wrist');
  if (leftShoulder && leftElbow && leftWrist) {
    angles.left_elbow = calculateAngle(leftShoulder, leftElbow, leftWrist);
  }
  
  // Right elbow angle
  const rightShoulder = getKp('right_shoulder');
  const rightElbow = getKp('right_elbow');
  const rightWrist = getKp('right_wrist');
  if (rightShoulder && rightElbow && rightWrist) {
    angles.right_elbow = calculateAngle(rightShoulder, rightElbow, rightWrist);
  }
  
  // Left knee angle
  const leftHip = getKp('left_hip');
  const leftKnee = getKp('left_knee');
  const leftAnkle = getKp('left_ankle');
  if (leftHip && leftKnee && leftAnkle) {
    angles.left_knee = calculateAngle(leftHip, leftKnee, leftAnkle);
  }
  
  // Right knee angle
  const rightHip = getKp('right_hip');
  const rightKnee = getKp('right_knee');
  const rightAnkle = getKp('right_ankle');
  if (rightHip && rightKnee && rightAnkle) {
    angles.right_knee = calculateAngle(rightHip, rightKnee, rightAnkle);
  }
  
  // Left shoulder angle
  const neck = getKp('nose'); // Approximate
  if (leftShoulder && leftElbow && neck) {
    angles.left_shoulder = calculateAngle(neck, leftShoulder, leftElbow);
  }
  
  // Right shoulder angle
  if (rightShoulder && rightElbow && neck) {
    angles.right_shoulder = calculateAngle(neck, rightShoulder, rightElbow);
  }
  
  // Left hip angle
  if (leftShoulder && leftHip && leftKnee) {
    angles.left_hip = calculateAngle(leftShoulder, leftHip, leftKnee);
  }
  
  // Right hip angle
  if (rightShoulder && rightHip && rightKnee) {
    angles.right_hip = calculateAngle(rightShoulder, rightHip, rightKnee);
  }
  
  return angles;
}

// Generate simulated walking/running pose for demo
export function generateSimulatedPose(
  frameNumber: number,
  canvasWidth: number,
  canvasHeight: number,
  poseType: 'standing' | 'walking' | 'running' | 'squat' = 'walking'
): Keypoint[] {
  const centerX = canvasWidth * 0.5;
  const centerY = canvasHeight * 0.5;
  const scale = Math.min(canvasWidth, canvasHeight) * 0.003;
  
  // Animation parameters
  const time = frameNumber * 0.1;
  const walkCycle = Math.sin(time * 2);
  const walkCycleAlt = Math.sin(time * 2 + Math.PI);
  const breathe = Math.sin(time * 0.5) * 2;
  const sway = Math.sin(time * 0.8) * 3;
  
  let keypoints: Keypoint[] = [];
  
  if (poseType === 'walking' || poseType === 'running') {
    const intensity = poseType === 'running' ? 1.5 : 1;
    
    keypoints = [
      // Head
      { name: 'nose', x: centerX + sway, y: centerY - 90 * scale + breathe, score: 0.95 },
      { name: 'left_eye', x: centerX - 8 * scale + sway, y: centerY - 95 * scale + breathe, score: 0.9 },
      { name: 'right_eye', x: centerX + 8 * scale + sway, y: centerY - 95 * scale + breathe, score: 0.9 },
      { name: 'left_ear', x: centerX - 15 * scale + sway, y: centerY - 90 * scale + breathe, score: 0.85 },
      { name: 'right_ear', x: centerX + 15 * scale + sway, y: centerY - 90 * scale + breathe, score: 0.85 },
      
      // Shoulders
      { name: 'left_shoulder', x: centerX - 25 * scale + sway, y: centerY - 60 * scale + breathe, score: 0.95 },
      { name: 'right_shoulder', x: centerX + 25 * scale + sway, y: centerY - 60 * scale + breathe, score: 0.95 },
      
      // Arms (swing opposite to legs)
      { name: 'left_elbow', x: centerX - 30 * scale + walkCycleAlt * 15 * scale * intensity, y: centerY - 30 * scale + Math.abs(walkCycleAlt) * 5, score: 0.9 },
      { name: 'right_elbow', x: centerX + 30 * scale + walkCycle * 15 * scale * intensity, y: centerY - 30 * scale + Math.abs(walkCycle) * 5, score: 0.9 },
      { name: 'left_wrist', x: centerX - 35 * scale + walkCycleAlt * 25 * scale * intensity, y: centerY - 5 * scale + Math.abs(walkCycleAlt) * 10, score: 0.85 },
      { name: 'right_wrist', x: centerX + 35 * scale + walkCycle * 25 * scale * intensity, y: centerY - 5 * scale + Math.abs(walkCycle) * 10, score: 0.85 },
      
      // Hips
      { name: 'left_hip', x: centerX - 15 * scale + sway * 0.5, y: centerY + 10 * scale, score: 0.95 },
      { name: 'right_hip', x: centerX + 15 * scale + sway * 0.5, y: centerY + 10 * scale, score: 0.95 },
      
      // Legs (walking/running motion)
      { name: 'left_knee', x: centerX - 18 * scale + walkCycle * 20 * scale * intensity, y: centerY + 50 * scale - Math.abs(walkCycle) * 15 * intensity, score: 0.9 },
      { name: 'right_knee', x: centerX + 18 * scale + walkCycleAlt * 20 * scale * intensity, y: centerY + 50 * scale - Math.abs(walkCycleAlt) * 15 * intensity, score: 0.9 },
      { name: 'left_ankle', x: centerX - 20 * scale + walkCycle * 30 * scale * intensity, y: centerY + 90 * scale - Math.abs(walkCycle) * 20 * intensity, score: 0.85 },
      { name: 'right_ankle', x: centerX + 20 * scale + walkCycleAlt * 30 * scale * intensity, y: centerY + 90 * scale - Math.abs(walkCycleAlt) * 20 * intensity, score: 0.85 },
    ];
  } else if (poseType === 'squat') {
    const squatDepth = (Math.sin(time * 0.5) + 1) / 2; // 0 to 1
    const kneeSpread = squatDepth * 15;
    const hipDrop = squatDepth * 40;
    
    keypoints = [
      { name: 'nose', x: centerX, y: centerY - 90 * scale + hipDrop * 0.5, score: 0.95 },
      { name: 'left_eye', x: centerX - 8 * scale, y: centerY - 95 * scale + hipDrop * 0.5, score: 0.9 },
      { name: 'right_eye', x: centerX + 8 * scale, y: centerY - 95 * scale + hipDrop * 0.5, score: 0.9 },
      { name: 'left_ear', x: centerX - 15 * scale, y: centerY - 90 * scale + hipDrop * 0.5, score: 0.85 },
      { name: 'right_ear', x: centerX + 15 * scale, y: centerY - 90 * scale + hipDrop * 0.5, score: 0.85 },
      { name: 'left_shoulder', x: centerX - 25 * scale, y: centerY - 60 * scale + hipDrop * 0.3, score: 0.95 },
      { name: 'right_shoulder', x: centerX + 25 * scale, y: centerY - 60 * scale + hipDrop * 0.3, score: 0.95 },
      { name: 'left_elbow', x: centerX - 35 * scale, y: centerY - 30 * scale + hipDrop * 0.2, score: 0.9 },
      { name: 'right_elbow', x: centerX + 35 * scale, y: centerY - 30 * scale + hipDrop * 0.2, score: 0.9 },
      { name: 'left_wrist', x: centerX - 45 * scale, y: centerY - 10 * scale + hipDrop * 0.1, score: 0.85 },
      { name: 'right_wrist', x: centerX + 45 * scale, y: centerY - 10 * scale + hipDrop * 0.1, score: 0.85 },
      { name: 'left_hip', x: centerX - 15 * scale, y: centerY + 10 * scale + hipDrop, score: 0.95 },
      { name: 'right_hip', x: centerX + 15 * scale, y: centerY + 10 * scale + hipDrop, score: 0.95 },
      { name: 'left_knee', x: centerX - 25 * scale - kneeSpread, y: centerY + 50 * scale + hipDrop * 0.3, score: 0.9 },
      { name: 'right_knee', x: centerX + 25 * scale + kneeSpread, y: centerY + 50 * scale + hipDrop * 0.3, score: 0.9 },
      { name: 'left_ankle', x: centerX - 20 * scale, y: centerY + 90 * scale, score: 0.85 },
      { name: 'right_ankle', x: centerX + 20 * scale, y: centerY + 90 * scale, score: 0.85 },
    ];
  } else {
    // Standing pose
    keypoints = [
      { name: 'nose', x: centerX + sway, y: centerY - 90 * scale + breathe, score: 0.95 },
      { name: 'left_eye', x: centerX - 8 * scale + sway, y: centerY - 95 * scale + breathe, score: 0.9 },
      { name: 'right_eye', x: centerX + 8 * scale + sway, y: centerY - 95 * scale + breathe, score: 0.9 },
      { name: 'left_ear', x: centerX - 15 * scale + sway, y: centerY - 90 * scale + breathe, score: 0.85 },
      { name: 'right_ear', x: centerX + 15 * scale + sway, y: centerY - 90 * scale + breathe, score: 0.85 },
      { name: 'left_shoulder', x: centerX - 25 * scale + sway, y: centerY - 60 * scale + breathe, score: 0.95 },
      { name: 'right_shoulder', x: centerX + 25 * scale + sway, y: centerY - 60 * scale + breathe, score: 0.95 },
      { name: 'left_elbow', x: centerX - 30 * scale + sway * 0.5, y: centerY - 30 * scale, score: 0.9 },
      { name: 'right_elbow', x: centerX + 30 * scale + sway * 0.5, y: centerY - 30 * scale, score: 0.9 },
      { name: 'left_wrist', x: centerX - 35 * scale + sway * 0.3, y: centerY - 5 * scale, score: 0.85 },
      { name: 'right_wrist', x: centerX + 35 * scale + sway * 0.3, y: centerY - 5 * scale, score: 0.85 },
      { name: 'left_hip', x: centerX - 15 * scale, y: centerY + 10 * scale, score: 0.95 },
      { name: 'right_hip', x: centerX + 15 * scale, y: centerY + 10 * scale, score: 0.95 },
      { name: 'left_knee', x: centerX - 15 * scale, y: centerY + 50 * scale, score: 0.9 },
      { name: 'right_knee', x: centerX + 15 * scale, y: centerY + 50 * scale, score: 0.9 },
      { name: 'left_ankle', x: centerX - 15 * scale, y: centerY + 90 * scale, score: 0.85 },
      { name: 'right_ankle', x: centerX + 15 * scale, y: centerY + 90 * scale, score: 0.85 },
    ];
  }
  
  return keypoints;
}

// Smooth keypoints using exponential moving average
export function smoothKeypoints(
  currentKeypoints: Keypoint[],
  previousKeypoints: Keypoint[] | null,
  smoothingFactor: number = 0.3
): Keypoint[] {
  if (!previousKeypoints) return currentKeypoints;
  
  return currentKeypoints.map((kp, i) => {
    const prev = previousKeypoints[i];
    if (!prev) return kp;
    
    return {
      ...kp,
      x: kp.x * smoothingFactor + prev.x * (1 - smoothingFactor),
      y: kp.y * smoothingFactor + prev.y * (1 - smoothingFactor),
    };
  });
}

// HTML template for TensorFlow.js WebView pose detection
export const POSE_DETECTION_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js"></script>
  <style>
    body { margin: 0; padding: 0; background: #000; }
    #video { display: none; }
    #canvas { width: 100vw; height: 100vh; object-fit: contain; }
    #status { position: absolute; top: 10px; left: 10px; color: #00ff00; font-family: monospace; }
  </style>
</head>
<body>
  <video id="video" playsinline></video>
  <canvas id="canvas"></canvas>
  <div id="status">Loading MoveNet...</div>
  
  <script>
    let detector = null;
    let video = document.getElementById('video');
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    let status = document.getElementById('status');
    
    async function init() {
      try {
        // Initialize MoveNet
        const model = poseDetection.SupportedModels.MoveNet;
        detector = await poseDetection.createDetector(model, {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        });
        status.textContent = 'MoveNet ready - tap to start camera';
        
        // Notify React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'ready'
        }));
      } catch (error) {
        status.textContent = 'Error: ' + error.message;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    }
    
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        video.srcObject = stream;
        await video.play();
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        status.textContent = 'Detecting poses...';
        detectPose();
      } catch (error) {
        status.textContent = 'Camera error: ' + error.message;
      }
    }
    
    async function detectPose() {
      if (!detector || !video.readyState === 4) {
        requestAnimationFrame(detectPose);
        return;
      }
      
      try {
        const poses = await detector.estimatePoses(video);
        
        // Clear and draw video
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);
        
        if (poses.length > 0) {
          const keypoints = poses[0].keypoints;
          
          // Send keypoints to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pose',
            keypoints: keypoints.map(kp => ({
              name: kp.name,
              x: kp.x / canvas.width,  // Normalize to 0-1
              y: kp.y / canvas.height,
              score: kp.score
            })),
            score: poses[0].score || 0.8
          }));
          
          // Draw skeleton on canvas
          drawSkeleton(keypoints);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
      
      requestAnimationFrame(detectPose);
    }
    
    function drawSkeleton(keypoints) {
      // Draw connections
      const connections = [
        [0, 1], [0, 2], [1, 3], [2, 4],
        [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
        [5, 11], [6, 12], [11, 12],
        [11, 13], [13, 15], [12, 14], [14, 16]
      ];
      
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      
      connections.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1.score > 0.3 && kp2.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(kp1.x, kp1.y);
          ctx.lineTo(kp2.x, kp2.y);
          ctx.stroke();
        }
      });
      
      // Draw keypoints
      keypoints.forEach(kp => {
        if (kp.score > 0.3) {
          ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
    
    // Handle messages from React Native
    window.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.action === 'start') {
        startCamera();
      }
    });
    
    init();
  </script>
</body>
</html>
`;
