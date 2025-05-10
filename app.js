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

const allPlaces = [
  "🛒 Grocery Store", "👕 Clothes Shop", "🏢 City Office", "🎬 Movie Theater", "🏨 Hotel", "✈️ Airport",
  "🍽️ Restaurant", "☕ Coffee Shop", "🚉 Train Station", "🚌 Bus Terminal", "💊 Pharmacy", "📮 Post Office",
  "📚 Library", "📖 Bookstore", "🍞 Bakery", "🏥 Hospital", "🏦 Bank", "🏪 Convenience Store"
];

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

window.onload = () => {
  init();
  displayPlaces();  // Corrected: Don’t auto-select any place
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

  document.getElementById("morePlaces").onclick = () => showMorePlaces(false);
  document.getElementById("prevPlaces").onclick = () => showPreviousPlaces(false);
  document.getElementById("moreGoals").onclick = showMoreGoals;
  document.getElementById("prevGoals").onclick = showPreviousGoals;
}

function addPlayNextLineButton() {
  const dialogueSection = document.getElementById("dialogue-section");
  if (!document.getElementById("playNext")) {
    const nextLineBtn = document.createElement("button");
    nextLineBtn.id = "playNext";
    nextLineBtn.className = "button primary";
    nextLineBtn.innerText = "▶️ Play Next Line (Phone)";
    nextLineBtn.onclick = playNextLine;
    dialogueSection.appendChild(nextLineBtn);
  }
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

function displayPlaces(loadGoals = false) {
  const placesDiv = document.getElementById("places");
  placesDiv.innerHTML = "";

  const start = placePage * 6;
  const end = start + 6;
  const placesToShow = allPlaces.slice(start, end);

  placesToShow.forEach(place => {
    const btn = createButton(place, 'secondary');
    btn.onclick = () => selectPlace(place.replace(/^[^a-zA-Z]+/, '').trim());
    placesDiv.appendChild(btn);
  });

  document.getElementById("morePlaces").style.display = end < allPlaces.length ? "inline-block" : "none";
  document.getElementById("prevPlaces").style.display = placePage > 0 ? "inline-block" : "none";
}

function showMorePlaces() {
  placePage++;
  displayPlaces();
}

function showPreviousPlaces() {
  if (placePage > 0) placePage--;
  displayPlaces();
}

function selectPlace(place) {
  selectedPlace = place;
  fetchGoals(place);
}

async function fetchGoals(place) {
  const goalsDiv = document.getElementById("goals");
  goalsDiv.innerHTML = "Loading goals...";

  const prompt = `Suggest 12 simple, common customer actions at a ${place}. 
Use short action phrases like "Buy groceries", "Return a product". Do not use questions or clerk offers. 
Translate each into Japanese. Output only the Japanese expressions, one per line.`;

  const data = await chatGPT(prompt);
  if (data) {
    currentGoals = data.split('\n').filter(line => line.trim());
    goalPage = 0;
    displayGoals();
  }
}

function displayGoals() {
  const goalsDiv = document.getElementById("goals");
  goalsDiv.innerHTML = "";

  const start = goalPage * 6;
  const end = start + 6;
  const goalsToShow = currentGoals.slice(start, end);

  goalsToShow.forEach(goal => {
    const btn = createButton(goal, 'primary');
    btn.onclick = () => startDialogue(goal);
    goalsDiv.appendChild(btn);
  });

  document.getElementById("moreGoals").style.display = end < currentGoals.length ? "inline-block" : "none";
  document.getElementById("prevGoals").style.display = goalPage > 0 ? "inline-block" : "none";
}

function showMoreGoals() {
  goalPage++;
  displayGoals();
}

function showPreviousGoals() {
  if (goalPage > 0) goalPage--;
  displayGoals();
}

async function chatGPT(prompt) {
  try {
    const response = await fetch("/api/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}

function createButton(text, type) {
  const btn = document.createElement("button");
  btn.className = `button ${type}`;
  btn.textContent = text;
  return btn;
}

async function startDialogue(goal) {
  selectedGoal = goal;
  currentDialogueIndex = 0;
  const dialogueSection = document.getElementById("dialogue-section");
  const setupSection = document.getElementById("setup-section");
  const dialogueBox = document.getElementById("dialogue");

  setupSection.style.display = "none";
  dialogueSection.style.display = "block";

  const prompt = `You are simulating a conversation at a ${selectedPlace}. 
The customer's goal is: "${goal}". 
Generate a short, natural English conversation between 
Customer and Clerk. Ensure that the dialogue directly reflects the customer's goal. 
Keep each line short, realistic, and easy for English learners to understand. 
Label each line with either Customer: or Clerk:. 
Do NOT include translations or explanations.`;

  const response = await chatGPT(prompt);

  if (response) {
    const lines = response.split('\n').filter(line => line.trim());
    currentDialogue = lines.map(line => {
      const [role, text] = line.split(':');
      return { role: role.trim(), text: text.trim() };
    });

    dialogueBox.innerHTML = `<h3>🗣️ Dialogue: ${selectedPlace} - ${selectedGoal}</h3>`;
    currentDialogue.forEach((entry, idx) => {
      dialogueBox.innerHTML += `
        <p><span class="role">${entry.role}:</span> ${entry.text}</p>
        <div class="dialogue-actions">
          <button onclick="showTranslation(${idx})" class="button small">See Translation</button>
          <button onclick="playLine(${idx})" class="button small">🔊 Play This Line</button>
        </div>
        <p id="translation-${idx}" style="display:none; color:#555; margin-left:20px;"></p>`;
    });
  } else {
    dialogueBox.innerHTML = "<p>Failed to generate dialogue. Please try again.</p>";
  }
}

async function showTranslation(index) {
  const line = currentDialogue[index];
  const translationPrompt = `Translate the following English sentence into Japanese:\n"${line.text}"`;

  const translation = await chatGPT(translationPrompt);
  const translationP = document.getElementById(`translation-${index}`);
  translationP.innerText = `🗾 Translation: ${translation}`;
  translationP.style.display = "block";
}

async function playWholeDialogue() {
  stopCurrentPlayback();

  if (!soundEnabled || currentDialogue.length === 0) return;

  isPlayingWhole = true;

  for (let i = 0; i < currentDialogue.length; i++) {
    if (!isPlayingWhole) break;
    const entry = currentDialogue[i];
    const voice = entry.role === "Clerk" ? "onyx" : "nova";
    await playOpenAITTS(entry.text, voice);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  isPlayingWhole = false;
}

async function playLine(index) {
  stopCurrentPlayback();

  const entry = currentDialogue[index];
  const voice = entry.role === "Clerk" ? "onyx" : "nova";
  await playOpenAITTS(entry.text, voice);
}

async function playNextLine() {
  if (currentDialogueIndex < currentDialogue.length) {
    const entry = currentDialogue[currentDialogueIndex];
    const voice = entry.role === "Clerk" ? "onyx" : "nova";
    await playOpenAITTS(entry.text, voice);
    currentDialogueIndex++;
  } else {
    currentDialogueIndex = 0;
  }
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
        resolve();
      });
    });
  } catch (error) {
    console.error("TTS API Error:", error);
  }
}
