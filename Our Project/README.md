# Dementia Helper - Face Recognition for Patients

This Project is to help patients with Dementia. 

## How It Works

### Training Phase
- When the program starts, it sends 5 images to Gemini with their names attached in the image
- The system learns to recognize each person's face features
- Training is completed for Person 1, Person 2, and Person 3

### Recognition Phase  
- When you see a face via Lens Studio Editor, there should be a small bubble on top of the person
- The bubble appears only for people the system has been trained to recognize
- Bubbles show confidence levels and are positioned accurately over faces

### Interaction Phase
- When the person clicks on the bubble, a popup appears that displays their name
- The popup shows the recognized person's name clearly
- Popups auto-close after 3 seconds or can be manually closed

## Technical Implementation

### Core Scripts
- **`DementiaHelperAPI.ts`** - Handles Gemini API communication for training and recognition
- **`DementiaHelperController.ts`** - Main controller managing the workflow
- **`FaceBubble.ts`** - Interactive bubble component for face indicators
- **`NamePopup.ts`** - Popup component for displaying names
- **`DepthCache.ts`** - Depth mapping for accurate 3D positioning

### Workflow
1. **Training Mode**: System captures 5 photos per person with names
2. **Recognition Mode**: Continuously scans for faces and shows bubbles
3. **Interaction**: Users tap bubbles to see names

### Features
- **AI-Powered Recognition**: Uses Gemini 2.5 Pro for accurate face recognition
- **3D Positioning**: Bubbles appear precisely over faces in 3D space
- **Confidence Scoring**: Shows recognition confidence levels
- **Intuitive UI**: Simple tap-to-reveal interface
- **Auto-cleanup**: Bubbles and popups manage themselves

## Setup Instructions

1. Open project in Lens Studio
2. Configure Remote Service Gateway API key
3. Build and deploy to Spectacles device
4. Follow on-screen prompts to train on people
5. System automatically switches to recognition mode

## Use Case
Designed specifically for dementia patients who may have difficulty remembering people's names. The system provides gentle, non-intrusive assistance by showing name bubbles that can be tapped for confirmation.

## Prerequisites
- Lens Studio v5.10.0+
- Spectacles OS v5.62+
- Remote Service Gateway API key
- Gemini API access
