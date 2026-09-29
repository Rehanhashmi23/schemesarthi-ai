import React from "react";
import { Check, X, ArrowRight, Sparkles, MapPin, FileText, Calculator, ShieldCheck } from "lucide-react";

export function Button({ children, onClick, variant="primary", disabled=false, className="" }) {
  return <button disabled={disabled} onClick={onClick} className={`btn ${variant} ${className}`}>{children}</button>;
}

export function Badge({ children, tone="blue" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Stepper({ step }) {
  const steps = ["Profile", "Understand", "Match", "Explain", "Calculate", "Route", "Documents", "Apply"];
  return <div className="stepper">{steps.map((s,i)=><div key={s} className={`step ${i <= step ? "active":""}`}><span>{i+1}</span><small>{s}</small></div>)}</div>;
}

export function SectionTitle({ eyebrow, title, children }) {
  return <div className="section-title"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{children}</div>;
}

export function StatCard({ icon: Icon, label, value }) {
  return <div className="stat-card"><div className="stat-icon"><Icon size={19}/></div><div><div className="muted">{label}</div><strong>{value}</strong></div></div>;
}

export function Condition({ ok, children }) {
  return <div className={`condition ${ok ? "ok" : "bad"}`}>{ok ? <Check size={17}/> : <X size={17}/>}<span>{children}</span></div>;
}
