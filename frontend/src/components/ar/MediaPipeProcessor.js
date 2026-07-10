/**
 * Wrapper for MediaPipe Pose Engine
 */
export class MediaPipeProcessor {
  constructor(onResultsCallback) {
    if (!window.Pose) {
      console.error('MediaPipe Pose library is not available globally.');
      return;
    }

    this.pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.pose.onResults(onResultsCallback);
  }

  async send(videoElement) {
    if (this.pose && videoElement) {
      try {
        await this.pose.send({ image: videoElement });
      } catch (err) {
        console.error('Failed to send frame to MediaPipe Pose:', err);
      }
    }
  }

  close() {
    if (this.pose) {
      try {
        this.pose.close();
      } catch (e) {
        console.warn('Error closing MediaPipe Pose instance:', e);
      }
      this.pose = null;
    }
  }
}
