"use client";
import React, { useState, useRef, useEffect } from "react";

interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

const suggestedQuestions = [
    "Explain the difference between SQL and NoSQL databases",
    "How does a hash map work internally?",
    "What is the time complexity of quicksort?",
    "Explain how React virtual DOM works",
    "What is the CAP theorem in distributed systems?",
    "How to approach a system design interview?",
];

export default function ChatAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    const sendMessage = async (text?: string) => {
        const msg = text || input.trim();
        if (!msg) return;

        const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
        setMessages((m) => [...m, userMsg]);
        setInput(""); setLoading(true);

        try {
            const res = await fetch("/api/gemini", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: msg, type: "chat" }),
            });
            const data = await res.json();
            const aiMsg: Message = { role: "assistant", content: data.error || data.result, timestamp: new Date() };
            setMessages((m) => [...m, aiMsg]);
        } catch {
            setMessages((m) => [...m, { role: "assistant", content: "Sorry, I couldn't process your request. Please try again.", timestamp: new Date() }]);
        } finally { setLoading(false); }
    };

    const formatContent = (content: string) => {
        return content
            .replace(/\n/g, "<br/>")
            .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:12px;margin:8px 0;overflow-x:auto;font-family:var(--font-mono);font-size:12px;color:var(--text-primary)">$2</pre>')
            .replace(/`([^`]+)`/g, '<code style="background:var(--bg-tertiary);color:var(--accent-secondary);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:0.9em">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-primary)" }}>
            {/* Header */}
            <div style={{
                padding: "16px 24px", borderBottom: "1px solid var(--border-color)",
                display: "flex", alignItems: "center", gap: 12, background: "var(--bg-secondary)",
            }}>
                <div style={{
                    width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--gradient-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>🤖</div>
                <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700 }}>PrepMaster AI</h2>
                    <p style={{ fontSize: 12, color: "var(--accent-success)" }}>● Online — Ready to help</p>
                </div>
            </div>

            {/* Chat Area */}
            <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                {messages.length === 0 && (
                    <div className="animate-fade-in-up" style={{ textAlign: "center", padding: "60px 40px" }}>
                        <div style={{ fontSize: 56, marginBottom: 20 }}>🤖</div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
                            Hi! I&apos;m <span className="gradient-text">PrepMaster AI</span>
                        </h2>
                        <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 32, maxWidth: 480, margin: "0 auto 32px" }}>
                            Your personal interview preparation assistant. Ask me anything about DSA, databases, system design, and more!
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, maxWidth: 600, margin: "0 auto" }}>
                            {suggestedQuestions.map((q, i) => (
                                <button key={i} onClick={() => sendMessage(q)} style={{
                                    padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-color)",
                                    borderRadius: "var(--radius-md)", color: "var(--text-secondary)", cursor: "pointer",
                                    fontSize: 13, textAlign: "left", fontFamily: "var(--font-sans)",
                                    transition: "all var(--transition-fast)", lineHeight: 1.4,
                                }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-primary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                                >{q}</button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} style={{
                        display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                        marginBottom: 16, animation: "fadeIn 0.3s ease-out",
                    }}>
                        <div style={{
                            maxWidth: "75%", padding: "14px 18px", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            background: msg.role === "user" ? "var(--accent-primary)" : "var(--bg-card)",
                            border: msg.role === "user" ? "none" : "1px solid var(--border-color)",
                            color: msg.role === "user" ? "white" : "var(--text-secondary)",
                            fontSize: 14, lineHeight: 1.7,
                        }}>
                            {msg.role === "user" ? msg.content : (
                                <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                            )}
                            <div style={{
                                fontSize: 11, marginTop: 8,
                                color: msg.role === "user" ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
                                textAlign: "right",
                            }}>
                                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <div style={{
                            padding: "14px 18px", borderRadius: "16px 16px 16px 4px",
                            background: "var(--bg-card)", border: "1px solid var(--border-color)",
                        }}>
                            <div style={{ display: "flex", gap: 4 }}>
                                {[0, 1, 2].map((i) => (
                                    <div key={i} style={{
                                        width: 8, height: 8, borderRadius: "50%", background: "var(--accent-primary)",
                                        animation: `float 1.2s ease-in-out ${i * 0.15}s infinite`,
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", background: "var(--bg-secondary)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                    <textarea value={input} onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Ask anything about interviews, DSA, databases, system design..."
                        style={{
                            flex: 1, padding: "12px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-lg)", color: "var(--text-primary)", fontFamily: "var(--font-sans)",
                            fontSize: 14, resize: "none", minHeight: 46, maxHeight: 120, outline: "none",
                        }}
                        rows={1}
                    />
                    <button className="btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()}
                        style={{ padding: "12px 24px", borderRadius: "var(--radius-lg)" }}>
                        {loading ? "..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    );
}
