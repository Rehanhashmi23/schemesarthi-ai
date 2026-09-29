import React, { useMemo, useRef, useState } from "react";
import { getT, languages } from "./i18n";
import { Bot, Calculator, Mic, MicOff, ChevronRight, FileText, Landmark, MapPin, MessageCircle, Search, ShieldCheck, Sparkles, Target, UserRound, WalletCards, X } from "lucide-react";
import { Button, Badge, Condition, SectionTitle, StatCard, Stepper } from "./components/UI";
import { demoDocuments, demoPartners, demoProfile, demoSchemes } from "./data/demo";
import { calculateEMI as apiEMI, chat as apiChat, createApplication, matchSchemes as apiMatch, understand as apiUnderstand } from "./services/api";

const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n||0));

function fallbackMatch(profile) {
  return demoSchemes.map(s => {
    const matched=[], failed=[];
    const cat = s.category.map(x=>x.toLowerCase()).includes(String(profile.category).toLowerCase()) || s.category.some(x=>["eligible applicants","eligible entrepreneurs"].includes(x.toLowerCase()));
    const income = Number(profile.income) <= s.income_limit;
    const purpose = s.purposes.some(x => String(profile.purpose+" "+profile.business_type).toLowerCase().includes(x));
    const amount = Number(profile.required_amount) >= s.min_amount && Number(profile.required_amount) <= s.max_amount;
    const location = s.locations.includes("All India") || s.locations.map(x=>x.toLowerCase()).includes(String(profile.state).toLowerCase());
    if(cat) matched.push("Category matches"); else failed.push("Category does not match configured eligibility");
    if(income) matched.push("Family income is within configured limit"); else failed.push("Family income exceeds configured limit");
    if(purpose) matched.push("Business purpose matches"); else failed.push("Business purpose does not match configured purposes");
    if(amount) matched.push("Requested amount is within assistance range"); else failed.push("Requested amount exceeds configured limit");
    if(location) matched.push("Location requirement satisfied"); else failed.push("Location is outside configured coverage");
    return {scheme:s, match_score:Math.round(matched.length/5*100), matched_conditions:matched, failed_conditions:failed, explanation:"This scheme matches the configured profile because "+matched.join(", ").toLowerCase()+"."};
  }).sort((a,b)=>b.match_score-a.match_score);
}

