import { DementiaHelperAPI } from "./DementiaHelperAPI";
import { DepthCache } from "./DepthCache";

@component
export class DementiaHelperController extends BaseScriptComponent {
  @input
  @hint("Dementia Helper API")
  dementiaAPI: DementiaHelperAPI;
  
  @input
  @hint("Depth cache for world positioning")
  depthCache: DepthCache;
  
  @input
  @hint("Camera component")
  camera: Camera;
  
  @input
  @hint("UI text for displaying status")
  statusText: Text;
  
  @input
  @hint("Bubble prefab for face indicators")
  faceBubblePrefab: Prefab;
  
  @input
  @hint("Popup prefab for name display")
  namePopupPrefab: Prefab;

  private isTrainingMode = true;
  private currentTrainingPerson = "";
  private trainingPhotosRemaining = 0;
  private peopleToTrain = ["Person 1", "Person 2", "Person 3"];
  private currentPersonIndex = 0;
  private activeBubbles: GameObject[] = [];
  private activePopups: GameObject[] = [];
  private recognitionTimer = 0;
  private recognitionInterval = 3.0; // Check every 3 seconds

  onAwake() {
    print("Dementia Helper Controller initialized");
  }

  onStart() {
    this.startTraining();
  }

  onUpdate() {
    if (!this.isTrainingMode) {
      // Recognition mode - check for faces periodically
      this.recognitionTimer += getDeltaTime();
      if (this.recognitionTimer >= this.recognitionInterval) {
        this.recognitionTimer = 0;
        this.captureRecognitionPhoto();
      }
    }
  }

  private startTraining() {
    if (this.currentPersonIndex >= this.peopleToTrain.length) {
      this.startRecognitionMode();
      return;
    }

    this.currentTrainingPerson = this.peopleToTrain[this.currentPersonIndex];
    this.trainingPhotosRemaining = 5;
    this.dementiaAPI.startTrainingPerson(this.currentTrainingPerson, 5);
    
    this.updateStatusText(`Training ${this.currentTrainingPerson} - Photo ${6 - this.trainingPhotosRemaining}/5`);
    print(`Starting training for ${this.currentTrainingPerson}`);
  }

  private updateStatusText(message: string) {
    if (this.statusText) {
      this.statusText.text = message;
    }
  }

  // Called when user taps to capture photo
  public capturePhoto() {
    if (this.isTrainingMode) {
      this.captureTrainingPhoto();
    }
  }

  private captureTrainingPhoto() {
    if (this.trainingPhotosRemaining <= 0) {
      print("Training photos complete for this person");
      return;
    }

    print(`Capturing training photo for ${this.currentTrainingPerson}`);
    
    // Save depth frame
    let depthFrameID = this.depthCache.saveDepthFrame();
    let camImage = this.depthCache.getCamImageWithID(depthFrameID);

    if (!camImage) {
      print("No camera image available");
      return;
    }

    // Send to API
    this.dementiaAPI.sendTrainingPhoto(camImage, (response) => {
      this.handleTrainingResponse(response, depthFrameID);
    });
  }

  private handleTrainingResponse(response: any, depthFrameID: number) {
    this.depthCache.disposeDepthFrame(depthFrameID);
    
    if (response.success) {
      this.trainingPhotosRemaining = response.photosRemaining;
      
      if (response.trainingComplete) {
        print(`Training complete for ${this.currentTrainingPerson}!`);
        this.currentPersonIndex++;
        
        if (this.currentPersonIndex < this.peopleToTrain.length) {
          this.updateStatusText(`Training complete! Starting next person...`);
          setTimeout(() => {
            this.startTraining();
          }, 2000);
        } else {
          this.startRecognitionMode();
        }
      } else {
        this.updateStatusText(`${this.currentTrainingPerson} - Photo ${6 - this.trainingPhotosRemaining}/5`);
      }
    } else {
      print("Training failed: " + response.message);
      this.updateStatusText("Training failed. Try again.");
    }
  }

  private startRecognitionMode() {
    this.isTrainingMode = false;
    this.updateStatusText("Training complete! Now recognizing faces...");
    print("Switching to recognition mode");
  }

