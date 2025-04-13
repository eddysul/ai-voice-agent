import speech_recognition as sr
from gtts import gTTS
from playsound import playsound
import google.generativeai as genai
import os

# 🧠 Configure Gemini API
genai.configure(api_key="YOUR_GEMINI_API_KEY")  # 🔐 Replace with your actual Gemini API key
model = genai.GenerativeModel('gemini-pro')

# 🎤 Function to listen to user's voice input
def listen():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("\n🎙️ Listening...")
        recognizer.adjust_for_ambient_noise(source)
        audio = recognizer.listen(source)
    try:
        text = recognizer.recognize_google(audio)
        print(f"🗣️ You said: {text}")
        return text
    except sr.UnknownValueError:
        print("❗ Sorry, I didn't catch that.")
        return ""
    except sr.RequestError:
        print("❗ STT request failed.")
        return ""

# 🧠 Function to get response from Gemini
def ask_gemini(prompt):
    response = model.generate_content(prompt)
    return response.text.strip()

# 🔊 Function to speak using gTTS
def speak(text):
    print("🤖 Gemini:", text)
    tts = gTTS(text)
    filename = "response.mp3"
    tts.save(filename)
    playsound(filename)
    os.remove(filename)

# 🚀 Start conversation
speak("Hi! How are you today?")

while True:
    user_input = listen().lower().strip()
    
    # 🚪 Exit conditions
    if user_input in ["bye", "exit", "stop"]:
        speak("Thank you for calling. Goodbye!")
        break

    # 🔁 Retry on empty input
    if not user_input:
        speak("Sorry, I didn't catch that. Could you say it again?")
        continue

    # 🤖 Get response from Gemini
    gemini_reply = ask_gemini(user_input)

    # 🔊 Speak out the Gemini response
    speak(gemini_reply)
