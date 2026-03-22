"use client";
import React, { useState, useRef, useCallback } from "react";

type Step = "input" | "processing" | "result";

export default function ResumeOptimizer() {
    const [step, setStep] = useState<Step>("input");
    const [resumeText, setResumeText] = useState("");
    const [jobRole, setJobRole] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [optimizedResume, setOptimizedResume] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [fileName, setFileName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeInputTab, setActiveInputTab] = useState<"paste" | "upload">("paste");

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setResumeText(ev.target?.result as string);
            };
            reader.readAsText(file);
        } else {
            setError("Please upload a .txt or .md file, or paste your resume content directly.");
            setFileName("");
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        setFileName(file.name);
        if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setResumeText(ev.target?.result as string);
            };
            reader.readAsText(file);
        } else {
            setError("Please upload a .txt or .md file.");
            setFileName("");
        }
    }, []);

    const handleOptimize = async () => {
        if (!resumeText.trim() || !jobRole.trim() || !jobDescription.trim()) {
            setError("Please fill in all three fields: Resume, Job Role, and Job Description.");
            return;
        }

        setError("");
        setIsLoading(true);
        setStep("processing");

        try {
            const prompt = `
ORIGINAL RESUME:
---
${resumeText}
---

TARGET JOB ROLE: ${jobRole}

JOB DESCRIPTION:
---
${jobDescription}
---

Please tailor the resume above for the given job role and description.`;

            const res = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, type: "resume_optimize" }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setOptimizedResume(data.result);
            setStep("result");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to optimize resume";
            setError(msg);
            setStep("input");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(optimizedResume);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* fallback ignored */
        }
    };

    const handleDownload = () => {
        const blob = new Blob([optimizedResume], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resume-${jobRole.replace(/\s+/g, "-").toLowerCase()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setStep("input");
        setOptimizedResume("");
        setError("");
        setCopied(false);
    };

    /* =========== Render =========== */

    // ---- Processing / Spinner ----
    if (step === "processing") {
        return (
            <div className="bg-dots" style={{ padding: "40px 48px", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div className="bg-glow-orb" style={{ background: "var(--accent-primary)", top: -200, right: -100 }} />
                <div className="animate-fade-in" style={{ textAlign: "center" }}>
                    <div style={{
                        width: 80, height: 80, margin: "0 auto 28px",
                        borderRadius: "50%", background: "rgba(124,58,237,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        animation: "pulse-glow 2s ease-in-out infinite",
                    }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }} className="gradient-text">
                        Tailoring Your Resume…
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                        Gemini AI is analyzing the job description and optimizing your resume&apos;s content, keywords, and structure for the <strong style={{ color: "var(--text-primary)" }}>{jobRole}</strong> role.
                    </p>

                    {/* Animated progress bar */}
                    <div style={{ marginTop: 32, maxWidth: 360, margin: "32px auto 0" }}>
                        <div className="progress-bar">
                            <div className="progress-bar-fill animate-shimmer" style={{ width: "75%", background: "var(--gradient-primary)" }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ---- Result View ----
    if (step === "result") {
        return (
            <div className="bg-dots" style={{ padding: "40px 48px", minHeight: "100vh", position: "relative" }}>
                <div className="bg-glow-orb" style={{ background: "var(--accent-success)", top: -200, right: -100, opacity: 0.1 }} />

                {/* Header */}
                <div className="animate-fade-in-up" style={{ marginBottom: 24, position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div>
                            <span className="badge badge-green" style={{ marginBottom: 10, display: "inline-flex" }}>✅ Optimization Complete</span>
                            <h1 style={{ fontSize: 28, fontWeight: 800 }}>
                                Your Tailored <span className="gradient-text">Resume</span>
                            </h1>
                            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                                Optimized for <strong style={{ color: "var(--accent-primary)" }}>{jobRole}</strong>
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn-secondary" onClick={handleReset} style={{ padding: "10px 22px", fontSize: 13 }}>
                                ← Modify Again
                            </button>
                            <button className="btn-secondary" onClick={handleCopy} style={{
                                padding: "10px 22px", fontSize: 13,
                                borderColor: copied ? "var(--accent-success)" : undefined,
                                color: copied ? "var(--accent-success)" : undefined,
                            }}>
                                {copied ? "✓ Copied!" : "📋 Copy"}
                            </button>
                            <button className="btn-primary" onClick={handleDownload} style={{ padding: "10px 22px", fontSize: 13 }}>
                                ⬇ Download .txt
                            </button>
                        </div>
                    </div>
                </div>

                {/* Resume Output */}
                <div className="animate-fade-in-up delay-200 glass-panel" style={{
                    borderRadius: "var(--radius-lg)", padding: 32, position: "relative", zIndex: 1,
                    maxHeight: "calc(100vh - 220px)", overflowY: "auto",
                }}>
                    <div className="markdown-content" style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.85, color: "var(--text-secondary)" }}>
                        {optimizedResume}
                    </div>
                </div>
            </div>
        );
    }

    // ---- Input Form ----
    return (
        <div className="bg-dots" style={{ padding: "40px 48px", minHeight: "100vh", position: "relative" }}>
            <div className="bg-glow-orb" style={{ background: "var(--accent-primary)", top: -200, right: -100 }} />
            <div className="bg-glow-orb" style={{ background: "var(--accent-secondary)", bottom: -200, left: -100, opacity: 0.08 }} />

            {/* Hero */}
            <div className="animate-fade-in-up" style={{ marginBottom: 36, position: "relative", zIndex: 1 }}>
                <span className="badge badge-purple" style={{ marginBottom: 14, display: "inline-flex" }}>📄 AI Resume Optimizer</span>
                <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2, marginBottom: 10 }}>
                    Tailor Your Resume with <span className="gradient-text">Gemini AI</span>
                </h1>
                <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, lineHeight: 1.7 }}>
                    Paste your resume, enter the job role &amp; description, and get a perfectly optimized version — same structure, better fit.
                </p>
            </div>

            {/* Error Toast */}
            {error && (
                <div className="animate-fade-in" style={{
                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "var(--radius-md)", padding: "12px 18px", marginBottom: 20,
                    color: "#f87171", fontSize: 14, position: "relative", zIndex: 1,
                    display: "flex", alignItems: "center", gap: 10,
                }}>
                    ⚠️ {error}
                    <button onClick={() => setError("")} style={{
                        marginLeft: "auto", background: "none", border: "none", color: "#f87171",
                        cursor: "pointer", fontSize: 16,
                    }}>✕</button>
                </div>
            )}

            {/* Form Grid */}
            <div className="animate-fade-in-up delay-200" style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, position: "relative", zIndex: 1,
            }}>
                {/* LEFT: Resume Input */}
                <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", padding: 0, display: "flex", flexDirection: "column" }}>
                    {/* Tabs */}
                    <div style={{
                        display: "flex", borderBottom: "1px solid var(--border-color)",
                    }}>
                        {(["paste", "upload"] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveInputTab(tab)} style={{
                                flex: 1, padding: "14px 0", background: "none", border: "none",
                                borderBottom: activeInputTab === tab ? "2px solid var(--accent-primary)" : "2px solid transparent",
                                color: activeInputTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
                                cursor: "pointer", transition: "all var(--transition-fast)",
                                textTransform: "capitalize",
                            }}>
                                {tab === "paste" ? "📝 Paste Resume" : "📁 Upload File"}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
                            Your Current Resume
                        </label>

                        {activeInputTab === "paste" ? (
                            <textarea
                                id="resume-input"
                                value={resumeText}
                                onChange={e => setResumeText(e.target.value)}
                                placeholder={"Paste your full resume text here…\n\nExample:\nJohn Doe\nSoftware Engineer\n\nExperience:\n• Built microservices handling 10K+ RPS\n• Led a team of 4 engineers…\n\nSkills: React, Node.js, PostgreSQL…"}
                                className="input-field"
                                style={{
                                    flex: 1, minHeight: 300, resize: "vertical",
                                    fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.7,
                                }}
                            />
                        ) : (
                            <div
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    flex: 1, minHeight: 300, display: "flex", flexDirection: "column",
                                    alignItems: "center", justifyContent: "center", gap: 14,
                                    border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)",
                                    background: "var(--bg-tertiary)", cursor: "pointer",
                                    transition: "all var(--transition-fast)",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-primary)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
                            >
                                <input ref={fileInputRef} type="file" accept=".txt,.md" style={{ display: "none" }} onChange={handleFileUpload} />
                                <div style={{
                                    width: 56, height: 56, borderRadius: "50%",
                                    background: "rgba(124,58,237,0.1)", display: "flex",
                                    alignItems: "center", justifyContent: "center", fontSize: 26,
                                }}>📂</div>
                                {fileName ? (
                                    <div style={{ textAlign: "center" }}>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-success)" }}>✓ {fileName}</p>
                                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>File loaded • Click to change</p>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: "center" }}>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                                            Drop .txt or .md file here
                                        </p>
                                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>or click to browse</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {resumeText && (
                            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="badge badge-green" style={{ fontSize: 11 }}>
                                    {resumeText.split(/\s+/).length} words
                                </span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Resume loaded</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Role & JD */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Job Role */}
                    <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", padding: 20 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
                            🎯 Target Job Role
                        </label>
                        <input
                            id="job-role-input"
                            type="text"
                            value={jobRole}
                            onChange={e => setJobRole(e.target.value)}
                            placeholder="e.g. Senior Frontend Engineer, Data Analyst, DevOps Engineer…"
                            className="input-field"
                            style={{ fontSize: 15, fontWeight: 500, padding: "14px 16px" }}
                        />
                    </div>

                    {/* Job Description */}
                    <div className="glass-panel" style={{ borderRadius: "var(--radius-lg)", padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
                            📋 Job Description
                        </label>
                        <textarea
                            id="job-description-input"
                            value={jobDescription}
                            onChange={e => setJobDescription(e.target.value)}
                            placeholder={"Paste the full job description here…\n\nExample:\nWe are looking for a Senior Frontend Engineer with 3+ years of experience in React, TypeScript, and modern web technologies. You will work closely with design and backend teams to deliver pixel-perfect UIs…"}
                            className="input-field"
                            style={{
                                flex: 1, minHeight: 200, resize: "vertical",
                                fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.7,
                            }}
                        />
                        {jobDescription && (
                            <div style={{ marginTop: 8 }}>
                                <span className="badge badge-cyan" style={{ fontSize: 11 }}>
                                    {jobDescription.split(/\s+/).length} words
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        id="optimize-resume-btn"
                        className="btn-primary"
                        onClick={handleOptimize}
                        disabled={isLoading || !resumeText.trim() || !jobRole.trim() || !jobDescription.trim()}
                        style={{
                            width: "100%", padding: "16px 0", fontSize: 16, fontWeight: 700,
                            opacity: (!resumeText.trim() || !jobRole.trim() || !jobDescription.trim()) ? 0.5 : 1,
                            cursor: (!resumeText.trim() || !jobRole.trim() || !jobDescription.trim()) ? "not-allowed" : "pointer",
                        }}
                    >
                        🚀 Optimize Resume with AI
                    </button>

                    {/* Tips */}
                    <div style={{
                        padding: "14px 18px", borderRadius: "var(--radius-md)",
                        background: "rgba(124,58,237,0.05)", border: "1px solid var(--border-color)",
                    }}>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                            💡 <strong style={{ color: "var(--text-secondary)" }}>Tips for best results:</strong>
                        </p>
                        <ul style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8, paddingLeft: 18, marginTop: 6 }}>
                            <li>Paste your full resume including all sections</li>
                            <li>Copy the complete job description from the listing</li>
                            <li>Use the exact job title from the posting</li>
                            <li>Your resume structure will be preserved</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
