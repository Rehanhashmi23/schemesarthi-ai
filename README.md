# SchemeSarthi AI

SIH 2026 hackathon prototype for **SIH26092 — AI-Driven Scheme Matching for Marginalized Entrepreneurs**.

> **Important:** All scheme and partner information in this prototype is illustrative demo data and should not be treated as official government information.

## SIH context

- Problem Statement ID: **SIH26092**
- Problem Statement: **AI driven Scheme Matching for Marginalized Entrepreneurs**
- Theme: **Smart Automation**
- Category: **Software**
- Team: **Recluse Programmers**

## Demo journey

Discover → Understand → Calculate → Route → Apply

1. Open the frontend.
2. Click **Load Demo User**.
3. Review Rahul Patil's profile.
4. Enter: `I want to start a small tailoring business and need around ₹2 lakh.`
5. Click **Understand Requirement**.
6. Click **Find Suitable Schemes**.
7. Inspect matched and non-matched schemes.
8. Open **Why am I eligible?**
9. Calculate EMI.
10. View recommended partner.
11. Review documents and application guidance.
12. Ask the floating SchemeSarthi Assistant questions.

## Architecture

React + Vite + Tailwind-style utility CSS frontend → FastAPI backend → JSON demo data + deterministic rule engine.

The frontend also has a fallback mode so the core demo remains usable if the backend is unavailable.

## Tech stack

- React
- Vite
- JavaScript
- FastAPI
- Python
- JSON demo data
- Optional Gemini API

## Folder structure

```text
schemesarthi-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── data/
│   │   └── demo_data.json
│   ├── services/
│   │   └── engine.py
│   ├── main.py
│   └── requirements.txt
└── README.md
```

## Run backend

```bash
cd backend
python -m venv venv

# Windows PowerShell
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend health: `http://localhost:8000/health`

## Run frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Optional Gemini

The MVP does not require Gemini.

If you want to add it later, create `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
```

Without the key, `/chat` and requirement understanding use deterministic fallback responses.

## API endpoints

- `GET /health`
- `GET /schemes`
- `POST /match-schemes`
- `POST /calculate-emi`
- `GET /partners`
- `POST /chat`
- `POST /application`

## Rule engine

Eligibility is deterministic. It checks category, income, purpose, requested amount and location. The API returns:

- match score
- matched conditions
- failed conditions
- explanation

The score is a demo transparency score, not an official eligibility decision.

## Future scope

- Verified official scheme catalogue
- Government API integrations where available
- Multilingual voice assistant
- Live partner verification
- Document validation
- Secure authentication and consent
- Application status integrations


## Voice Input
The frontend includes browser-based voice input using the Web Speech API. Select English, Hindi, or Marathi from the language selector, then use the microphone on the requirement screen or assistant chat. Recommended browsers: Google Chrome or Microsoft Edge. Microphone permission is required. Voice recognition is browser/device dependent; the core rule engine and EMI calculator do not depend on it.
