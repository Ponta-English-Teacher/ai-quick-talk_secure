
let soundEnabled = true;
let selectedPlace = "";
let selectedGoal = "";
let currentGoals = [];
let currentDialogue = [];
let placePage = 0;
let goalPage = 0;
let currentAudio = null;
let isPlayingWhole = false;
let currentDialogueIndex = 0;

// Device Detection
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

window.onload = () => {
  init();
  displayPlaces();
};

function init() {
  document.getElementById("toggleSound").onclick = toggleSound;
  document.getElementById("backToSetup").onclick = backToSetup;

  if (isMobile) {
    document.getElementById("playAll").style.display = "none";
    addPlayNextLineButton();
  } else {
    document.getElementById("playAll").onclick = playWholeDialogue;
  }

  document.getElementById("morePlaces").onclick = showMorePlaces;
  document.getElementById("prevPlaces").onclick = showPreviousPlaces;
  document.getElementById("moreGoals").onclick = showMoreGoals;
  document.getElementById("prevGoals").onclick = showPreviousGoals;
}

function addPlayNextLineButton() {
  const dialogueSection = document.getElementById("dialogue-section");
  const nextLineBtn = document.createElement("button");
  nextLineBtn.id = "playNext";
  nextLineBtn.className = "button primary";
  nextLineBtn.innerText = "▶️ Play Next Line (Phone Mode)";
  nextLineBtn.onclick = playNextLine;
  dialogueSection.appendChild(nextLineBtn);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  document.getElementById("toggleSound").textContent = `🔊 Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
}

function backToSetup() {
  stopCurrentPlayback();
  document.getElementById("setup-section").style.display = "block";
  document.getElementById("dialogue-section").style.display = "none";
}

function stopCurrentPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  isPlayingWhole = false;
}

function playNextLine() {
  if (currentDialogueIndex < currentDialogue.length) {
    const entry = currentDialogue[currentDialogueIndex];
    const voice = entry.role === "Clerk" ? "onyx" : "nova";
    playOpenAITTS(entry.text, voice);
    currentDialogueIndex++;
  } else {
    currentDialogueIndex = 0; // Reset after finishing dialogue
  }
}

// Existing Functions like displayPlaces, selectPlace, displayGoals stay unchanged...

async function playWholeDialogue() {
  stopCurrentPlayback();

  if (!soundEnabled || currentDialogue.length === 0) return;

  isPlayingWhole = true;

  for (let i = 0; i < currentDialogue.length; i++) {
    if (!isPlayingWhole) break;
    const entry = currentDialogue[i];
    const voice = entry.role === "Clerk" ? "onyx" : "nova";
    await playOpenAITTS(entry.text, voice);
    await new Promise(resolve => setTimeout(resolve, 300)); // Shortened pause
  }

  isPlayingWhole = false;
}

async function playOpenAITTS(text, voice = "nova") {
  try {
    const response = await fetch("/api/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: text,
        mode: "tts",
        voice: voice
      })
    });

    const audioData = await response.blob();
    const audioURL = URL.createObjectURL(audioData);
    currentAudio = new Audio(audioURL);

    return new Promise(resolve => {
      currentAudio.onended = resolve;
      currentAudio.play().catch(error => {
        console.warn('Auto-play blocked. User interaction required.', error);
        resolve(); // Skip waiting if blocked
      });
    });
  } catch (error) {
    console.error("TTS API Error:", error);
  }
}
