const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/kippi-chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY fehlt auf dem Server."
      });
    }

    const {
      userText = "",
      mode = "chat",
      mood = "",
      reason = "",
      entriesSummary = ""
    } = req.body || {};

    if (!userText.trim()) {
      return res.status(400).json({
        error: "Keine Nutzereingabe erhalten."
      });
    }

    const systemPrompt = `
Du bist Kippi, ein freundlicher, reflektierter Cannabis-Begleiter.

Deine Aufgabe:
- Du begleitest den Nutzer sprachlich.
- Du urteilst nicht.
- Du verherrlichst Konsum nicht.
- Du hilfst, Stimmung, Anlass, Wirkung, Nebenwirkungen, Klarheit, Kontrolle und Folgetag ehrlich zu beobachten.
- Du gibst keine medizinische Diagnose.
- Bei ernsten Warnsignalen empfiehlst du vorsichtig professionelle Hilfe.
- Du antwortest warm, kurz, menschlich und klar.
- Stelle meistens nur eine gute nächste Frage.
- Sprich auf Deutsch.

Wichtig:
Du bist kein Arzt und keine Therapie.
Du bist ein Reflexionsbegleiter.
`;

    const userPrompt = `
Modus: ${mode}
Aktuelle Stimmung: ${mood}
Anlass: ${reason}
Bisherige Muster: ${entriesSummary}

Nutzer sagt:
"${userText}"

Antworte als Kippi.

Gib außerdem am Ende ein JSON-Objekt zurück, aber nur nach dem Marker ###STRUCTURED_DATA###.

Das JSON soll ungefähr so aussehen:
{
  "detectedMood": "",
  "detectedReason": "",
  "possibleRisk": "",
  "suggestedEntryType": "",
  "suggestedNote": "",
  "nextQuestion": ""
}
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const text = response.output_text || "";

    let reply = text;
    let structured = null;

    if (text.includes("###STRUCTURED_DATA###")) {
      const parts = text.split("###STRUCTURED_DATA###");
      reply = parts[0].trim();

      try {
        structured = JSON.parse(parts[1].trim());
      } catch (e) {
        structured = null;
      }
    }

    res.json({
      reply,
      structured
    });
  } catch (error) {
    console.error("Kippi API Fehler:", error);
    res.status(500).json({
      error: "Kippi konnte gerade keine AI-Antwort erzeugen."
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "kippi_ai_begleiter.html"));
});

app.listen(port, () => {
  console.log(`Kippi läuft auf Port ${port}`);
});
