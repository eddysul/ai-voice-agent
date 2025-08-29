# 🤖 AI Voice Agent

A voice-driven AI assistant that can handle phone calls, transcribe speech, generate AI-powered replies, and respond back via text-to-speech.

---

## 🔹 Overview

The AI Voice Agent captures incoming phone calls using **Twilio**, converts speech to text via **Google Speech-to-Text**, generates conversational replies using **Gemini API**, and converts the replies back to speech to play to the caller.  

This project demonstrates a scalable voice interaction system that integrates multiple APIs and real-time processing for seamless AI-driven conversations.

---

## ⚙️ Key Features

- **Voice Capture & Webhook Routing:** Receive and manage incoming calls using Twilio webhooks.
- **Speech-to-Text Conversion:** Transcribe spoken input in real-time with Google Speech-to-Text API.
- **AI Conversational Response:** Generate intelligent, context-aware replies using Gemini API.
- **Text-to-Speech Playback:** Respond back to the caller with natural-sounding audio.
- **Local Development:** Uses **ngrok** for exposing local server endpoints to Twilio during development.

---

## 🛠 Technology Stack

- **Backend:** Node.js, Express
- **APIs:** Twilio, Gemini, Google Speech-to-Text, Text-to-Speech
- **Development Tools:** ngrok for local webhook testing

---

## 🎯 How It Works

1. Caller dials the Twilio number.
2. Twilio sends call audio to the backend via webhook.
3. Audio is transcribed into text.
4. Transcribed text is sent to Gemini API to generate a response.
5. Response text is converted to speech and played back to the caller.

---


---
