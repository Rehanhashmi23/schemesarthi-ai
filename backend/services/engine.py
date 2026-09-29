import json
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "demo_data.json"

def load_data():
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))

def normalize(value):
    return str(value or "").strip().lower()

def purpose_matches(user_purpose, scheme):
    p = normalize(user_purpose)
    return any(normalize(x) in p or p in normalize(x) for x in scheme["purposes"])

def location_matches(user_state, scheme):
    state = normalize(user_state)
    return any(normalize(x) == state or normalize(x) == "all india" for x in scheme["locations"])

def category_matches(user_category, scheme):
    category = normalize(user_category)
    return category in [normalize(x) for x in scheme["category"]] or "eligible applicants" in [normalize(x) for x in scheme["category"]] or "eligible entrepreneurs" in [normalize(x) for x in scheme["category"]]

def match_schemes(profile):
    data = load_data()
    results = []
    for s in data["schemes"]:
        matched, failed = [], []
        if category_matches(profile.get("category"), s):
            matched.append("Category matches")
        else:
            failed.append("Category does not match configured eligibility")

        income = float(profile.get("income", 0) or 0)
        if income <= s["income_limit"]:
            matched.append("Family income is within configured limit")
        else:
            failed.append("Family income exceeds configured limit")

        if purpose_matches(profile.get("purpose", ""), s):
            matched.append("Business purpose matches")
        else:
            failed.append("Business purpose does not match configured purposes")

        amount = float(profile.get("required_amount", 0) or 0)
        if s["min_amount"] <= amount <= s["max_amount"]:
            matched.append("Requested amount is within assistance range")
        elif amount < s["min_amount"]:
            failed.append("Requested amount is below configured minimum")
        else:
            failed.append("Requested amount exceeds configured maximum")

        if location_matches(profile.get("state"), s):
            matched.append("Location requirement satisfied")
        else:
            failed.append("Location is outside configured coverage")

        score = round((len(matched) / 5) * 100)
        results.append({
            "scheme": s,
            "match_score": score,
            "matched_conditions": matched,
            "failed_conditions": failed,
            "explanation": (
                "This scheme matches the configured profile because "
                + ", ".join(matched[:-1] if len(matched) > 1 else matched)
                + (" and " + matched[-1] if len(matched) > 1 else "")
                + "."
            ) if matched else "The configured profile does not satisfy the demo rules for this scheme."
        })
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results

def calculate_emi(principal, annual_rate, years):
    p = float(principal)
    r = float(annual_rate) / 12 / 100
    n = int(float(years) * 12)
    if p <= 0 or n <= 0:
        raise ValueError("Loan amount and tenure must be positive.")
    if r == 0:
        emi = p / n
    else:
        emi = p * r * (1 + r) ** n / ((1 + r) ** n - 1)
    total = emi * n
    return {
        "monthly_emi": round(emi, 2),
        "total_interest": round(total - p, 2),
        "total_repayment": round(total, 2),
        "installments": n
    }
