"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── API helper ────────────────────────────────────────────────────────────────
async function callAPI(action, payload) {
  const res = await fetch("/api/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error("API error");
  const { result } = await res.json();
  return result;
}

// ─── PDF Export ────────────────────────────────────────────────────────────────
async function exportPDF({ questions, answers, feedbacks, summary, avgScore, jobDesc }) {
  const { PDFDocument, rgb, StandardFonts } = await import(
    "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.esm.min.js"
  );
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  const navy  = rgb(0.11, 0.18, 0.33);
  const blue  = rgb(0.15, 0.35, 0.65);
  const slate = rgb(0.45, 0.5, 0.58);
  const white = rgb(1, 1, 1);
  const green = rgb(0.13, 0.6, 0.35);
  const amber = rgb(0.85, 0.55, 0.05);
  const red   = rgb(0.85, 0.25, 0.25);

  const scoreColor = (s) => (s >= 8 ? green : s >= 6 ? amber : red);

  function wrapText(text, maxWidth, font, size) {
    const words = text.split(" ");
    const lines = []; let line = "";
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxWidth && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }

  function addPage() {
    const page = doc.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 800, width: 595, height: 42, color: white });
    page.drawLine({ start: { x: 0, y: 800 }, end: { x: 595, y: 800 }, thickness: 1, color: rgb(0.88,0.9,0.93) });
    page.drawText("interview.AI", { x: 28, y: 817, size: 14, font: fontBold, color: navy });
    page.drawText("Mock Interview Report", { x: 28, y: 803, size: 8, font: fontReg, color: slate });
    return { page, y: 770 };
  }

  let { page, y } = addPage();
  page.drawText("Interview Results", { x: 28, y, size: 22, font: fontBold, color: navy });
  y -= 28;

  const scoreLabel = `Overall Score: ${avgScore}/10`;
  page.drawRectangle({ x: 28, y: y - 4, width: 160, height: 22, color: scoreColor(avgScore) });
  page.drawText(scoreLabel, { x: 34, y: y + 2, size: 11, font: fontBold, color: white });
  y -= 36;

  const jobSnip = jobDesc.slice(0, 120).replace(/\n/g, " ") + (jobDesc.length > 120 ? "…" : "");
  page.drawText("Role:", { x: 28, y, size: 9, font: fontBold, color: slate });
  page.drawText(jobSnip, { x: 60, y, size: 9, font: fontReg, color: slate });
  y -= 28;

  page.drawLine({ start: { x: 28, y }, end: { x: 567, y }, thickness: 0.5, color: rgb(0.85,0.87,0.9) });
  y -= 20;
  page.drawText("Coaching Summary", { x: 28, y, size: 13, font: fontBold, color: navy });
  y -= 18;

  for (const line of wrapText(summary, 510, fontReg, 10)) {
    if (y < 60) { ({ page, y } = addPage()); y -= 20; }
    page.drawText(line, { x: 28, y, size: 10, font: fontReg, color: rgb(0.25,0.3,0.4) });
    y -= 15;
  }

  y -= 20;
  page.drawLine({ start: { x: 28, y }, end: { x: 567, y }, thickness: 0.5, color: rgb(0.85,0.87,0.9) });
  y -= 20;
  page.drawText("Question Breakdown", { x: 28, y, size: 13, font: fontBold, color: navy });
  y -= 22;

  for (let i = 0; i < questions.length; i++) {
    if (y < 120) { ({ page, y } = addPage()); y -= 20; }
    const sc = feedbacks[i]?.score ?? 0;
    page.drawText(`Q${i + 1}`, { x: 28, y, size: 10, font: fontBold, color: blue });
    const pill = `${sc}/10`;
    const pillW = fontBold.widthOfTextAtSize(pill, 9) + 10;
    page.drawRectangle({ x: 567 - pillW, y: y - 3, width: pillW, height: 16, color: scoreColor(sc) });
    page.drawText(pill, { x: 570 - pillW + 5, y: y + 1, size: 9, font: fontBold, color: white });
    y -= 16;

    for (const l of wrapText(questions[i], 520, fontBold, 10)) {
      if (y < 60) { ({ page, y } = addPage()); y -= 20; }
      page.drawText(l, { x: 28, y, size: 10, font: fontBold, color: navy });
      y -= 14;
    }
    y -= 4;
    page.drawText("Your answer:", { x: 28, y, size: 8, font: fontBold, color: slate });
    y -= 13;
    for (const l of wrapText(answers[i] || "—", 510, fontReg, 9)) {
      if (y < 60) { ({ page, y } = addPage()); y -= 20; }
      page.drawText(l, { x: 36, y, size: 9, font: fontReg, color: rgb(0.35,0.4,0.5) });
      y -= 13;
    }
    y -= 4;
    page.drawText("Feedback:", { x: 28, y, size: 8, font: fontBold, color: slate });
    y -= 13;
    for (const l of wrapText(feedbacks[i]?.feedback || "—", 510, fontReg, 9)) {
      if (y < 60) { ({ page, y } = addPage()); y -= 20; }
      page.drawText(l, { x: 36, y, size: 9, font: fontReg, color: rgb(0.15,0.45,0.3) });
      y -= 13;
    }
    y -= 18;
    if (i < questions.length - 1) {
      page.drawLine({ start: { x: 28, y }, end: { x: 567, y }, thickness: 0.4, color: rgb(0.9,0.91,0.93) });
      y -= 16;
    }
  }

  page.drawText(`Generated by interview.AI · ${new Date().toLocaleDateString()}`, {
    x: 28, y: 28, size: 8, font: fontReg, color: slate,
  });

  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "interview-report.pdf"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Styles — light theme matching reference ───────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #FFFFFF; color: #18233E; }

  .navbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 48px; border-bottom: 1px solid #EEF0F4;
  }
  .nav-logo { display:flex; align-items:center; gap:6px; font-size:24px; font-weight:800; color:#18233E; }
  .nav-logo .ai { color:#2563EB; }
  .nav-logo svg { color: #2563EB; }
  .nav-links { display:flex; align-items:center; gap:36px; }
  .nav-links a { color:#18233E; text-decoration:none; font-size:15px; font-weight:500; cursor:pointer; }
  .nav-links a:hover { color:#2563EB; }
  .nav-actions { display:flex; align-items:center; gap:20px; }
  .btn-signup {
    background:#1E3A8A; color:#fff; padding:10px 22px; border-radius:8px;
    font-size:15px; font-weight:600; border:none; cursor:pointer; transition:background .2s;
  }
  .btn-signup:hover { background:#1E40AF; }
  .link-login { font-size:15px; font-weight:500; color:#18233E; cursor:pointer; text-decoration:none; }

  .hero {
    background:#F4F6FB; padding:64px 48px 72px;
    display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center;
  }
  .hero-title { font-size:56px; font-weight:800; line-height:1.08; letter-spacing:-1px; color:#18233E; margin-bottom:20px; }
  .hero-title .accent { color:#2563EB; }
  .hero-sub { font-size:17px; line-height:1.6; color:#4B5566; margin-bottom:28px; max-width:520px; }
  .btn-hero {
    background:#1E3A8A; color:#fff; padding:15px 28px; border-radius:8px;
    font-size:16px; font-weight:700; border:none; cursor:pointer; transition:background .2s, transform .1s;
  }
  .btn-hero:hover { background:#1E40AF; }
  .btn-hero:active { transform: scale(0.98); }

  .hero-visual {
    background: linear-gradient(135deg, #DCE6FB 0%, #EFF3FC 100%);
    border-radius:16px; aspect-ratio:16/10.5; position:relative; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
  }
  .hero-card {
    background:#fff; border-radius:14px; padding:24px; width:78%;
    box-shadow:0 20px 50px rgba(30,58,138,0.12); display:flex; flex-direction:column; gap:14px;
  }
  .hero-card-row { display:flex; align-items:center; gap:12px; }
  .hero-avatar { width:38px; height:38px; border-radius:50%; background:#2563EB; flex-shrink:0; }
  .hero-card-bar { height:8px; border-radius:4px; background:#E5EAF5; flex:1; }
  .hero-card-bar.short { width: 60%; flex: none; }
  .hero-score-badge {
    align-self:flex-end; background:#DCFCE7; color:#15803D; font-size:13px; font-weight:700;
    padding:5px 14px; border-radius:20px;
  }

  .features { padding:72px 48px; text-align:center; }
  .features-title { font-size:28px; font-weight:800; color:#18233E; margin-bottom:48px; }
  .features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:40px; max-width:1000px; margin:0 auto; }
  .feature-icon {
    width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center;
    margin:0 auto 16px; font-size:22px;
  }
  .feature-icon.blue { background:#DCE6FB; }
  .feature-icon.green { background:#DCFCE7; }
  .feature-icon.amber { background:#FEF3D6; }
  .feature-title { font-size:17px; font-weight:700; color:#18233E; margin-bottom:8px; }
  .feature-desc { font-size:14px; color:#64748B; line-height:1.6; }

  .testimonials { display:flex; justify-content:center; gap:48px; margin-top:48px; flex-wrap:wrap; }
  .testimonial { display:flex; align-items:center; gap:10px; max-width:260px; text-align:left; }
  .testimonial-avatar { width:40px; height:40px; border-radius:50%; flex-shrink:0;
    background:linear-gradient(135deg,#93C5FD,#2563EB); }
  .testimonial p { font-size:13px; color:#374151; font-style:italic; line-height:1.5; }

  .cta-row { margin-top:48px; }
  .btn-cta {
    background:#1E3A8A; color:#fff; padding:15px 32px; border-radius:8px;
    font-size:16px; font-weight:700; border:none; cursor:pointer; transition:background .2s;
  }
  .btn-cta:hover { background:#1E40AF; }
  .cta-note { font-size:13px; color:#94A3B8; margin-top:10px; }

  .app-section { background:#F8F9FC; padding:64px 48px; border-top:1px solid #EEF0F4; }
  .app-container { max-width:720px; margin:0 auto; }

  .progress-track { height:4px; background:#E5E9F2; border-radius:2px; overflow:hidden; margin-bottom:36px; }
  .progress-fill { height:100%; background:#2563EB; transition:width .5s cubic-bezier(.4,0,.2,1); }

  .section-eyebrow { font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#2563EB; margin-bottom:10px; }
  .section-title { font-size:32px; font-weight:800; color:#18233E; margin-bottom:14px; letter-spacing:-0.5px; }
  .section-sub { font-size:15px; color:#64748B; line-height:1.6; margin-bottom:32px; max-width:520px; }

  .card { background:#fff; border:1px solid #E5E9F2; border-radius:14px; padding:26px; margin-bottom:20px; box-shadow:0 1px 2px rgba(16,24,40,0.04); }
  .card-label { font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#64748B; margin-bottom:10px; }

  textarea {
    width:100%; background:#F8F9FC; border:1px solid #DDE2EC; border-radius:10px;
    color:#18233E; font-family:'Inter',sans-serif; font-size:14px; line-height:1.6;
    padding:14px 16px; resize:vertical; outline:none; transition:border-color .2s;
  }
  textarea:focus { border-color:#2563EB; background:#fff; }
  textarea::placeholder { color:#94A3B8; }

  .btn-primary {
    width:100%; padding:15px; background:#1E3A8A; color:#fff; font-size:15px; font-weight:700;
    border:none; border-radius:10px; cursor:pointer; transition:background .2s, transform .1s;
    display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .btn-primary:hover:not(:disabled) { background:#1E40AF; }
  .btn-primary:active:not(:disabled) { transform:scale(0.99); }
  .btn-primary:disabled { opacity:0.45; cursor:not-allowed; }

  .btn-secondary {
    padding:13px 20px; background:#fff; color:#18233E; font-size:14px; font-weight:600;
    border:1px solid #DDE2EC; border-radius:10px; cursor:pointer; transition:all .2s;
    display:flex; align-items:center; gap:6px;
  }
  .btn-secondary:hover { border-color:#2563EB; color:#2563EB; }
  .btn-secondary:disabled { opacity:0.4; cursor:not-allowed; }

  .voice-btn {
    padding:13px 18px; background:#fff; color:#18233E; font-size:14px; font-weight:600;
    border:1px solid #DDE2EC; border-radius:10px; cursor:pointer; transition:all .2s;
    display:flex; align-items:center; gap:6px; white-space:nowrap;
  }
  .voice-btn.recording { background:#FEF2F2; border-color:#FCA5A5; color:#DC2626; animation:pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.25)} 50%{box-shadow:0 0 0 6px rgba(220,38,38,0)} }

  .q-meta { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
  .q-counter { font-size:13px; font-weight:700; letter-spacing:.5px; color:#64748B; text-transform:uppercase; }
  .q-counter span { color:#2563EB; }

  .question-box { background:#EEF3FE; border:1px solid #D6E2FA; border-radius:14px; padding:24px; margin-bottom:24px; }
  .question-text { font-size:17px; font-weight:600; line-height:1.55; color:#18233E; }

  .answer-label { font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#64748B; margin-bottom:8px; }
  .action-row { display:flex; gap:12px; margin-top:16px; }
  .action-row .btn-primary { flex:1; }

  .feedback-card { margin-top:20px; border-radius:14px; overflow:hidden; border:1px solid #E5E9F2; }
  .feedback-header { padding:14px 20px; display:flex; align-items:center; justify-content:space-between; background:#F8F9FC; }
  .feedback-title { font-size:13px; font-weight:700; color:#64748B; letter-spacing:.5px; }
  .feedback-body { padding:20px; font-size:14px; line-height:1.7; color:#374151; background:#fff; white-space:pre-wrap; }

  .score-pill { font-size:14px; font-weight:800; padding:4px 14px; border-radius:20px; }
  .score-high { background:#DCFCE7; color:#15803D; }
  .score-mid  { background:#FEF3D6; color:#B45309; }
  .score-low  { background:#FEE2E2; color:#DC2626; }

  .results-header { text-align:center; margin-bottom:36px; }
  .results-title { font-size:30px; font-weight:800; color:#18233E; margin-bottom:8px; letter-spacing:-0.5px; }
  .results-sub { color:#64748B; font-size:15px; }

  .score-ring-wrap { display:flex; justify-content:center; margin:28px 0 36px; }
  .score-ring { width:120px; height:120px; border-radius:50%; background:#fff; display:flex; flex-direction:column;
    align-items:center; justify-content:center; border:4px solid; box-shadow:0 4px 16px rgba(16,24,40,0.06); }
  .score-ring-num { font-size:36px; font-weight:800; line-height:1; }
  .score-ring-label { font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-top:2px; color:#94A3B8; }

  .summary-card { background:#fff; border:1px solid #E5E9F2; border-radius:14px; padding:26px; margin-bottom:20px;
    font-size:14px; line-height:1.8; color:#374151; white-space:pre-wrap; }

  .q-result { background:#fff; border:1px solid #E5E9F2; border-radius:12px; padding:20px; margin-bottom:12px; }
  .q-result-top { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
  .q-result-q { font-size:14px; font-weight:600; color:#18233E; flex:1; }
  .q-result-feedback { font-size:13px; color:#64748B; line-height:1.6; }

  .results-actions { display:flex; gap:12px; margin-top:28px; flex-wrap:wrap; }
  .results-actions .btn-primary { flex:1; min-width:180px; }

  .loading-dots { display:flex; gap:5px; align-items:center; }
  .loading-dots span { width:5px; height:5px; background:currentColor; border-radius:50%; animation:bounce 1.2s infinite; }
  .loading-dots span:nth-child(2) { animation-delay:.2s; }
  .loading-dots span:nth-child(3) { animation-delay:.4s; }
  @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }

  .breakdown-title { font-size:13px; font-weight:700; color:#64748B; letter-spacing:1px; text-transform:uppercase; margin-bottom:16px; }

  .footer { background:#1A2233; padding:32px 48px; text-align:center; }
  .footer-links { display:flex; justify-content:center; gap:28px; margin-bottom:14px; }
  .footer-links a { color:#CBD5E1; text-decoration:none; font-size:14px; }
  .footer-links a:hover { color:#fff; }
  .footer-copy { color:#7C8AA5; font-size:13px; }

  @media (max-width: 860px) {
    .hero { grid-template-columns:1fr; }
    .nav-links { display:none; }
    .features-grid { grid-template-columns:1fr; }
    .hero-title { font-size:38px; }
  }
`;

function ScorePill({ score }) {
  const cls = score >= 8 ? "score-high" : score >= 6 ? "score-mid" : "score-low";
  return <span className={`score-pill ${cls}`}>{score}/10</span>;
}
function ScoreRing({ avg }) {
  const color = avg >= 8 ? "#15803D" : avg >= 6 ? "#B45309" : "#DC2626";
  return (
    <div className="score-ring-wrap">
      <div className="score-ring" style={{ borderColor: color }}>
        <span className="score-ring-num" style={{ color }}>{avg}</span>
        <span className="score-ring-label">avg score</span>
      </div>
    </div>
  );
}
function Spinner() { return <div className="loading-dots"><span/><span/><span/></div>; }

function Logo() {
  return (
    <div className="nav-logo">
      interview<span className="ai">.AI</span>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16v11H7l-3 3V4z" fill="currentColor" opacity="0.9"/>
      </svg>
    </div>
  );
}

function useVoice(onTranscript) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      setSupported(true);
      const r = new SR();
      r.continuous = false; r.interimResults = false; r.lang = "en-US";
      r.onresult = (e) => onTranscript(Array.from(e.results).map(x => x[0].transcript).join(" "));
      r.onend = () => setRecording(false);
      r.onerror = () => setRecording(false);
      recogRef.current = r;
    }
  }, [onTranscript]);

  const toggle = useCallback(() => {
    if (!recogRef.current) return;
    if (recording) recogRef.current.stop();
    else { recogRef.current.start(); setRecording(true); }
  }, [recording]);

  return { recording, supported, toggle };
}

export default function App() {
  const [stage, setStage] = useState("setup");
  const [jobDesc, setJobDesc] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const appRef = useRef(null);

  const handleTranscript = useCallback((text) => {
    setAnswer(prev => prev ? `${prev} ${text}` : text);
  }, []);
  const { recording, supported, toggle } = useVoice(handleTranscript);

  function scrollToApp() {
    setTimeout(() => appRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const progress =
    stage === "interviewing" ? Math.round(((currentQ + (showFeedback ? 1 : 0)) / 5) * 85) :
    stage === "results" ? 100 : 0;

  async function startInterview() {
    if (!jobDesc.trim()) return;
    setLoading(true);
    try {
      const text = await callAPI("generate_questions", { jobDesc });
      const clean = text.replace(/```json|```/g, "").trim();
      setQuestions(JSON.parse(clean));
      setStage("interviewing");
    } catch { alert("Error generating questions. Check your API setup."); }
    setLoading(false);
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const text = await callAPI("evaluate_answer", { jobDesc, question: questions[currentQ], answer });
      const clean = text.replace(/```json|```/g, "").trim();
      const result = JSON.parse(clean);
      setFeedbacks(prev => [...prev, result]);
      setAnswers(prev => [...prev, answer]);
      setShowFeedback(true);
    } catch { alert("Error evaluating answer. Try again."); }
    setLoading(false);
  }

  async function nextQuestion() {
    if (currentQ < 4) {
      setCurrentQ(q => q + 1); setAnswer(""); setShowFeedback(false);
    } else {
      setLoading(true);
      try {
        const qa = questions.map((q, i) => ({ question: q, answer: answers[i], score: feedbacks[i]?.score }));
        const text = await callAPI("generate_summary", { questionsAndAnswers: qa });
        setSummary(text);
        setStage("results");
      } catch { alert("Error generating summary."); }
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    setExportingPDF(true);
    try {
      await exportPDF({
        questions, answers, feedbacks, summary,
        avgScore: Math.round(feedbacks.reduce((s, f) => s + f.score, 0) / feedbacks.length),
        jobDesc,
      });
    } catch (e) { alert("PDF export failed: " + e.message); }
    setExportingPDF(false);
  }

  function restart() {
    setStage("setup"); setJobDesc(""); setQuestions([]); setCurrentQ(0);
    setAnswer(""); setFeedbacks([]); setAnswers([]); setSummary(""); setShowFeedback(false);
  }

  const avgScore = feedbacks.length
    ? Math.round(feedbacks.reduce((s, f) => s + f.score, 0) / feedbacks.length) : 0;

  return (
    <>
      <style>{css}</style>

      <nav className="navbar">
        <Logo />
        <div className="nav-links">
          <a onClick={scrollToApp}>How It Works</a>
          <a>Pricing</a>
          <a>About Us</a>
        </div>
        <div className="nav-actions">
          <button className="btn-signup" onClick={scrollToApp}>Sign Up</button>
          <a className="link-login">Log In</a>
        </div>
      </nav>

      <section className="hero">
        <div>
          <h1 className="hero-title">Master Your<br />Interviews with <span className="accent">AI.</span></h1>
          <p className="hero-sub">
            Practice realistic interview scenarios, get instant feedback, and boost your
            confidence. Your dream job is within reach.
          </p>
          <button className="btn-hero" onClick={scrollToApp}>Start Free Practice</button>
        </div>
        <div className="hero-visual">
          <div className="hero-card">
            <div className="hero-card-row">
              <div className="hero-avatar" />
              <div className="hero-card-bar" />
            </div>
            <div className="hero-card-bar short" />
            <div className="hero-card-bar" />
            <div className="hero-card-bar short" />
            <span className="hero-score-badge">Score: 8/10</span>
          </div>
        </div>
      </section>

      <section className="features">
        <h2 className="features-title">Why Choose Interview.AI?</h2>
        <div className="features-grid">
          <div>
            <div className="feature-icon blue">🎙️</div>
            <p className="feature-title">AI Mock Interviews</p>
            <p className="feature-desc">Real-time practice with role-specific questions</p>
          </div>
          <div>
            <div className="feature-icon green">📊</div>
            <p className="feature-title">Instant Performance Feedback</p>
            <p className="feature-desc">Analyze your answers, scoring, and clarity</p>
          </div>
          <div>
            <div className="feature-icon amber">🎯</div>
            <p className="feature-title">Tailored to Your Industry</p>
            <p className="feature-desc">Question sets generated from any job description</p>
          </div>
        </div>

        <div className="testimonials">
          <div className="testimonial">
            <div className="testimonial-avatar" />
            <p>"Interview.AI helped me land my senior analyst role!"</p>
          </div>
          <div className="testimonial">
            <div className="testimonial-avatar" />
            <p>"The feedback was so specific — I knew exactly what to fix."</p>
          </div>
          <div className="testimonial">
            <div className="testimonial-avatar" />
            <p>"Best free interview prep tool I've used."</p>
          </div>
        </div>

        <div className="cta-row">
          <button className="btn-cta" onClick={scrollToApp}>Get Started for Free</button>
          <p className="cta-note">No credit card required</p>
        </div>
      </section>

      <section className="app-section" ref={appRef}>
        <div className="app-container">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

          {stage === "setup" && (
            <>
              <p className="section-eyebrow">Step 1</p>
              <h2 className="section-title">Paste a job description</h2>
              <p className="section-sub">We'll generate 5 tailored interview questions based on the role.</p>
              <div className="card">
                <p className="card-label">Job Description</p>
                <textarea rows={8} placeholder="Paste the full job description — role, requirements, responsibilities…"
                  value={jobDesc} onChange={e => setJobDesc(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={startInterview} disabled={loading || !jobDesc.trim()}>
                {loading ? <><Spinner /> Generating questions…</> : "Start Mock Interview →"}
              </button>
            </>
          )}

          {stage === "interviewing" && (
            <>
              <div className="q-meta">
                <span className="q-counter">Question <span>{currentQ + 1}</span> of 5</span>
                {feedbacks.length > 0 && (
                  <span style={{ fontSize: 13, color: "#64748B" }}>
                    Avg so far: <strong style={{ color: "#18233E" }}>
                      {Math.round(feedbacks.reduce((s,f)=>s+f.score,0)/feedbacks.length)}/10
                    </strong>
                  </span>
                )}
              </div>

              <div className="question-box"><p className="question-text">{questions[currentQ]}</p></div>

              {!showFeedback ? (
                <>
                  <p className="answer-label">Your Answer</p>
                  <textarea rows={6} placeholder="Type your answer — or use the mic button to speak it."
                    value={answer} onChange={e => setAnswer(e.target.value)} />
                  <div className="action-row">
                    {supported && (
                      <button className={`voice-btn${recording ? " recording" : ""}`} onClick={toggle}>
                        {recording ? "⏹ Stop" : "🎙 Speak"}
                      </button>
                    )}
                    <button className="btn-primary" onClick={submitAnswer} disabled={loading || !answer.trim()}>
                      {loading ? <><Spinner /> Evaluating…</> : "Submit Answer"}
                    </button>
                  </div>
                  {recording && <p style={{ marginTop: 10, fontSize: 12, color: "#DC2626" }}>🔴 Listening — speak clearly, then click Stop</p>}
                </>
              ) : (
                <>
                  <div className="feedback-card">
                    <div className="feedback-header">
                      <span className="feedback-title">AI Feedback</span>
                      <ScorePill score={feedbacks[feedbacks.length - 1]?.score} />
                    </div>
                    <div className="feedback-body">{feedbacks[feedbacks.length - 1]?.feedback}</div>
                  </div>
                  <div className="action-row" style={{ marginTop: 16 }}>
                    <button className="btn-primary" onClick={nextQuestion} disabled={loading}>
                      {loading ? <><Spinner /> {currentQ < 4 ? "Loading…" : "Generating summary…"}</>
                        : currentQ < 4 ? "Next Question →" : "See Full Results →"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {stage === "results" && (
            <>
              <div className="results-header">
                <p className="section-eyebrow">Interview Complete</p>
                <h2 className="results-title">
                  {avgScore >= 8 ? "Excellent performance 🎉" : avgScore >= 6 ? "Solid effort 💪" : "Keep practicing 📈"}
                </h2>
                <p className="results-sub">Here's your full breakdown</p>
              </div>

              <ScoreRing avg={avgScore} />
              <div className="summary-card">{summary}</div>

              <p className="breakdown-title">Question Breakdown</p>
              {questions.map((q, i) => (
                <div className="q-result" key={i}>
                  <div className="q-result-top">
                    <p className="q-result-q">{q}</p>
                    <ScorePill score={feedbacks[i]?.score} />
                  </div>
                  <p className="q-result-feedback">{feedbacks[i]?.feedback}</p>
                </div>
              ))}

              <div className="results-actions">
                <button className="btn-secondary" onClick={handleExportPDF} disabled={exportingPDF}>
                  {exportingPDF ? <><Spinner /> Exporting…</> : "⬇ Export PDF Report"}
                </button>
                <button className="btn-primary" onClick={restart}>Practice Again →</button>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-links">
          <a>Privacy Policy</a><a>Terms of Service</a><a>Contact</a>
        </div>
        <p className="footer-copy">© 2026 Interview.AI Inc. All rights reserved.</p>
      </footer>
    </>
  );
}
