@component
export class NamePopup extends BaseScriptComponent {
  @input
  @hint("Person name to display")
  personName: string = "";

  onAwake() {
    print("Name Popup initialized");
  }

  onStart() {
    this.animatePopup();
  }

  onTap() {
    print(`Popup tapped for ${this.personName}`);
    // Close the popup
    this.getTransform().getGameObject().destroy();
  }

  private animatePopup() {
    // Fade in animation
    let scale = this.getTransform().getLocalScale();
    this.getTransform().setLocalScale(scale.uniformScale(0.1));
    
    // Animate to full size
    this.getTransform().setLocalScale(scale);
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      this.getTransform().getGameObject().destroy();
    }, 3000);
  }
}
