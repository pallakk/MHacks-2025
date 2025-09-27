import { Gemini } from "Remote Service Gateway.lspkg/HostedExternal/Gemini";
import { GeminiTypes } from "Remote Service Gateway.lspkg/HostedExternal/GeminiTypes";

const GEMINI_MODEL = "gemini-2.5-pro";

const TRAINING_SYSTEM_MESSAGE =
  "You are an AI assistant helping to train a face recognition system for dementia patients. " +
  "You will receive 5 images of a person with their name. " +
  "Learn to recognize this person's face features and store the information. " +
  "Respond with: 'Training complete for [NAME]. I can now recognize this person.'";

const RECOGNITION_SYSTEM_MESSAGE =
  "You are an AI assistant helping dementia patients recognize people. " +
  "You have been trained on specific people. " +
  "When you see a face, identify if it matches any of the people you've been trained on. " +
  "Return a JSON object with this structure: " +
  "{\n" +
  "  'message': 'Description of what you see',\n" +
  "  'faces_detected': [\n" +
  "    {\n" +
  "      'name': 'Person name if recognized, or null',\n" +
  "      'confidence': 0.0 to 1.0,\n" +
  "      'bounding_box': [x1, y1, x2, y2],\n" +
  "      'is_known': true/false\n" +
  "    }\n" +
  "  ],\n" +
  "  'total_faces': number\n" +
  "}\n" +
  "Only return faces you are confident about. If unsure, set is_known to false.";

@component
export class DementiaHelperAPI extends BaseScriptComponent {
  private trainedPeople: string[] = [];
  private isTrainingMode = true;
  private currentTrainingPerson = "";
  private trainingPhotosRemaining = 0;

  onAwake() {
    print("Dementia Helper API initialized");
    print("Ready to train on people for face recognition");
  }

  // Start training a new person
  startTrainingPerson(personName: string, totalPhotos: number = 5) {
    this.currentTrainingPerson = personName;
    this.trainingPhotosRemaining = totalPhotos;
    this.isTrainingMode = true;
    print(`Starting training for ${personName} with ${totalPhotos} photos`);
  }

  // Send training photo to Gemini
  sendTrainingPhoto(texture: Texture, callback: (response: any) => void) {
    if (!this.isTrainingMode) {
      print("Not in training mode!");
      return;
    }

    Base64.encodeTextureAsync(
      texture,
      (base64String) => {
        this.sendTrainingRequest(base64String, callback);
      },
      () => {
        print("Image encoding failed!");
        callback({
          success: false,
          message: "Image encoding failed",
          photosRemaining: this.trainingPhotosRemaining
        });
      },
      CompressionQuality.HighQuality,
      EncodingType.Png
    );
  }

  // Send recognition request
  sendRecognitionRequest(texture: Texture, callback: (response: any) => void) {
    if (this.isTrainingMode) {
      print("Still in training mode! Complete training first.");
      callback({
        success: false,
        message: "Still in training mode",
        faces_detected: [],
        total_faces: 0
      });
      return;
    }

    Base64.encodeTextureAsync(
      texture,
      (base64String) => {
        this.sendRecognitionToGemini(base64String, callback);
      },
      () => {
        print("Image encoding failed!");
        callback({
          success: false,
          message: "Image encoding failed",
          faces_detected: [],
          total_faces: 0
        });
      },
      CompressionQuality.HighQuality,
      EncodingType.Png
    );
  }

  private sendTrainingRequest(image64: string, callback: (response: any) => void) {
    const reqObj: GeminiTypes.Models.GenerateContentRequest = {
      model: GEMINI_MODEL,
      type: "generateContent",
      body: {
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: image64,
                },
              },
              {
                text: `This is ${this.currentTrainingPerson}. Please learn to recognize this person's face. This is training photo ${6 - this.trainingPhotosRemaining} of 5.`,
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: TRAINING_SYSTEM_MESSAGE,
            },
          ],
        },
        generationConfig: {
          temperature: 0.1,
        },
      },
    };

    Gemini.models(reqObj)
      .then((response) => {
        this.trainingPhotosRemaining--;
        print(`Training photo processed. ${this.trainingPhotosRemaining} photos remaining.`);
        
        if (this.trainingPhotosRemaining <= 0) {
          this.trainedPeople.push(this.currentTrainingPerson);
          this.isTrainingMode = false;
          print(`Training complete for ${this.currentTrainingPerson}!`);
          print(`Trained people: ${this.trainedPeople.join(", ")}`);
        }
        
        callback({
          success: true,
          message: response.candidates[0].content.parts[0].text,
          photosRemaining: this.trainingPhotosRemaining,
          trainingComplete: this.trainingPhotosRemaining <= 0
        });
      })
      .catch((error) => {
        print("Training error: " + error);
        callback({
          success: false,
          message: "Training failed: " + error,
          photosRemaining: this.trainingPhotosRemaining
        });
      });
  }

  private sendRecognitionToGemini(image64: string, callback: (response: any) => void) {
    var respSchema: GeminiTypes.Common.Schema = {
      type: "object",
      properties: {
        message: { type: "string" },
        faces_detected: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              confidence: { type: "number" },
              bounding_box: {
                type: "array",
                items: { type: "number" },
                minItems: 4,
                maxItems: 4
              },
              is_known: { type: "boolean" }
            },
            required: ["name", "confidence", "bounding_box", "is_known"]
          }
        },
        total_faces: { type: "number" }
      },
      required: ["message", "faces_detected", "total_faces"]
    };

    const reqObj: GeminiTypes.Models.GenerateContentRequest = {
      model: GEMINI_MODEL,
      type: "generateContent",
      body: {
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: image64,
                },
              },
              {
                text: "Please identify any faces in this image. Look for the people I've trained you on: " + this.trainedPeople.join(", "),
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: RECOGNITION_SYSTEM_MESSAGE,
            },
          ],
        },
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          response_schema: respSchema,
        },
      },
    };

    Gemini.models(reqObj)
      .then((response) => {
        var responseObj = JSON.parse(
          response.candidates[0].content.parts[0].text
        );
        this.processRecognitionResponse(responseObj, callback);
      })
      .catch((error) => {
        print("Recognition error: " + error);
        callback({
          success: false,
          message: "Recognition failed: " + error,
          faces_detected: [],
          total_faces: 0
        });
      });
  }

  private processRecognitionResponse(responseObj: any, callback: (response: any) => void) {
    let result = {
      success: true,
      message: responseObj.message || "No response",
      faces_detected: [],
      total_faces: responseObj.total_faces || 0
    };

    try {
      var faces = responseObj.faces_detected || [];
      print(`Recognition: Found ${faces.length} faces`);
      
      for (var i = 0; i < faces.length; i++) {
        var face = faces[i];
        result.faces_detected.push({
          name: face.name,
          confidence: face.confidence,
          bounding_box: face.bounding_box,
          is_known: face.is_known
        });
        
        if (face.is_known) {
          print(`Recognized: ${face.name} (confidence: ${face.confidence})`);
        } else {
          print("Unknown face detected");
        }
      }
    } catch (error) {
      print("Error processing recognition: " + error);
      result.success = false;
    }
    
    callback(result);
  }

  // Get list of trained people
  getTrainedPeople(): string[] {
    return [...this.trainedPeople];
  }

  // Check if training is complete
  isTrainingComplete(): boolean {
    return !this.isTrainingMode && this.trainedPeople.length > 0;
  }

  // Reset training
  resetTraining() {
    this.trainedPeople = [];
    this.isTrainingMode = true;
    this.currentTrainingPerson = "";
    this.trainingPhotosRemaining = 0;
    print("Training reset");
  }
}
