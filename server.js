// server.js — GPT Proxy (CommonJS, Node >=18)

const express = require("express");
const cors = require("cors");

const app = express();

// Body parser
app.use(express.json({ limit: "2mb" }));

// CORS (später gern auf deine Domains einschränken)
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

// Health-Check für Koyeb
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Chat-Proxy -> OpenAI
app.post("/gpt", async (req, res) => {
  try {
    const { model = "gpt-4o", messages = [], temperature = 0.3 } = req.body || {};

    // Node 18+ hat global fetch
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error || "Upstream error" });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Start (Koyeb setzt PORT, lokal 3000)
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("gpt-proxy listening on", port));
