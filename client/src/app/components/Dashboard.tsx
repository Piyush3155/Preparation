"use client";
import React from "react";
import { PageType, QuizCategory } from "../page";

const categories: { id: QuizCategory; label: string; icon: string; desc: string; color: string; gradient: string }[] = [
    { id: "databases", label: "Databases & SQL", icon: "🗄️", desc: "RDBMS, NoSQL, queries, normalization, indexing", color: "#06b6d4", gradient: "linear-gradient(135deg,#06b6d4,#0891b2)" },
    { id: "dsa", label: "DSA", icon: "🧩", desc: "Arrays, trees, graphs, DP, sorting, searching", color: "#7c3aed", gradient: "linear-gradient(135deg,#7c3aed,#a855f7)" },
    { id: "system-design", label: "System Design", icon: "🏗️", desc: "Scalability, load balancing, caching, microservices", color: "#f59e0b", gradient: "linear-gradient(135deg,#f59e0b,#d97706)" },
    { id: "javascript", label: "JavaScript", icon: "🟨", desc: "Closures, promises, event loop, prototypes", color: "#eab308", gradient: "linear-gradient(135deg,#eab308,#ca8a04)" },
    { id: "python", label: "Python", icon: "🐍", desc: "Decorators, generators, OOP, data structures", color: "#10b981", gradient: "linear-gradient(135deg,#10b981,#059669)" },
    { id: "react", label: "React", icon: "⚛️", desc: "Hooks, state, lifecycle, performance, patterns", color: "#3b82f6", gradient: "linear-gradient(135deg,#3b82f6,#2563eb)" },
    { id: "nodejs", label: "Node.js", icon: "🟢", desc: "Event loop, streams, middleware, REST APIs", color: "#22c55e", gradient: "linear-gradient(135deg,#22c55e,#16a34a)" },
    { id: "os", label: "OS Concepts", icon: "💻", desc: "Processes, threads, memory, scheduling, deadlocks", color: "#ef4444", gradient: "linear-gradient(135deg,#ef4444,#dc2626)" },
    { id: "networking", label: "Networking", icon: "🌐", desc: "TCP/IP, HTTP, DNS, sockets, protocols", color: "#8b5cf6", gradient: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
    { id: "general", label: "General CS", icon: "📚", desc: "OOP, design patterns, SOLID, testing concepts", color: "#ec4899", gradient: "linear-gradient(135deg,#ec4899,#db2777)" },
];

const quickActions: { icon: string; label: string; desc: string; page: PageType }[] = [
    { icon: "🗄️", label: "SQL Terminal", desc: "Practice SQL queries with AI-simulated database", page: "sql" },
    { icon: "🧩", label: "DSA Editor", desc: "Solve coding problems with built-in code editor", page: "dsa" },
    { icon: "🤖", label: "AI Chat", desc: "Ask any interview question to PrepMaster AI", page: "chat" },
];

export default function Dashboard({ onStartQuiz, onNavigate }: { onStartQuiz: (c: QuizCategory) => void; onNavigate: (p: PageType) => void }) {
    return (
        <div className="bg-dots" style={{ padding: "40px 48px", minHeight: "100vh", position: "relative" }}>
            {/* Glow orbs */}
            <div className="bg-glow-orb" style={{ background: "var(--accent-primary)", top: -200, right: -100 }} />
            <div className="bg-glow-orb" style={{ background: "var(--accent-secondary)", bottom: -200, left: -100, opacity: 0.08 }} />

            {/* Hero */}
            <div className="animate-fade-in-up" style={{ marginBottom: 48, position: "relative", zIndex: 1 }}>
                <span className="badge badge-purple" style={{ marginBottom: 16, display: "inline-flex" }}>✨ AI-Powered Preparation</span>
                <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>
                    Master Your Next <span className="gradient-text">Technical Interview</span>
                </h1>
                <p style={{ fontSize: 17, color: "var(--text-secondary)", maxWidth: 600, lineHeight: 1.7 }}>
                    Practice with AI-generated quizzes, solve DSA problems, and sharpen your SQL skills — all in one platform.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="animate-fade-in-up delay-200" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 48, position: "relative", zIndex: 1 }}>
                {quickActions.map((action) => (
                    <button key={action.page} onClick={() => onNavigate(action.page)} className="card" style={{
                        cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16,
                    }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: "var(--radius-md)", background: "var(--bg-tertiary)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0,
                        }}>{action.icon}</div>
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{action.label}</h3>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>{action.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Quiz Categories */}
            <div className="animate-fade-in-up delay-300" style={{ position: "relative", zIndex: 1 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Quiz Categories</h2>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>Select a topic to start an AI-generated quiz with 10 questions</p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                    {categories.map((cat) => (
                        <button key={cat.id} onClick={() => onStartQuiz(cat.id)} className="card" style={{
                            cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden",
                        }}>
                            {/* Color accent bar */}
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: cat.gradient }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: "var(--radius-md)",
                                    background: `${cat.color}18`, display: "flex", alignItems: "center",
                                    justifyContent: "center", fontSize: 22,
                                }}>{cat.icon}</div>
                                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{cat.label}</h3>
                            </div>
                            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{cat.desc}</p>
                            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: cat.color, fontWeight: 600 }}>
                                Start Quiz →
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
