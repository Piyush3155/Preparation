"use client";
import React, { useState, useRef, useEffect } from "react";

interface QueryResult {
    type: "query" | "result" | "error" | "info" | "ai";
    content: string;
    table?: { columns: string[]; rows: string[][] };
}

const sampleQueries = [
    "SELECT * FROM employees WHERE department = 'Engineering';",
    "SELECT department, COUNT(*) as count, AVG(salary) as avg_salary FROM employees GROUP BY department;",
    "CREATE TABLE students (id INT PRIMARY KEY, name VARCHAR(100), grade CHAR(1));",
    "SELECT o.id, c.name, o.total FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.total > 500;",
    "SELECT name, salary, RANK() OVER (ORDER BY salary DESC) as rank FROM employees;",
];

export default function SQLTerminal() {
    const [query, setQuery] = useState("");
    const [history, setHistory] = useState<QueryResult[]>([
        { type: "info", content: "Welcome to the SQL Terminal! 🗄️\nType SQL queries to practice. The AI will simulate execution and return realistic results.\nType 'help' for tips or 'clear' to reset.\n" },
    ]);
    const [loading, setLoading] = useState(false);
    const [aiChat, setAiChat] = useState("");
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [aiResponse, setAiResponse] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }, [history]);

    const executeQuery = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;

        if (trimmed.toLowerCase() === "clear") {
            setHistory([{ type: "info", content: "Terminal cleared.\n" }]);
            setQuery(""); return;
        }
        if (trimmed.toLowerCase() === "help") {
            setHistory((h) => [...h,
            { type: "query", content: trimmed },
            { type: "info", content: "📖 SQL Terminal Help:\n• Write any SQL query (SELECT, INSERT, CREATE, etc.)\n• The AI simulates execution with realistic data\n• Use the AI Help panel for SQL explanations\n• Try: SELECT * FROM employees;\n" },
            ]);
            setQuery(""); return;
        }

        setHistory((h) => [...h, { type: "query", content: trimmed }]);
        setLoading(true); setQuery("");

        try {
            const res = await fetch("/api/gemini", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: trimmed, type: "sql_execute" }),
            });
            const data = await res.json();
            if (data.error) { setHistory((h) => [...h, { type: "error", content: data.error }]); return; }

            let text = data.result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const result = JSON.parse(text);

            if (result.success) {
                if (result.columns && result.rows) {
                    setHistory((h) => [...h,
                    { type: "result", content: `✓ ${result.message} (${result.rowCount} rows)`, table: { columns: result.columns, rows: result.rows } },
                    { type: "info", content: `💡 ${result.explanation}\n` },
                    ]);
                } else {
                    setHistory((h) => [...h, { type: "result", content: `✓ ${result.message}\n💡 ${result.explanation}\n` }]);
                }
            } else {
                setHistory((h) => [...h, { type: "error", content: `✗ Error: ${result.message}\n💡 ${result.explanation}\n` }]);
            }
        } catch {
            setHistory((h) => [...h, { type: "error", content: "Failed to execute query. Check your API key.\n" }]);
        } finally { setLoading(false); }
    };

    const askAiHelp = async () => {
        if (!aiChat.trim()) return;
        setAiLoading(true); setAiResponse("");
        try {
            const res = await fetch("/api/gemini", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiChat, type: "sql_help" }),
            });
            const data = await res.json();
            setAiResponse(data.error || data.result);
        } catch { setAiResponse("Failed to get AI response."); }
        finally { setAiLoading(false); }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); executeQuery(); }
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            {/* Main Terminal */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
                {/* Header */}
                <div style={{
                    padding: "16px 24px", borderBottom: "1px solid var(--border-color)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "var(--bg-secondary)",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22 }}>🗄️</span>
                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 700 }}>SQL Terminal</h2>
                            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>AI-simulated database environment</p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-secondary" onClick={() => setShowAiPanel(!showAiPanel)}
                            style={{ padding: "8px 16px", fontSize: 13 }}>
                            🤖 {showAiPanel ? "Hide" : "Show"} AI Help
                        </button>
                        <button className="btn-secondary" onClick={() => setHistory([{ type: "info", content: "Terminal cleared.\n" }])}
                            style={{ padding: "8px 16px", fontSize: 13 }}>Clear</button>
                    </div>
                </div>

                {/* Output */}
                <div ref={outputRef} style={{
                    flex: 1, padding: 24, overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.7,
                }}>
                    {history.map((item, i) => (
                        <div key={i} style={{ marginBottom: 12 }}>
                            {item.type === "query" && (
                                <div><span style={{ color: "var(--accent-primary)" }}>SQL &gt; </span><span style={{ color: "var(--text-primary)" }}>{item.content}</span></div>
                            )}
                            {item.type === "result" && (
                                <div>
                                    <div style={{ color: "var(--accent-success)" }}>{item.content}</div>
                                    {item.table && (
                                        <div style={{ overflowX: "auto", marginTop: 8 }}>
                                            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                                                <thead>
                                                    <tr>{item.table.columns.map((col, j) => (
                                                        <th key={j} style={{ padding: "8px 16px", borderBottom: "2px solid var(--accent-primary)", color: "var(--accent-secondary)", textAlign: "left", fontWeight: 600 }}>{col}</th>
                                                    ))}</tr>
                                                </thead>
                                                <tbody>
                                                    {item.table.rows.map((row, j) => (
                                                        <tr key={j} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                                            {row.map((cell, k) => (
                                                                <td key={k} style={{ padding: "6px 16px", color: "var(--text-secondary)" }}>{cell}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                            {item.type === "error" && <div style={{ color: "var(--accent-danger)", whiteSpace: "pre-wrap" }}>{item.content}</div>}
                            {item.type === "info" && <div style={{ color: "var(--accent-secondary)", whiteSpace: "pre-wrap" }}>{item.content}</div>}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
                            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Executing query...
                        </div>
                    )}
                </div>

                {/* Sample Queries */}
                <div style={{ padding: "8px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {sampleQueries.slice(0, 3).map((sq, i) => (
                        <button key={i} onClick={() => setQuery(sq)} style={{
                            padding: "4px 12px", fontSize: 11, background: "var(--bg-tertiary)", border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-full)", color: "var(--text-muted)", cursor: "pointer",
                            fontFamily: "var(--font-mono)", transition: "all var(--transition-fast)",
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-primary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                        >{sq.length > 50 ? sq.slice(0, 50) + "..." : sq}</button>
                    ))}
                </div>

                {/* Input */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                        <span style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)", fontWeight: 700, paddingBottom: 10 }}>SQL &gt;</span>
                        <textarea ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                            placeholder="Type your SQL query here... (Enter to execute, Shift+Enter for new line)"
                            style={{
                                flex: 1, padding: "10px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)",
                                borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "var(--font-mono)",
                                fontSize: 13, resize: "none", minHeight: 42, maxHeight: 120, outline: "none",
                            }}
                            rows={1}
                        />
                        <button className="btn-primary" onClick={executeQuery} disabled={loading} style={{ padding: "10px 20px", fontSize: 13 }}>
                            {loading ? "..." : "Run ▶"}
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Help Panel */}
            {showAiPanel && (
                <div style={{
                    width: 380, borderLeft: "1px solid var(--border-color)", background: "var(--bg-secondary)",
                    display: "flex", flexDirection: "column",
                }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700 }}>🤖 SQL AI Helper</h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Ask questions about SQL concepts</p>
                    </div>
                    <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
                        {aiResponse && (
                            <div className="markdown-content" style={{ fontSize: 13, lineHeight: 1.7 }}>
                                <div dangerouslySetInnerHTML={{ __html: aiResponse.replace(/\n/g, "<br/>").replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
                            </div>
                        )}
                        {aiLoading && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Thinking...</div>}
                    </div>
                    <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input className="input-field" value={aiChat} onChange={(e) => setAiChat(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && askAiHelp()}
                                placeholder="Ask about SQL..." style={{ fontSize: 13 }} />
                            <button className="btn-primary" onClick={askAiHelp} disabled={aiLoading} style={{ padding: "10px 16px", fontSize: 13 }}>Ask</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
