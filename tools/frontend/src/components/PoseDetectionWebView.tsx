/**
 * WBA99 - Real-Time Pose Detection WebView Component
 * Uses TensorFlow.js MoveNet for accurate skeleton tracking
 */

import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface PoseResult {
  keypoints: PoseKeypoint[];
  score: number;
}

export type MoveNetModelType = 'lightning' | 'thunder';

interface PoseDetectionWebViewProps {
  videoUri?: string;
  onPoseDetected?: (pose: PoseResult) => void;
  onError?: (error: string) => void;
  onReady?: () => void;
  width?: number;
  height?: number;
  modelType?: MoveNetModelType; // 'lightning' (fast) or 'thunder' (accurate)
}

export interface PoseDetectionRef {
  startDetection: () => void;
  stopDetection: () => void;
  captureFrame: () => void;
}

// MoveNet keypoint names in order
const KEYPOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

// HTML template with TensorFlow.js MoveNet
const getPoseDetectionHTML = (videoUri: string, modelType: MoveNetModelType = 'thunder') => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: #0a0a0a; 
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100vw;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #container { 
      position: relative; 
      width: 100%; 
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }
    #videoWrapper {
      position: relative;
      display: inline-block;
      max-width: 100%;
      max-height: 100%;
    }
    #video { 
      display: block;
      max-width: 100vw;
      max-height: 70vh;
      object-fit: contain;
    }
    #canvas { 
      position: absolute; 
      top: 0; 
      left: 0; 
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    #status {
      position: fixed;
      top: 10px;
      left: 10px;
      color: #00ff00;
      font-family: monospace;
      font-size: 11px;
      z-index: 100;
      background: rgba(0,0,0,0.8);
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid #00ff0040;
    }
    #loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #00D9FF;
      font-size: 14px;
      text-align: center;
      z-index: 200;
    }
    #uploadArea {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 150;
      padding: 30px;
      background: linear-gradient(135deg, rgba(0,217,255,0.1), rgba(57,255,20,0.1));
      border: 2px dashed #00D9FF;
      border-radius: 16px;
      cursor: pointer;
    }
    #uploadArea h3 {
      color: #00D9FF;
      margin-bottom: 10px;
      font-weight: 600;
    }
    #uploadArea p {
      color: #888;
      font-size: 12px;
    }
    #uploadArea.hidden { display: none; }
    #fileInput { display: none; }
    .controls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
      z-index: 100;
    }
    .control-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 2px solid #00D9FF;
      background: rgba(0,0,0,0.8);
      color: #00D9FF;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .control-btn:active {
      background: #00D9FF;
      color: #000;
    }
    .model-badge {
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${modelType === 'thunder' ? '#8B5CF6' : '#FBBF24'};
      color: #000;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      z-index: 100;
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="videoWrapper">
      <video id="video" playsinline muted loop></video>
      <canvas id="canvas"></canvas>
    </div>
  </div>
  
  <div id="uploadArea">
    <h3>📹 Upload Video</h3>
    <p>Tap to select a video file</p>
    <input type="file" id="fileInput" accept="video/*">
  </div>
  
  <div id="status">Initializing...</div>
  <div id="loading">Loading AI Model...</div>
  <div class="model-badge">${modelType.toUpperCase()}</div>
  
  <div class="controls" style="display: none;" id="controlButtons">
    <button class="control-btn" id="playBtn">▶</button>
    <button class="control-btn" id="restartBtn">↺</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js"></script>
  
  <script>
    const MODEL_TYPE = '${modelType}';
    const KEYPOINT_NAMES = [
      'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
      'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
      'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
    ];

    const SKELETON_CONNECTIONS = [
      [0, 1], [0, 2], [1, 3], [2, 4],
      [5, 6],
      [5, 7], [7, 9],
      [6, 8], [8, 10],
      [5, 11], [6, 12],
      [11, 12],
      [11, 13], [13, 15],
      [12, 14], [14, 16]
    ];

    const JOINT_ANGLES = [
      { name: 'L.Shoulder', indices: [7, 5, 6], color: '#00D9FF' },
      { name: 'R.Shoulder', indices: [8, 6, 5], color: '#00D9FF' },
      { name: 'L.Elbow', indices: [9, 7, 5], color: '#06B6D4' },
      { name: 'R.Elbow', indices: [10, 8, 6], color: '#06B6D4' },
      { name: 'L.Hip', indices: [13, 11, 5], color: '#FBBF24' },
      { name: 'R.Hip', indices: [14, 12, 6], color: '#FBBF24' },
      { name: 'L.Knee', indices: [15, 13, 11], color: '#EF4444' },
      { name: 'R.Knee', indices: [16, 14, 12], color: '#A855F7' }
    ];

    let detector = null;
    let video = document.getElementById('video');
    let canvas = document.getElementById('canvas');
    let videoWrapper = document.getElementById('videoWrapper');
    let ctx = canvas.getContext('2d');
    let status = document.getElementById('status');
    let loading = document.getElementById('loading');
    let uploadArea = document.getElementById('uploadArea');
    let fileInput = document.getElementById('fileInput');
    let controlButtons = document.getElementById('controlButtons');
    let playBtn = document.getElementById('playBtn');
    let restartBtn = document.getElementById('restartBtn');
    
    let isDetecting = false;
    let frameCount = 0;
    let lastTime = Date.now();
    let fps = 0;
    let displayWidth = 0;
    let displayHeight = 0;
    let videoWidth = 0;
    let videoHeight = 0;

    function calculateAngle(p1, p2, p3) {
      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      if (mag1 === 0 || mag2 === 0) return 0;
      const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      return Math.round(Math.acos(cos) * 180 / Math.PI);
    }
    
    function updateCanvasSize() {
      const rect = video.getBoundingClientRect();
      displayWidth = rect.width;
      displayHeight = rect.height;
      videoWidth = video.videoWidth;
      videoHeight = video.videoHeight;
      
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
    }
    
    function scaleKeypoint(kp) {
      const scaleX = displayWidth / videoWidth;
      const scaleY = displayHeight / videoHeight;
      return {
        ...kp,
        x: kp.x * scaleX,
        y: kp.y * scaleY
      };
    }

    // File upload handler
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        video.src = url;
        uploadArea.classList.add('hidden');
        status.textContent = 'Loading video...';
      }
    });

    // Play/Pause button
    playBtn.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        isDetecting = true;
        playBtn.textContent = '⏸';
        detectPose();
      } else {
        video.pause();
        isDetecting = false;
        playBtn.textContent = '▶';
      }
    });

    // Restart button
    restartBtn.addEventListener('click', () => {
      video.currentTime = 0;
      video.play();
      isDetecting = true;
      playBtn.textContent = '⏸';
    });

    async function init() {
      try {
        status.textContent = 'Loading TensorFlow.js...';
        await tf.ready();
        await tf.setBackend('webgl');
        
        const selectedModel = MODEL_TYPE === 'thunder' 
          ? poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
          : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
        
        const modelName = MODEL_TYPE === 'thunder' ? 'Thunder' : 'Lightning';
        status.textContent = 'Loading MoveNet ' + modelName + '...';
        
        detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { 
            modelType: selectedModel,
            enableSmoothing: true,
            minPoseScore: MODEL_TYPE === 'thunder' ? 0.2 : 0.25
          }
        );
        
        loading.style.display = 'none';
        status.textContent = 'Ready! Upload a video to begin.';
        
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'modelReady',
          model: MODEL_TYPE
        }));
        
        video.onloadedmetadata = () => {
          setTimeout(() => {
            updateCanvasSize();
            controlButtons.style.display = 'flex';
            status.textContent = 'Video ready. Tap ▶ to play.';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ready',
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight
            }));
          }, 100);
        };
        
        video.onplay = () => {
          isDetecting = true;
          playBtn.textContent = '⏸';
          detectPose();
        };
        
        video.onpause = () => {
          isDetecting = false;
          playBtn.textContent = '▶';
        };
        
        video.onerror = (e) => {
          status.textContent = 'Video error - try another file';
        };
        
        window.addEventListener('resize', () => {
          if (video.videoWidth > 0) updateCanvasSize();
        });
        
      } catch (error) {
        status.textContent = 'Error: ' + error.message;
        console.error(error);
      }
    }

    async function detectPose() {
      if (!detector || !isDetecting || video.paused) {
        if (isDetecting) requestAnimationFrame(detectPose);
        return;
      }

      try {
        if (displayWidth === 0) updateCanvasSize();
        
        const poses = await detector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (poses.length > 0 && poses[0].keypoints) {
          const scaledKeypoints = poses[0].keypoints.map(kp => scaleKeypoint(kp));
          
          drawSkeleton(scaledKeypoints);
          drawAngles(scaledKeypoints);
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'pose',
            keypoints: scaledKeypoints.map(kp => ({
              name: kp.name,
              x: kp.x,
              y: kp.y,
              score: kp.score
            })),
            score: poses[0].score || 0.9
          }));
        }
        
        frameCount++;
        const now = Date.now();
        if (now - lastTime >= 1000) {
          fps = frameCount;
          frameCount = 0;
          lastTime = now;
        }
        status.textContent = 'Tracking... ' + fps + ' FPS';
        
      } catch (error) {
        console.error('Detection error:', error);
      }
      
      requestAnimationFrame(detectPose);
    }

    function drawSkeleton(keypoints) {
      ctx.strokeStyle = '#39FF14';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#39FF14';
      ctx.shadowBlur = 15;
      
      SKELETON_CONNECTIONS.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1.score > 0.3 && kp2.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(kp1.x, kp1.y);
          ctx.lineTo(kp2.x, kp2.y);
          ctx.stroke();
        }
      });
      
      ctx.shadowBlur = 0;
      keypoints.forEach((kp, i) => {
        if (kp.score > 0.3) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = getKeypointColor(i);
          ctx.globalAlpha = 0.3;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.globalAlpha = 1;
          ctx.fillStyle = getKeypointColor(i);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    function getKeypointColor(index) {
      if (index <= 4) return '#00D9FF';
      if (index <= 10) return '#39FF14';
      return '#FBBF24';
    }

    function drawAngles(keypoints) {
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      
      JOINT_ANGLES.forEach(joint => {
        const [a, b, c] = joint.indices;
        const p1 = keypoints[a];
        const p2 = keypoints[b];
        const p3 = keypoints[c];
        
        if (p1.score > 0.3 && p2.score > 0.3 && p3.score > 0.3) {
          const angle = calculateAngle(p1, p2, p3);
          
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(p2.x - 25, p2.y - 28, 50, 18);
          
          ctx.fillStyle = joint.color;
          ctx.fillText(angle + '°', p2.x, p2.y - 15);
        }
      });
    }

    init();
  </script>
</body>
</html>
`;
const PoseDetectionWebView = forwardRef<PoseDetectionRef, PoseDetectionWebViewProps>(
  ({ videoUri, onPoseDetected, onError, onReady, width, height, modelType = 'thunder' }, ref) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      startDetection: () => {
        webViewRef.current?.postMessage(JSON.stringify({ action: 'start' }));
      },
      stopDetection: () => {
        webViewRef.current?.postMessage(JSON.stringify({ action: 'stop' }));
      },
      captureFrame: () => {
        webViewRef.current?.postMessage(JSON.stringify({ action: 'capture' }));
      },
    }));

    const handleMessage = useCallback((event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        
        if (data.type === 'ready') {
          onReady?.();
        } else if (data.type === 'pose') {
          // Map keypoints to our format
          const mappedKeypoints: PoseKeypoint[] = data.keypoints.map((kp: any) => ({
            name: kp.name,
            x: kp.x,
            y: kp.y,
            score: kp.score,
          }));
          
          onPoseDetected?.({
            keypoints: mappedKeypoints,
            score: data.score,
          });
        } else if (data.type === 'error') {
          onError?.(data.message);
        }
      } catch (e) {
        console.error('WebView message error:', e);
      }
    }, [onPoseDetected, onError, onReady]);

    if (!videoUri) {
      return null;
    }

    return (
      <View style={[styles.container, { width: width || SCREEN_WIDTH, height: height || 400 }]}>
        <WebView
          ref={webViewRef}
          source={{ html: getPoseDetectionHTML(videoUri, modelType) }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default PoseDetectionWebView;