  private captureRecognitionPhoto() {
    let depthFrameID = this.depthCache.saveDepthFrame();
    let camImage = this.depthCache.getCamImageWithID(depthFrameID);

    if (!camImage) {
      return;
    }

    this.dementiaAPI.sendRecognitionRequest(camImage, (response) => {
      this.handleRecognitionResponse(response, depthFrameID, camImage);
    });
  }

  private handleRecognitionResponse(response: any, depthFrameID: number, camImage: Texture) {
    this.depthCache.disposeDepthFrame(depthFrameID);
    
    if (response.success) {
      this.clearActiveBubbles();
      
      for (let i = 0; i < response.faces_detected.length; i++) {
        let face = response.faces_detected[i];
        
        if (face.is_known) {
          this.createFaceBubble(face, camImage, depthFrameID);
        }
      }
    }
  }

  private createFaceBubble(face: any, camImage: Texture, depthFrameID: number) {
    if (!this.faceBubblePrefab) return;

    // Convert bounding box to world position
    let centerPoint = this.boundingBoxToPixels(
      face.bounding_box,
      camImage.getWidth(),
      camImage.getHeight()
    );
    
    let worldPosition = this.depthCache.getWorldPositionWithID(centerPoint, depthFrameID);
    
    if (worldPosition) {
      // Create bubble at world position
      let bubble = this.faceBubblePrefab.instantiate(this.getTransform());
      bubble.setWorldPosition(worldPosition);
      
      // Add click handler
      this.addBubbleClickHandler(bubble, face.name);
      
      this.activeBubbles.push(bubble);
      print(`Created bubble for ${face.name} at confidence ${face.confidence}`);
    }
  }

  private addBubbleClickHandler(bubble: GameObject, personName: string) {
    // Add a script component to handle clicks
    let clickHandler = bubble.addComponent("ScriptComponent");
    clickHandler.createEvent("TapEvent").bind(() => {
      this.showNamePopup(personName);
    });
  }

  private showNamePopup(personName: string) {
    if (!this.namePopupPrefab) return;

    // Create popup
    let popup = this.namePopupPrefab.instantiate(this.getTransform());
    
    // Position in front of camera
    let cameraPos = this.camera.getTransform().getWorldPosition();
    let cameraForward = this.camera.getTransform().forward;
    popup.setWorldPosition(cameraPos.add(cameraForward.uniformScale(2)));
    
    // Set name text
    let textComponent = popup.getComponent("Text");
    if (textComponent) {
      textComponent.text = personName;
    }
    
    this.activePopups.push(popup);
    print(`Showing popup for ${personName}`);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      this.closePopup(popup);
    }, 3000);
  }

  private closePopup(popup: GameObject) {
    let index = this.activePopups.indexOf(popup);
    if (index > -1) {
      this.activePopups.splice(index, 1);
    }
    popup.destroy();
  }

  private clearActiveBubbles() {
    this.activeBubbles.forEach(bubble => bubble.destroy());
    this.activeBubbles = [];
  }

  private boundingBoxToPixels(
    boxPoints: any,
    width: number,
    height: number
  ): vec2 {
    var x1 = MathUtils.remap(boxPoints[0], 0, 1000, 0, width);
    var y1 = MathUtils.remap(boxPoints[1], 0, 1000, height, 0);
    var topLeft = new vec2(x1, height - y1);
    
    var x2 = MathUtils.remap(boxPoints[2], 0, 1000, 0, width);
    var y2 = MathUtils.remap(boxPoints[3], 0, 1000, height, 0);
    var bottomRight = new vec2(x2, height - y2);
    
    var center = topLeft.add(bottomRight).uniformScale(0.5);
    return center;
  }

  // Public methods for external control
  public isInTrainingMode(): boolean {
    return this.isTrainingMode;
  }

  public getCurrentTrainingPerson(): string {
    return this.currentTrainingPerson;
  }

  public getTrainingProgress(): { person: string, photosRemaining: number } {
    return {
      person: this.currentTrainingPerson,
      photosRemaining: this.trainingPhotosRemaining
    };
  }
}
