export default async function handler(req, res) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const { prompt, mode = "chat", voice = "nova", max_tokens = 800 } = req.body;

  try {
    let apiURL = "";
    let body = {};

    if (mode === "tts") {
      apiURL = "https://api.openai.com/v1/audio/speech";
      body = {
        model: "tts-1",
        input: prompt,
        voice: voice
      };
    } else {
      apiURL = "https://api.openai.com/v1/chat/completions";
      body = {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens
      };
    }

    const response = await fetch(apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (mode === "tts") {
      const audioData = await response.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      return res.status(200).send(Buffer.from(audioData));
    } else {
      const data = await response.json();
      return res.status(200).json(data);
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "API call failed." });
  }
}
