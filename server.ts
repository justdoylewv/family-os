import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function getOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    redirectUri
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/auth/url", (req, res) => {
    try {
      const redirectUri = req.query.redirectUri as string;
      if (!redirectUri) {
        return res.status(400).json({ error: "Missing redirectUri" });
      }
      
      const oauth2Client = getOAuth2Client(redirectUri);

      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent"
      });

      res.json({ url });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    try {
      const { code, state } = req.query;
      
      // We will define the redirect URI from the request headers to match exactly
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const redirectUri = `${protocol}://${host}/auth/callback`;
      
      const oauth2Client = getOAuth2Client(redirectUri);
      
      const { tokens } = await oauth2Client.getToken(code as string);
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                document.write("Authentication successful, but opener window not found. You can close this tab and go back to your app.");
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Callback Error:", error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  app.post("/api/calendar", async (req, res) => {
    try {
      const { tokens } = req.body;
      if (!tokens) {
        return res.status(400).json({ error: "Missing tokens" });
      }

      // We just need access token
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials(tokens);

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: "startTime",
      });

      res.json({ events: response.data.items });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/parse-events", async (req, res) => {
    try {
      const { audioData, mimeType } = req.body;
      if (!audioData) {
        return res.status(400).json({ error: "Missing audio data" });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: audioData,
                  mimeType: mimeType || 'audio/webm'
                }
              },
              { text: "Extract the dates and events/activities mentioned in this audio recording. We are in 2026. Use YYYY-MM-DD format for dates." }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                date: { type: Type.STRING, description: "YYYY-MM-DD" },
                category: { type: Type.STRING, enum: ['kids', 'parents', 'family', 'medical'] }
              },
              required: ["title", "date", "category"]
            }
          }
        }
      });

      if (response.text) {
        res.json({ events: JSON.parse(response.text) });
      } else {
        res.json({ events: [] });
      }
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // For Express 5, *all is required. Looking at package.json, we have express ^5.0.0
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
