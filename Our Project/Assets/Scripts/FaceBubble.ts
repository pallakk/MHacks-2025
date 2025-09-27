@component
export class FaceBubble extends BaseScriptComponent {
  @input
  @hint("Person name to display")
  personName: string = "";

  @input
  @hint("Confidence level")
  confidence: number = 0.0;

  onAwake() {
    print("Face Bubble initialized");
  }

  onStart() {
    this.animateBubble();
  }

  onTap() {
    print(`Bubble tapped for ${this.personName}`);
    // The click will be handled by the controller
  }

  // Animate the bubble
  private animateBubble() {
    // Simple pulsing animation
    let scale = this.getTransform().getLocalScale();
    this.getTransform().setLocalScale(scale.uniformScale(0.8));
    
    // Animate to full size
    this.getTransform().setLocalScale(scale);
  }
}
