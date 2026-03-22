"use client";
import React, { useState, useRef, useCallback } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";

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
    const [isParsingFile, setIsParsingFile] = useState(false);

    // Extract text from a PDF file using pdfjs-dist
    const extractTextFromPdf = async (file: File): Promise<string> => {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" ");
            pages.push(pageText);
        }

        return pages.join("\n\n");
    };

    // Extract text from a DOCX file using mammoth
    const extractTextFromDocx = async (file: File): Promise<string> => {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    };

    // Unified file processor for all supported formats
    const processFile = useCallback(async (file: File) => {
        const name = file.name.toLowerCase();
        setFileName(file.name);
        setError("");
        setIsParsingFile(true);

        try {
            let text = "";

            if (name.endsWith(".pdf")) {
                text = await extractTextFromPdf(file);
            } else if (name.endsWith(".docx")) {
                text = await extractTextFromDocx(file);
            } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type === "text/plain") {
                text = await file.text();
            } else {
                setError("Unsupported file format. Please upload a .pdf, .docx, .txt, or .md file.");
                setFileName("");
                return;
            }

            if (!text.trim()) {
                setError("Could not extract text from the file. The file may be image-based or empty. Try pasting your resume text directly.");
                setFileName("");
                return;
            }

            setResumeText(text);
        } catch (err) {
            console.error("File parsing error:", err);
            setError("Failed to parse the file. Please try pasting your resume text directly.");
            setFileName("");
        } finally {
            setIsParsingFile(false);
        }
    }, []);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleOptimize = async () => {
        // Prevent duplicate requests from double-clicks
        if (isLoading) return;

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

    // Parse resume text into structured lines for DOCX/PDF
    const parseResumeLines = (text: string) => {
        return text.split("\n").map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return { type: "empty" as const, text: "" };
            // Section headers: all caps, or short lines ending with colon, or lines with === / ---
            if (/^[A-Z][A-Z\s&/,]{2,}$/.test(trimmed) || /^#{1,3}\s/.test(trimmed)) {
                return { type: "heading" as const, text: trimmed.replace(/^#{1,3}\s*/, "") };
            }
            if (/^[-=]{3,}$/.test(trimmed)) {
                return { type: "separator" as const, text: "" };
            }
            if (/^[•\-\*]\s/.test(trimmed)) {
                return { type: "bullet" as const, text: trimmed.replace(/^[•\-\*]\s*/, "") };
            }
            // Short lines ending with : are likely sub-headers
            if (trimmed.length < 60 && trimmed.endsWith(":")) {
                return { type: "subheading" as const, text: trimmed };
            }
            return { type: "body" as const, text: trimmed };
        });
    };

    const handleDownloadTxt = () => {
        const blob = new Blob([optimizedResume], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resume-${jobRole.replace(/\s+/g, "-").toLowerCase()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadDocx = async () => {
        const lines = parseResumeLines(optimizedResume);
        const children: Paragraph[] = [];

        for (const line of lines) {
            switch (line.type) {
                case "heading":
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: line.text, bold: true, size: 26, font: "Calibri" })],
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 240, after: 80 },
                            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999", space: 4 } },
                        })
                    );
                    break;
                case "subheading":
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: line.text, bold: true, size: 22, font: "Calibri" })],
                            spacing: { before: 160, after: 40 },
                        })
                    );
                    break;
                case "bullet":
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: line.text, size: 21, font: "Calibri" })],
                            bullet: { level: 0 },
                            spacing: { before: 40, after: 40 },
                        })
                    );
                    break;
                case "separator":
                    children.push(
                        new Paragraph({
                            children: [],
                            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
                            spacing: { before: 80, after: 80 },
                        })
                    );
                    break;
                case "empty":
                    children.push(new Paragraph({ children: [], spacing: { before: 60, after: 60 } }));
                    break;
                default:
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: line.text, size: 21, font: "Calibri" })],
                            spacing: { before: 40, after: 40 },
                            alignment: AlignmentType.LEFT,
                        })
                    );
            }
        }

        const doc = new Document({
            sections: [{
                properties: {
                    page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
                },
                children,
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `resume-${jobRole.replace(/\s+/g, "-").toLowerCase()}.docx`);
    };

    const handleDownloadPdf = () => {
        const pdf = new jsPDF({ unit: "mm", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginLeft = 15;
        const marginRight = 15;
        const maxWidth = pageWidth - marginLeft - marginRight;
        let y = 18;

        const lines = parseResumeLines(optimizedResume);

        const addPage = () => {
            pdf.addPage();
            y = 18;
        };

        const checkPageBreak = (needed: number) => {
            if (y + needed > pageHeight - 15) addPage();
        };

        for (const line of lines) {
            switch (line.type) {
                case "heading": {
                    checkPageBreak(14);
                    y += 4;
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(13);
                    pdf.setTextColor(40, 40, 40);
                    pdf.text(line.text, marginLeft, y);
                    y += 2;
                    pdf.setDrawColor(180, 180, 180);
                    pdf.setLineWidth(0.3);
                    pdf.line(marginLeft, y, pageWidth - marginRight, y);
                    y += 5;
                    break;
                }
                case "subheading": {
                    checkPageBreak(10);
                    y += 2;
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(11);
                    pdf.setTextColor(50, 50, 50);
                    pdf.text(line.text, marginLeft, y);
                    y += 5;
                    break;
                }
                case "bullet": {
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    pdf.setTextColor(60, 60, 60);
                    const bulletLines = pdf.splitTextToSize(`• ${line.text}`, maxWidth - 4);
                    checkPageBreak(bulletLines.length * 4.5);
                    pdf.text(bulletLines, marginLeft + 4, y);
                    y += bulletLines.length * 4.5;
                    break;
                }
                case "separator": {
                    checkPageBreak(6);
                    y += 2;
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setLineWidth(0.2);
                    pdf.line(marginLeft, y, pageWidth - marginRight, y);
                    y += 4;
                    break;
                }
                case "empty": {
                    y += 3;
                    break;
                }
                default: {
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    pdf.setTextColor(60, 60, 60);
                    const wrapped = pdf.splitTextToSize(line.text, maxWidth);
                    checkPageBreak(wrapped.length * 4.5);
                    pdf.text(wrapped, marginLeft, y);
                    y += wrapped.length * 4.5;
                    break;
                }
            }
        }

        pdf.save(`resume-${jobRole.replace(/\s+/g, "-").toLowerCase()}.pdf`);
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
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                            <button className="btn-primary" onClick={handleDownloadDocx} style={{ padding: "10px 22px", fontSize: 13 }}>
                                📝 Download .docx
                            </button>
                            <button className="btn-primary" onClick={handleDownloadPdf} style={{ padding: "10px 22px", fontSize: 13, background: "var(--gradient-cool)" }}>
                                📕 Download .pdf
                            </button>
                            <button className="btn-secondary" onClick={handleDownloadTxt} style={{ padding: "10px 22px", fontSize: 13 }}>
                                📄 .txt
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
                                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" style={{ display: "none" }} onChange={handleFileUpload} />
                                <div style={{
                                    width: 56, height: 56, borderRadius: "50%",
                                    background: "rgba(124,58,237,0.1)", display: "flex",
                                    alignItems: "center", justifyContent: "center", fontSize: 26,
                                }}>📂</div>
                                {isParsingFile ? (
                                    <div style={{ textAlign: "center" }}>
                                        <div className="spinner" style={{ width: 28, height: 28, margin: "0 auto 10px" }} />
                                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Extracting text from {fileName}…</p>
                                    </div>
                                ) : fileName ? (
                                    <div style={{ textAlign: "center" }}>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-success)" }}>✓ {fileName}</p>
                                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>File loaded • Click to change</p>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: "center" }}>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                                            Drop your resume file here
                                        </p>
                                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>.pdf, .docx, .txt, or .md</p>
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
