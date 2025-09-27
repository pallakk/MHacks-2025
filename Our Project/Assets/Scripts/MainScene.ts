import { DementiaHelperController } from "./DementiaHelperController";

@component
export class MainScene extends BaseScriptComponent {
  @input
  @hint("Main controller for dementia helper")
  controller: DementiaHelperController;

  onAwake() {
    print("Dementia Helper Main Scene initialized");
  }

  onStart() {
    print("Starting Dementia Helper application");
    print("Ready to help patients recognize people");
  }

  // Handle tap events for photo capture
  onTap() {
    if (this.controller) {
      this.controller.capturePhoto();
    }
  }
}
