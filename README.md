# Node.js Twilio and Google Cloud Speech-to-Text Project Setup Guide

## Prerequisites

1. **Install Node.js and npm**:
   Make sure **Node.js** and **npm** are installed on your system. You can download and install them from the [official Node.js website](https://nodejs.org/).

2. **Install Dependencies**:
   This project requires **Express**, **Twilio**, **Google Cloud Speech-to-Text**, and **Google Cloud Text-to-Speech**. You can install them using npm.

   Run the following command to install the dependencies:

   ```bash
   npm install express twilio google-cloud-speech google-cloud-text-to-speech body-parser
   ```

## Testing Gemini AI
1. **Install Dependencies**:
   ```bash
   npm install @google/genai
   node gemini.js
   ```
## How to Setup Google Credentials
1. **Config Folder**:
   In your main project directory, create a config folder and inside that folder put the credentials json file I provided.
2. **.env and .gitignore update**:
   Update .env file to add this line
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials-file.json"
   ```

   Update .gitignore file to add this line
   ```bash
   config/*.json
   ```
3. **Export in Path**:
   In terminal for Mac/Linux run
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/credentials-file.json"
   ```
   On Windows (Command Prompt):
   ```bash
   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\credentials-file.json
   ```

## How to Test Basic Speech-to-Text -> Gemini AI -> Text-to-Speech 
1. If you want to create a new recording and test (Create quicktime audio recording)
   - Save audio recording
   - Then, convert .m4a file to .wav file.
     ```bash
      brew install ffmpeg
      ffmpeg -i <input-file.m4a> <output-file.wav>
      ```
   - Then, move output file to test_files directory
   - In combined_testing.js, change file path to your new .wav audio file path.
   - Then, run
     ```bash
      node combined_testing.js
      ```
   
