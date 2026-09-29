const API = "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error("Backend request failed");
  return response.json();
}

export async function matchSchemes(profile) {
  return request("/match-schemes", { method: "POST", body: JSON.stringify(profile) });
}

export async function understand(text, profile) {
  return request("/requirement", { method: "POST", body: JSON.stringify({ text, profile }) });
}

export async function calculateEMI(loan_amount, interest_rate, tenure_years) {
  return request("/calculate-emi", {
    method: "POST",
    body: JSON.stringify({ loan_amount, interest_rate, tenure_years })
  });
}

export async function chat(message, context) {
  return request("/chat", { method: "POST", body: JSON.stringify({ message, context }) });
}

export async function createApplication(profile, scheme_id, partner_id) {
  return request("/application", {
    method: "POST",
    body: JSON.stringify({ profile, scheme_id, partner_id })
  });
}