export default function App() {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  const [language,setLanguage] = useState(localStorage.getItem("schemesarthi-language") || "en");
  const t = getT(language);
  const changeLanguage = code => { setLanguage(code); localStorage.setItem("schemesarthi-language", code); };
  const voiceLocale = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
  const startVoice = (setter) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError("Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge."); return; }
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLocale;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = e => setter(e.results[0][0].transcript);
    recognition.onerror = () => { setListening(false); setError("Voice input could not be captured. Please allow microphone access and try again."); };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
  };
  const stopVoice = () => { try { recognitionRef.current?.stop(); } catch {} setListening(false); };
  const [screen,setScreen] = useState("landing");
  const [profile,setProfile] = useState(demoProfile);
  const [requirement,setRequirement] = useState("I want to start a small tailoring business and need around ₹2 lakh.");
  const [understanding,setUnderstanding] = useState(null);
  const [results,setResults] = useState([]);
  const [selected,setSelected] = useState(null);
  const [emi,setEmi] = useState({monthly_emi:4058,total_interest:43480,total_repayment:243480});
  const [loan,setLoan] = useState(200000), [rate,setRate] = useState(8), [years,setYears] = useState(5);
  const [chatOpen,setChatOpen] = useState(false), [chatText,setChatText] = useState(""), [messages,setMessages] = useState([]);
  const [application,setApplication] = useState(null);
  const [error,setError] = useState("");

  const go = s => { setError(""); setScreen(s); window.scrollTo({top:0,behavior:"smooth"}); };
  const loadDemo = () => { setProfile({...demoProfile}); setUnderstanding(null); setResults([]); setSelected(null); go("profile"); };

  async function doUnderstand() {
    try {
      const data = await apiUnderstand(requirement, {...profile, language});
      setUnderstanding(data);
    } catch {
      const amount = /2\s*(lakh|lac)/i.test(requirement) ? 200000 : profile.required_amount;
      setUnderstanding({purpose:"Business",business_type:"Tailoring",required_amount:amount,location:profile.state,category:profile.category,confidence:.96,source:"fallback-demo-ai"});
    }
  }

  async function doMatch() {
    const updated = {...profile, ...(understanding ? {purpose:understanding.purpose,business_type:understanding.business_type,required_amount:understanding.required_amount}: {})};
    setProfile(updated);
    try { setResults((await apiMatch(updated)).results); } catch { setResults(fallbackMatch(updated)); }
    go("match");
  }

  async function doEMI() {
    try { setEmi(await apiEMI(loan,rate,years)); } catch {
      const r=rate/12/100,n=years*12,p=loan;
      const e=r===0?p/n:p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
      setEmi({monthly_emi:e,total_interest:e*n-p,total_repayment:e*n});
    }
  }

  const best = results[0];
  const recommendedPartner = useMemo(() => {
    if(!best) return demoPartners[0];
    return [...demoPartners].filter(p=>p.schemes.includes(best.scheme.id)).sort((a,b)=>a.distance_km-b.distance_km)[0] || demoPartners[0];
  },[best]);

  async function askChat(text=chatText) {
    if(!text.trim()) return;
    const user = text.trim();
    setMessages(m=>[...m,{role:"user",text:user}]); setChatText("");
    try {
      const data=await apiChat(user,{scheme_name:best?.scheme.name,loan_amount:loan,emi:emi.monthly_emi,language});
      setMessages(m=>[...m,{role:"assistant",text:data.answer}]);
    } catch {
      let answer="I can explain demo schemes, eligibility, EMI, documents and partner routing.";
      if(user.toLowerCase().includes("document")) answer="Prepare Identity Proof, Caste Certificate, Income Certificate, Address Proof, Project/Business Details and Bank Account Details.";
      if(user.toLowerCase().includes("why")) answer=`${best?.scheme.name||"This scheme"} was recommended because the configured demo rules check category, income, purpose, amount and location.`;
      if(user.toLowerCase().includes("partner")) answer=`The recommended demo partner is ${recommendedPartner.name}, selected using scheme compatibility, district and distance.`;
      setMessages(m=>[...m,{role:"assistant",text:answer}]);
    }
  }

  async function apply() {
    try { setApplication(await createApplication(profile,best.scheme.id,recommendedPartner.id)); }
    catch { setApplication({application_id:"SSA-DEMO-2026-001",status:"DEMO — NOT SUBMITTED"}); }
  }

  const currentStep = {profile:0,understand:1,match:2,explain:3,calculate:4,route:5,documents:6,apply:7}[screen] ?? 0;

  if(screen==="landing") return <Landing loadDemo={loadDemo} language={language} changeLanguage={changeLanguage} t={t}/>;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand" onClick={()=>go("landing")}><div className="logo"><Sparkles size={20}/></div><div><b>SchemeSarthi AI</b><small>Your AI Guide to the Right Government Scheme</small></div></div>
      <LanguageSelector language={language} changeLanguage={changeLanguage} t={t}/>
    </header>
    <main className="container">
      <Stepper step={currentStep}/>
      {error && <div className="alert">{error}</div>}

      {screen==="profile" && <Profile profile={profile} setProfile={setProfile} onUnderstand={()=>go("understand")} t={t} />}
      {screen==="understand" && <Understand requirement={requirement} setRequirement={setRequirement} understanding={understanding} onUnderstand={doUnderstand} onMatch={doMatch} profile={profile} t={t} onVoice={() => startVoice(setRequirement)} listening={listening} language={language}/>}
      {screen==="match" && <Match results={results} onExplain={(r)=>{setSelected(r);go("explain")}} onBack={()=>go("understand")} t={t}/>}
      {screen==="explain" && <Explain result={selected} onNext={()=>go("calculate")} onBack={()=>go("match")} t={t}/>}
      {screen==="calculate" && <Calculate t={t} loan={loan} setLoan={setLoan} rate={rate} setRate={setRate} years={years} setYears={setYears} emi={emi} onCalc={doEMI} onNext={()=>go("route")}/>}
      {screen==="route" && <Route t={t} partner={recommendedPartner} scheme={best?.scheme} onNext={()=>go("documents")}/>}
      {screen==="documents" && <Documents onNext={()=>go("apply")} t={t}/>}
      {screen==="apply" && <Apply application={application} onApply={apply} t={t}/>}
    </main>
    <button className="assistant-fab" onClick={()=>setChatOpen(true)}><MessageCircle size={22}/><span>{t("ask")}</span></button>
    {chatOpen && <div className="chat-panel">
      <div className="chat-head"><div><b>SchemeSarthi Assistant</b><small>{t("demoAssistant")}</small></div><button onClick={()=>setChatOpen(false)}><X/></button></div>
      <div className="chat-body">{messages.length===0 && <div className="suggestions">{[t("documentsNeeded"),t("whyRecommended"),t("emiQuestion"),t("partnerQuestion")].map(q=><button key={q} onClick={()=>askChat(q)}>{q}</button>)}</div>}{messages.map((m,i)=><div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}</div>
      <div className="chat-input"><input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&askChat()} placeholder={t("chatPlaceholder")}/><button title="Voice input" onClick={()=>listening ? stopVoice() : startVoice(setChatText)}>{listening ? <MicOff/> : <Mic/>}</button><button onClick={()=>askChat()}><ChevronRight/></button></div>
    </div>}
  </div>
}

