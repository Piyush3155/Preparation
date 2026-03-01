"use client";
import React, { useState, useEffect, useCallback } from "react";
import { QuizCategory } from "../page";

interface Question {
    id: number; question: string; options: string[]; correctAnswer: number; explanation: string;
}

const categoryLabels: Record<QuizCategory, string> = {
    databases: "Databases & SQL", dsa: "Data Structures & Algorithms", "system-design": "System Design",
    javascript: "JavaScript", python: "Python", react: "React", nodejs: "Node.js",
    os: "Operating Systems", networking: "Networking", general: "General CS",
};

export default function QuizPage({ category, onBack }: { category: QuizCategory; onBack: () => void }) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showExplanation, setShowExplanation] = useState(false);

    const fetchQuestions = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const res = await fetch("/api/gemini", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: `Generate 10 interview questions about: ${categoryLabels[category]}`, type: "generate_quiz" }),
            });
            const data = await res.json();
            if (data.error) { setError(data.error); return; }
            let text = data.result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(text);
            setQuestions(parsed.questions);
        } catch {
            setError("Failed to generate questions. Please check your API key and try again.");
        } finally { setLoading(false); }
    }, [category]);

    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    const handleSelect = (idx: number) => {
        if (answered) return;
        setSelected(idx); setAnswered(true);
        if (idx === questions[current].correctAnswer) setScore((s) => s + 1);
    };

    const handleNext = () => {
        if (current < questions.length - 1) {
            setCurrent((c) => c + 1); setSelected(null); setAnswered(false); setShowExplanation(false);
        } else { setFinished(true); }
    };

    const restart = () => {
        setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setFinished(false); setShowExplanation(false); fetchQuestions();
    };

    if (loading) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20 }}>
            <div className="spinner" />
            <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>Generating quiz questions with AI...</p>
        </div>
    );

    if (error) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20, padding: 40 }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <p style={{ color: "var(--accent-danger)", fontSize: 15, textAlign: "center", maxWidth: 500 }}>{error}</p>
            <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-primary" onClick={fetchQuestions}>Try Again</button>
                <button className="btn-secondary" onClick={onBack}>Go Back</button>
            </div>
        </div>
    );

    if (finished) {
        const pct = Math.round((score / questions.length) * 100);
        const grade = pct >= 80 ? { emoji: "🏆", text: "Excellent!", color: "#10b981" } : pct >= 60 ? { emoji: "👍", text: "Good Job!", color: "#f59e0b" } : { emoji: "📚", text: "Keep Practicing!", color: "#ef4444" };
        return (
            <div className="bg-dots" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 40 }}>
                <div className="animate-scale-in card" style={{ textAlign: "center", padding: 48, maxWidth: 480 }}>
                    <div style={{ fontSize: 72, marginBottom: 16 }}>{grade.emoji}</div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{grade.text}</h2>
                    <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 24 }}>
                        You scored <span style={{ color: grade.color, fontWeight: 700 }}>{score}/{questions.length}</span> ({pct}%)
                    </p>
                    <div className="progress-bar" style={{ marginBottom: 32 }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: grade.color }} />
                    </div>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <button className="btn-primary" onClick={restart}>Try Again</button>
                        <button className="btn-secondary" onClick={onBack}>Dashboard</button>
                    </div>
                </div>
            </div>
        );
    }

    const q = questions[current];

    return (
        <div className="bg-dots" style={{ padding: "40px 48px", minHeight: "100vh" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={onBack} className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>← Back</button>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{categoryLabels[category]} Quiz</h2>
                        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Question {current + 1} of {questions.length}</p>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span className="badge badge-green">Score: {score}</span>
                </div>
            </div>

            {/* Progress */}
            <div className="progress-bar" style={{ marginBottom: 32 }}>
                <div className="progress-bar-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>

            {/* Question Card */}
            <div className="animate-fade-in card" key={current} style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.6, marginBottom: 28, color: "var(--text-primary)" }}>
                    {q.question}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {q.options.map((opt, idx) => {
                        let bg = "var(--bg-tertiary)";
                        let border = "var(--border-color)";
                        let color = "var(--text-secondary)";
                        if (answered) {
                            if (idx === q.correctAnswer) { bg = "rgba(16,185,129,0.12)"; border = "#10b981"; color = "#34d399"; }
                            else if (idx === selected && idx !== q.correctAnswer) { bg = "rgba(239,68,68,0.12)"; border = "#ef4444"; color = "#f87171"; }
                        } else if (idx === selected) { bg = "rgba(124,58,237,0.12)"; border = "var(--accent-primary)"; color = "#a78bfa"; }

                        return (
                            <button key={idx} onClick={() => handleSelect(idx)} style={{
                                display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                                background: bg, border: `1px solid ${border}`, borderRadius: "var(--radius-md)",
                                cursor: answered ? "default" : "pointer", textAlign: "left", fontSize: 15,
                                color, fontFamily: "var(--font-sans)", transition: "all var(--transition-fast)",
                            }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
                                    justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                                    background: answered && idx === q.correctAnswer ? "#10b981" : answered && idx === selected ? "#ef4444" : "var(--bg-card)",
                                    color: answered && (idx === q.correctAnswer || idx === selected) ? "white" : "var(--text-muted)",
                                }}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                {opt}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation & Next */}
                {answered && (
                    <div className="animate-fade-in" style={{ marginTop: 24 }}>
                        {showExplanation && (
                            <div style={{ padding: 20, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: "3px solid var(--accent-primary)" }}>
                                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{q.explanation}</p>
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 12 }}>
                            <button className="btn-secondary" onClick={() => setShowExplanation(!showExplanation)} style={{ fontSize: 13, padding: "10px 20px" }}>
                                {showExplanation ? "Hide" : "Show"} Explanation
                            </button>
                            <button className="btn-primary" onClick={handleNext} style={{ fontSize: 13, padding: "10px 20px" }}>
                                {current < questions.length - 1 ? "Next Question →" : "See Results"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
