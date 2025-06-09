const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const busboy = require('busboy');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// GPT-Proxy
app.post('/gpt', async (req, res) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Fehler im Proxy:', err);
    res.status(500).send('Fehler im Proxy');
  }
});

// WHISPER-Proxy
app.post('/whisper', (req, res) => {
  try {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = Buffer.alloc(0);
    let fileType = '';
    let language = 'de';

    bb.on('file', (name, file, info) => {
      fileType = info.mimeType;
      file.on('data', (data) => {
        fileBuffer = Buffer.concat([fileBuffer, data]);
      });
    });

    bb.on('field', (name, val) => {
      if (name === 'language') language = val;
    });

    bb.on('finish', async () => {
      try {
        const form = new FormData();
        form.append('file', fileBuffer, {
          filename: 'audio.webm',
          contentType: fileType,
        });
        form.append('model', 'whisper-1');
        form.append('language', language);

        const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: form,
        });

        const data = await openaiRes.json();
        res.json(data);
      } catch (error) {
        console.error('Fehler bei Whisper-Fetch:', error);
        res.status(500).send('Fehler bei Whisper-Fetch');
      }
    });

    req.pipe(bb);
  } catch (err) {
    console.error('Fehler im Whisper-Proxy:', err);
    res.status(500).send('Fehler im Whisper-Proxy');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy läuft auf Port ${PORT}`));