function LanguageSelector({language,changeLanguage,t}) {
  return <label className="language-select"><span>{t("language")}</span><select value={language} onChange={e=>changeLanguage(e.target.value)}>{languages.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select></label>;
}

function Landing({loadDemo,language,changeLanguage,t}) {
  return <div className="landing">
    <header className="landing-nav"><div className="brand"><div className="logo"><Sparkles size={20}/></div><div><b>SchemeSarthi AI</b><small>Explainable scheme discovery</small></div></div><LanguageSelector language={language} changeLanguage={changeLanguage} t={t}/></header>
    <section className="hero container">
      <div className="hero-copy"><Badge>{t("journey")}</Badge><h1>{t("heroTitle")}</h1><p>{t("heroText")}</p><div className="hero-actions"><Button onClick={loadDemo}>{t("loadDemo")} <ChevronRight/></Button><Button variant="secondary" onClick={loadDemo}>{t("tryDemo")}</Button></div><div className="demo-note"><ShieldCheck size={18}/> Internal hackathon MVP • Uses illustrative demo data</div></div>
      <div className="hero-card"><div className="mini-top"><span>Scheme match preview</span><Badge tone="green">Explainable</Badge></div><div className="preview-score"><div className="ring">92<small>%</small></div><div><b>Entrepreneurship Support Scheme</b><p>Strong match for small business</p></div></div>{["Category matches","Income within configured limit","Purpose matches","Amount within range"].map(x=><div className="preview-row" key={x}>✓ {x}</div>)}</div>
    </section>
    <section className="container"><SectionTitle eyebrow="THE JOURNEY" title="One guided flow, from discovery to application."/><div className="journey">{["Discover","Understand","Calculate","Route","Apply"].map((x,i)=><div key={x} className="journey-card"><div>{i+1}</div><b>{x}</b><p>{["Find relevant demo schemes.","See why each match happened.","Estimate illustrative EMI.","Find a compatible demo partner.","Get a clear next-step checklist."][i]}</p></div>)}</div></section>
    <section className="container features"><SectionTitle eyebrow="CORE FEATURES" title="Built for a strong hackathon demo."/><div className="feature-grid">{[
      [Search,"Smart Scheme Matching","Deterministic rule-based matching with multiple results."],[ShieldCheck,"Explainable Eligibility","Matched and failed conditions are visible."],[Calculator,"Financial Calculator","Interactive EMI, interest and repayment."],[MapPin,"Partner Locator","Scheme-compatible demo partner routing."],[FileText,"Document Guidance","Clear required/optional document checklist."],[Bot,"AI Assistant","Answers using the demo scheme context with fallback mode."]
    ].map(([Icon,t,d])=><div className="feature" key={t}><div className="feature-icon"><Icon/></div><b>{t}</b><p>{d}</p></div>)}</div></section>
    <footer>SchemeSarthi AI • SIH26092 • <span>Illustrative demo only — not an official government portal.</span></footer>
  </div>
}

function Profile({profile,setProfile,onUnderstand,t}) {
  const field=(label,key,type="text")=><label>{label}<input type={type} value={profile[key] ?? ""} onChange={e=>setProfile({...profile,[key]:type==="number"?Number(e.target.value):e.target.value})}/></label>;
  return <div className="page"><SectionTitle eyebrow="STEP 1 • USER PROFILE" title={t("profile")}><Button variant="secondary" onClick={()=>setProfile({...demoProfile})}>{t("loadDemo")}</Button></SectionTitle><div className="card"><h3>{t("personal")}</h3><div className="form-grid">{field("Name","name")}{field("Age","age","number")}{field("Gender","gender")}{field("Category","category")}{field("State","state")}{field("District","district")}</div><h3>{t("financial")}</h3><div className="form-grid">{field("Annual family income (₹)","income","number")}{field("Estimated project cost (₹)","project_cost","number")}{field("Required assistance (₹)","required_amount","number")}</div><h3>{t("req")}</h3><div className="form-grid">{field("Purpose","purpose")}{field("Business / project type","business_type")}{field("Education status","education")}</div><div className="ready"><ShieldCheck/><b>Profile Ready ✓</b><span>Information is used only for this local demo journey.</span></div><div className="actions"><Button onClick={onUnderstand}>{t("continueAI")} <ChevronRight/></Button></div></div></div>
}

function Understand({requirement,setRequirement,understanding,onUnderstand,onMatch,profile,t,onVoice,listening,language}) {
  return <div className="page"><SectionTitle eyebrow="STEP 2 • AI REQUIREMENT" title={t("requirement")} /><div className="card"><div className="prompt-label"><Sparkles size={17}/> Conversational requirement</div><div className="voice-row"><textarea value={requirement} onChange={e=>setRequirement(e.target.value)} placeholder="Tell us what you need..."/><button className={`voice-button ${listening ? "listening" : ""}`} onClick={onVoice} title={`Speak in ${language === "hi" ? "Hindi" : language === "mr" ? "Marathi" : "English"}`}>{listening ? <MicOff size={20}/> : <Mic size={20}/>}<span>{listening ? "Listening..." : "Voice Input"}</span></button></div><p className="hint">Type or speak your requirement. Voice follows the selected language: English, Hindi or Marathi.</p><p className="hint">Example: “I want to start a small tailoring business and need around ₹2 lakh.”</p><Button onClick={onUnderstand}>{t("understand")} <Sparkles/></Button>{understanding && <div className="understanding"><div className="understanding-head"><div><Badge tone="green">{t("aiUnderstanding")}</Badge><h3>{t("extracted")}</h3></div><span>{Math.round(understanding.confidence*100)}% confidence</span></div><div className="chip-grid"><div><small>{t("purpose")}</small><b>{understanding.purpose}</b></div><div><small>{t("businessType")}</small><b>{understanding.business_type}</b></div><div><small>{t("requiredAmount")}</small><b>{money(understanding.required_amount)}</b></div><div><small>{t("location")}</small><b>{understanding.location}</b></div><div><small>{t("category")}</small><b>{understanding.category}</b></div></div><div className="actions"><Button onClick={onMatch}>{t("findSchemes")} <Search/></Button></div></div>}</div></div>
}

function Match({results,onExplain,onBack,t}) {
  return <div className="page"><SectionTitle eyebrow="STEP 3 • SCHEME MATCHING" title={t("matches")}><Badge tone="violet">Demo Scheme Data — For Hackathon Prototype</Badge></SectionTitle><div className="demo-banner">All scheme data below is illustrative demo data. It is not official government information.</div><div className="scheme-grid">{results.filter(r=>r.match_score>=40).map((r,i)=><div className="scheme-card" key={r.scheme.id}><div className="scheme-head"><Badge tone={i===0?"green":"blue"}>{i===0?"Best match":"Suitable match"}</Badge><div className="score">{r.match_score}%<small> match</small></div></div><h3>{r.scheme.name}</h3><p>Suitable for: {r.scheme.purposes.join(" / ")}</p><div className="range"><span>Assistance</span><b>{money(r.scheme.min_amount)} – {money(r.scheme.max_amount)}</b></div><div className="range"><span>Income condition</span><b>≤ {money(r.scheme.income_limit)}</b></div><div className="matched-line">✓ {r.matched_conditions.length} configured conditions matched</div><Button onClick={()=>onExplain(r)}>{t("whyEligible")} <ChevronRight/></Button></div>)}</div><h3 className="subhead">Not Matched</h3><div className="notmatched">{results.filter(r=>r.match_score<40).map(r=><div key={r.scheme.id}><b>{r.scheme.name}</b>{r.failed_conditions.map(x=><span key={x}>✕ {x}</span>)}</div>)}</div><div className="actions"><Button variant="secondary" onClick={onBack}>{t("back")}</Button></div></div>
}

function Explain({result,onNext,onBack,t}) {
  if(!result) return null;
  return <div className="page"><SectionTitle eyebrow="STEP 4 • EXPLAINABLE ELIGIBILITY" title={t("eligible")}><Badge tone="green">{result.match_score}% configured match</Badge></SectionTitle><div className="explain-layout"><div className="card"><div className="explain-score">{result.match_score}%<small> match</small></div><h3>{result.scheme.name}</h3><p>{result.explanation}</p><h4>Matched conditions</h4>{result.matched_conditions.map(x=><Condition key={x} ok>{x}</Condition>)}{result.failed_conditions.length>0&&<><h4>Conditions not satisfied</h4>{result.failed_conditions.map(x=><Condition key={x} ok={false}>{x}</Condition>)}</>}</div><div className="card why-card"><div className="feature-icon"><Target/></div><h3>Why this scheme?</h3><p>This transparent explanation shows the exact configured rules used by the demo matching engine instead of returning an unexplained recommendation.</p><div className="mini-flow"><span>Profile</span><ChevronRight/><span>Rules</span><ChevronRight/><span>Match</span><ChevronRight/><span>Reason</span></div></div></div><div className="actions"><Button variant="secondary" onClick={onBack}>{t("back")}</Button><Button onClick={onNext}>{t("continueCalc")} <Calculator/></Button></div></div>
}

function Calculate({loan,setLoan,rate,setRate,years,setYears,emi,onCalc,onNext,t}) {
  return <div className="page"><SectionTitle eyebrow="STEP 5 • FINANCIAL CALCULATOR" title={t("calculator")}><Badge tone="amber">Illustrative calculation</Badge></SectionTitle><div className="calc-layout"><div className="card"><h3>{t("loanInputs")}</h3><label>Loan amount (₹)<input type="number" value={loan} onChange={e=>setLoan(Number(e.target.value))}/></label><label>Interest rate (%)<input type="number" step="0.1" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label><label>Tenure (years)<input type="number" step="0.5" value={years} onChange={e=>setYears(Number(e.target.value))}/></label><Button onClick={onCalc}>{t("calculateEMI")} <Calculator/></Button><p className="hint">EMI = P × r × (1+r)^n / ((1+r)^n − 1)</p></div><div className="calc-results"><StatCard icon={WalletCards} label="Monthly EMI" value={money(emi.monthly_emi)}/><StatCard icon={Calculator} label="Total Interest" value={money(emi.total_interest)}/><StatCard icon={Landmark} label="Total Repayment" value={money(emi.total_repayment)}/><div className="disclaimer">Illustrative calculation for prototype purposes.</div></div></div><div className="actions"><Button onClick={onNext}>Route to Partner <MapPin/></Button></div></div>
}

function Route({partner,scheme,onNext,t}) {
  return <div className="page"><SectionTitle eyebrow="STEP 6 • CHANNEL PARTNER" title={t("partner")}><Badge tone="amber">Demo partner data</Badge></SectionTitle><div className="recommended"><div className="rec-icon"><MapPin/></div><div><Badge tone="green">Recommended Partner</Badge><h3>{partner.name}</h3><p>{partner.district} • {partner.distance_km} km away</p><p>Supports: {scheme?.name || "Selected demo scheme"}</p></div><div className="recommend-reasons"><b>Routing logic</b><span>1. Scheme compatibility</span><span>2. Location</span><span>3. Distance</span></div></div><div className="partner-grid">{demoPartners.map(p=><div className={`partner ${p.id===partner.id?"selected":""}`} key={p.id}><MapPin/><b>{p.name}</b><span>{p.district}</span><span>{p.distance_km} km</span></div>)}</div><div className="actions"><Button onClick={onNext}>{t("viewDocuments")} <FileText/></Button></div></div>
}

function Documents({onNext,t}) {
  return <div className="page"><SectionTitle eyebrow="STEP 7 • DOCUMENTS" title={t("documents")}><Badge tone="blue">{t("noUpload")}</Badge></SectionTitle><div className="card doc-list">{demoDocuments.map(([name,status,why])=><div className="doc-row" key={name}><div className="doc-check">✓</div><div><b>{name}</b><p>{why}</p></div><Badge tone="green">{status}</Badge><button>{t("upload")}</button></div>)}</div><div className="actions"><Button onClick={onNext}>{t("continueApplication")} <ChevronRight/></Button></div></div>
}

function Apply({application,onApply,t}) {
  return <div className="page"><SectionTitle eyebrow="STEP 8 • APPLICATION GUIDANCE" title={t("application")}><Badge tone="violet">Demo journey</Badge></SectionTitle><div className="timeline">{["Check eligibility","Prepare documents","Contact recommended partner","Submit application","Application review","Track application"].map((x,i)=><div className="timeline-item" key={x}><div>{i+1}</div><b>{x}</b><span>{i===2?"Use the demo partner recommendation to understand routing.":i===3?"Submission is represented locally in this MVP.":"Complete this step before moving forward."}</span></div>)}</div><div className="apply-card"><div><b>Demo Application</b><h2>{application?.application_id || "SSA-DEMO-2026-001"}</h2><p>{application?.status || "Not submitted yet"}</p></div>{!application&&<Button onClick={onApply}>{t("createApplication")} <ShieldCheck/></Button>}</div><div className="final-message"><Sparkles/><div><b>SchemeSarthi AI transforms scheme discovery from a confusing search process into an explainable journey:</b><strong> Discover → Understand → Calculate → Route → Apply.</strong><p>Demo application — not submitted to any government department.</p></div></div></div>
}
