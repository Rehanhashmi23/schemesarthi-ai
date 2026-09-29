from pathlib import Path
import json
import re
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.engine import load_data, match_schemes, calculate_emi

app = FastAPI(title="SchemeSarthi AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Profile(BaseModel):
    name: str = ""
    age: int = 0
    gender: str = ""
    category: str = ""
    state: str = ""
    district: str = ""
    income: float = 0
    project_cost: float = 0
    required_amount: float = 0
    purpose: str = ""
    business_type: str = ""
    education: str = ""

class EMIRequest(BaseModel):
    loan_amount: float = Field(gt=0)
    interest_rate: float = Field(ge=0)
    tenure_years: float = Field(gt=0)

class Requirement(BaseModel):
    text: str
    profile: dict[str, Any] = {}

class ChatRequest(BaseModel):
    message: str
    context: dict[str, Any] = {}

class ApplicationRequest(BaseModel):
    profile: dict[str, Any]
    scheme_id: str
    partner_id: str | None = None

@app.get("/health")
def health():
    return {"status": "ok", "mode": "demo"}

@app.get("/schemes")
def schemes():
    return {"schemes": load_data()["schemes"]}

@app.get("/partners")
def partners():
    return {"partners": load_data()["partners"]}

@app.post("/match-schemes")
def match(profile: Profile):
    return {"results": match_schemes(profile.model_dump())}

@app.post("/calculate-emi")
def emi(req: EMIRequest):
    try:
        return calculate_emi(req.loan_amount, req.interest_rate, req.tenure_years)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

def extract_amount(text):
    m = re.search(r"(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]+)?)\s*(lakh|lac|k)?", text.lower())
    if not m:
        return None
    value = float(m.group(1))
    unit = m.group(2)
    if unit in ("lakh", "lac"):
        value *= 100000
    elif unit == "k":
        value *= 1000
    return value

@app.post("/requirement")
def requirement(req: Requirement):
    text = req.text.lower()
    amount = extract_amount(text)
    purpose = "Business" if any(x in text for x in ["business", "enterprise", "tailoring", "shop", "startup"]) else "Other"
    business = "Tailoring" if "tailoring" in text or "tailor" in text else "Small business"
    profile = req.profile
    language = profile.get("language", "en")
    return {
        "purpose": purpose,
        "business_type": business,
        "required_amount": amount or profile.get("required_amount", 0),
        "location": profile.get("state", "Maharashtra"),
        "category": profile.get("category", "SC"),
        "confidence": 0.96 if amount else 0.82,
        "source": "fallback-demo-ai",
        "language": language
    }

@app.post("/chat")
def chat(req: ChatRequest):
    msg = req.message.lower()
    ctx = req.context
    scheme = ctx.get("scheme_name", "the selected demo scheme")
    amount = ctx.get("loan_amount", 200000)
    emi = ctx.get("emi")
    language = ctx.get("language", "en")
    if language == "hi":
        if "document" in msg or "दस्तावेज़" in msg:
            answer = "इस डेमो के लिए पहचान प्रमाण, जाति प्रमाणपत्र, आय प्रमाणपत्र, पता प्रमाण, प्रोजेक्ट/व्यवसाय विवरण और बैंक खाता विवरण तैयार रखें।"
        elif "why" in msg or "क्यों" in msg:
            answer = f"{scheme} को इसलिए सुझाया गया क्योंकि डेमो नियम श्रेणी, आय, उद्देश्य, राशि और स्थान की जांच करते हैं।"
        elif "emi" in msg or "कितनी" in msg:
            answer = f"₹{float(amount):,.0f} के डेमो लोन के लिए वर्तमान अनुमानित EMI ₹{float(emi):,.0f} है।" if emi else "वित्तीय कैलकुलेटर खोलकर EMI की गणना करें।"
        elif "partner" in msg or "पार्टनर" in msg:
            answer = "डेमो पार्टनर का चयन योजना की संगतता, स्थान और दूरी के आधार पर किया जाता है।"
        else:
            answer = "मैं डेमो योजनाओं, पात्रता, EMI, दस्तावेज़ और पार्टनर मार्गदर्शन के बारे में बता सकता हूं।"
    elif language == "mr":
        if "document" in msg or "कागदपत्र" in msg:
            answer = "या डेमोसाठी ओळख पुरावा, जात प्रमाणपत्र, उत्पन्न प्रमाणपत्र, पत्ता पुरावा, प्रकल्प/व्यवसाय तपशील आणि बँक खाते तपशील तयार ठेवा."
        elif "why" in msg or "का" in msg:
            answer = f"{scheme} ही योजना श्रेणी, उत्पन्न, उद्देश, रक्कम आणि स्थान या डेमो नियमांनुसार सुचवली आहे."
        elif "emi" in msg or "किती" in msg:
            answer = f"₹{float(amount):,.0f} च्या डेमो कर्जासाठी सध्याची अंदाजे EMI ₹{float(emi):,.0f} आहे." if emi else "EMI मोजण्यासाठी आर्थिक कॅल्क्युलेटर उघडा."
        elif "partner" in msg or "पार्टनर" in msg:
            answer = "डेमो पार्टनरची निवड योजना सुसंगतता, स्थान आणि अंतर यानुसार केली जाते."
        else:
            answer = "मी डेमो योजना, पात्रता, EMI, कागदपत्रे आणि पार्टनर मार्गदर्शन समजावून सांगू शकतो."
    else:
        if "document" in msg:
            answer = "For this demo flow, prepare Identity Proof, Caste Certificate, Income Certificate, Address Proof, Project/Business Details and Bank Account Details."
        elif "why" in msg and ("recommended" in msg or "eligible" in msg):
            answer = f"{scheme} was recommended because the configured demo rules check category, income, purpose, requested amount and location."
        elif "emi" in msg or "repayment" in msg:
            answer = f"For an illustrative loan of ₹{float(amount):,.0f}, the current demo EMI is ₹{float(emi):,.0f}." if emi else "Open the Financial Calculator to calculate the illustrative EMI."
        elif "partner" in msg:
            answer = "The recommended demo partner is selected using scheme compatibility, location and distance."
        else:
            answer = "I can explain the demo schemes, eligibility, EMI, documents and partner routing."
    return {"answer": answer, "mode": "fallback-demo-ai", "language": language}

@app.post("/application")
def application(req: ApplicationRequest):
    return {
        "application_id": "SSA-DEMO-2026-001",
        "status": "DEMO — NOT SUBMITTED",
        "scheme_id": req.scheme_id,
        "message": "Demo application created locally. It has not been submitted to any government department."
    }
