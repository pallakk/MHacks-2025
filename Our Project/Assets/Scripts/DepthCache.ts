@component
export class DepthCache extends BaseScriptComponent {
  @input
  @hint("Camera component for capturing images")
  camera: Camera;

  private depthFrames: Map<number, any> = new Map();
  private cameraFrames: Map<number, Texture> = new Map();
  private nextFrameID = 1;

  onAwake() {
    print("Depth Cache initialized");
  }

  saveDepthFrame(): number {
    let frameID = this.nextFrameID++;
    
    // Capture camera image
    if (this.camera) {
      let cameraTexture = this.camera.getTexture();
      if (cameraTexture) {
        this.cameraFrames.set(frameID, cameraTexture);
        print(`Saved depth frame ${frameID}`);
      } else {
        print("No camera texture available");
      }
    } else {
      print("No camera component assigned");
    }
    
    // In a real implementation, this would also save depth data
    this.depthFrames.set(frameID, {
      timestamp: Date.now(),
      depthData: null // Would contain actual depth data
    });
    
    return frameID;
  }

  getCamImageWithID(frameID: number): Texture | null {
    return this.cameraFrames.get(frameID) || null;
  }

  getWorldPositionWithID(pixelPos: vec2, frameID: number): vec3 | null {
    // In a real implementation, this would convert pixel coordinates to world space
    // using the cached depth data
    // For now, we'll return a simulated world position
    let depthFrame = this.depthFrames.get(frameID);
    if (!depthFrame) {
      return null;
    }
    
    // Simulate world position conversion
    // In reality, this would use depth data to calculate 3D position
    let worldPos = new vec3(
      (pixelPos.x - 0.5) * 2.0, // Convert to world coordinates
      (pixelPos.y - 0.5) * 2.0,
      1.0 // Fixed depth for simulation
    );
    
    return worldPos;
  }

  disposeDepthFrame(frameID: number) {
    this.depthFrames.delete(frameID);
    this.cameraFrames.delete(frameID);
    print(`Disposed depth frame ${frameID}`);
  }

  // Get all saved frame IDs
  getSavedFrameIDs(): number[] {
    return Array.from(this.depthFrames.keys());
  }

  // Clear all cached frames
  clearAllFrames() {
    this.depthFrames.clear();
    this.cameraFrames.clear();
    this.nextFrameID = 1;
    print("Cleared all depth frames");
  }
}
