"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface DSAProblem {
    title: string; difficulty: string; description: string;
    examples: { input: string; output: string; explanation: string }[];
    constraints: string[]; hints: string[];
    starterCode: Record<string, string>;
    solution: string; timeComplexity: string; spaceComplexity: string;
}

const topics = [
    "Arrays", "Strings", "Linked Lists", "Stacks & Queues", "Trees",
    "Binary Search", "Dynamic Programming", "Graphs", "Sorting",
    "Hash Maps", "Two Pointers", "Sliding Window", "Recursion", "Greedy",
];

const diffBadge: Record<string, { cls: string }> = {
    Easy: { cls: "badge-green" },
    Medium: { cls: "badge-amber" },
    Hard: { cls: "badge-red" },
};

export default function DSAEditor() {
    const [problem, setProblem] = useState<DSAProblem | null>(null);
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [loading, setLoading] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [review, setReview] = useState("");
    const [showSolution, setShowSolution] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState("");

    const generateProblem = async (topic: string) => {
        setLoading(true); setProblem(null); setReview(""); setShowSolution(false); setShowHints(false);
        setSelectedTopic(topic);
        try {
            const res = await fetch("/api/gemini", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: `Generate a coding interview problem about: ${topic}. Make it a medium difficulty problem suitable for technical interviews.`, type: "dsa_generate" }),
            });
            const data = await res.json();
            if (data.error) return;
            let text = data.result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed: DSAProblem = JSON.parse(text);
            setProblem(parsed);
            setCode(parsed.starterCode[language] || parsed.starterCode.javascript || "// Your code here");
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const reviewCode = async () => {
        if (!code.trim() || !problem) return;
        setReviewing(true); setReview("");
        try {
            const res = await fetch("/api/gemini", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: `Problem: ${problem.title}\n${problem.description}\n\nLanguage: ${language}\nCode:\n${code}`, type: "dsa_review" }),
            });
            const data = await res.json();
            setReview(data.error || data.result);
        } catch { setReview("Failed to review code."); }
        finally { setReviewing(false); }
    };

    const switchLang = (lang: string) => {
        setLanguage(lang);
        if (problem?.starterCode[lang]) setCode(problem.starterCode[lang]);
    };

    // Topic Selection View
    if (!problem && !loading) {
        return (
            <div className="bg-dots" style={{ padding: "40px 48px", minHeight: "100vh" }}>
                <div className="animate-fade-in-up" style={{ marginBottom: 36 }}>
                    <span className="badge badge-purple" style={{ marginBottom: 12, display: "inline-flex" }}>🧩 Practice Mode</span>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>DSA Problem Solver</h1>
                    <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 560 }}>
                        Select a topic to get an AI-generated coding problem. Write your solution and get instant AI code review.
                    </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                    {topics.map((topic) => (
                        <button key={topic} onClick={() => generateProblem(topic)} className="card" style={{
                            cursor: "pointer", textAlign: "center", padding: "24px 16px",
                        }}>
                            <div style={{ fontSize: 28, marginBottom: 10 }}>
                                {topic === "Arrays" ? "📊" : topic === "Trees" ? "🌳" : topic === "Graphs" ? "🕸️" : topic === "Dynamic Programming" ? "🧮" : topic === "Sorting" ? "🔀" : "📐"}
                            </div>
                            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{topic}</h3>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (loading) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20 }}>
            <div className="spinner" />
            <p style={{ color: "var(--text-secondary)" }}>Generating a {selectedTopic} problem...</p>
        </div>
    );

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            {/* Problem Panel */}
            <div style={{ width: "40%", borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", background: "var(--bg-secondary)" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button className="btn-secondary" onClick={() => setProblem(null)} style={{ padding: "6px 14px", fontSize: 12 }}>← Topics</button>
                    <button className="btn-secondary" onClick={() => generateProblem(selectedTopic)} style={{ padding: "6px 14px", fontSize: 12 }}>🔄 New</button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                    {problem && (
                        <>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 800 }}>{problem.title}</h2>
                                <span className={`badge ${diffBadge[problem.difficulty]?.cls || "badge-amber"}`}>{problem.difficulty}</span>
                            </div>
                            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 20 }}>{problem.description}</p>

                            {/* Examples */}
                            {problem.examples.map((ex, i) => (
                                <div key={i} style={{ marginBottom: 16, padding: 16, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--accent-secondary)" }}>Example {i + 1}</h4>
                                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.6 }}>
                                        <p><strong style={{ color: "var(--text-primary)" }}>Input:</strong> <span style={{ color: "var(--text-secondary)" }}>{ex.input}</span></p>
                                        <p><strong style={{ color: "var(--text-primary)" }}>Output:</strong> <span style={{ color: "var(--accent-success)" }}>{ex.output}</span></p>
                                        {ex.explanation && <p style={{ color: "var(--text-muted)", marginTop: 4 }}>💡 {ex.explanation}</p>}
                                    </div>
                                </div>
                            ))}

                            {/* Constraints */}
                            <div style={{ marginBottom: 16 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Constraints</h4>
                                <ul style={{ listStyle: "none", padding: 0 }}>
                                    {problem.constraints.map((c, i) => (
                                        <li key={i} style={{ fontSize: 13, color: "var(--text-muted)", padding: "2px 0", fontFamily: "var(--font-mono)" }}>• {c}</li>
                                    ))}
                                </ul>
                            </div>

                            {/* Hints */}
                            <button className="btn-secondary" onClick={() => setShowHints(!showHints)} style={{ padding: "8px 16px", fontSize: 12, marginBottom: 12 }}>
                                {showHints ? "Hide" : "Show"} Hints
                            </button>
                            {showHints && problem.hints.map((h, i) => (
                                <p key={i} style={{ fontSize: 13, color: "var(--accent-tertiary)", padding: "4px 0" }}>💡 {h}</p>
                            ))}

                            {/* Solution */}
                            <button className="btn-secondary" onClick={() => setShowSolution(!showSolution)} style={{ padding: "8px 16px", fontSize: 12, marginLeft: 8 }}>
                                {showSolution ? "Hide" : "Show"} Solution
                            </button>
                            {showSolution && (
                                <div style={{ marginTop: 12, padding: 16, background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--accent-success)" }}>
                                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{problem.solution}</p>
                                    <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: 12 }}>
                                        <span style={{ color: "var(--accent-secondary)" }}>⏱ {problem.timeComplexity}</span>
                                        <span style={{ color: "var(--accent-tertiary)" }}>💾 {problem.spaceComplexity}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Code Editor Panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Editor Header */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                        {["javascript", "python", "java", "cpp"].map((lang) => (
                            <button key={lang} onClick={() => switchLang(lang)}
                                className={language === lang ? "tab-btn active" : "tab-btn"}
                                style={{ padding: "6px 14px", fontSize: 12 }}>
                                {lang === "cpp" ? "C++" : lang.charAt(0).toUpperCase() + lang.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" onClick={reviewCode} disabled={reviewing} style={{ padding: "8px 18px", fontSize: 13 }}>
                            {reviewing ? "Reviewing..." : "🤖 Review Code"}
                        </button>
                    </div>
                </div>

                {/* Editor */}
                <div style={{ flex: 1 }}>
                    <MonacoEditor
                        height="100%"
                        language={language === "cpp" ? "cpp" : language}
                        value={code}
                        onChange={(v) => setCode(v || "")}
                        theme="vs-dark"
                        options={{
                            fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                            minimap: { enabled: false }, padding: { top: 16 },
                            scrollBeyondLastLine: false, wordWrap: "on",
                            lineNumbers: "on", renderLineHighlight: "all",
                            bracketPairColorization: { enabled: true },
                        }}
                    />
                </div>

                {/* Review Panel */}
                {review && (
                    <div style={{ maxHeight: 250, overflowY: "auto", padding: 20, borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700 }}>🤖 AI Code Review</h3>
                            <button onClick={() => setReview("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>×</button>
                        </div>
                        <div className="markdown-content" style={{ fontSize: 13 }}
                            dangerouslySetInnerHTML={{ __html: review.replace(/\n/g, "<br/>").replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                    </div>
                )}
            </div>
        </div>
    );
}
