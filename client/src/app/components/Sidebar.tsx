"use client";
import React from "react";
import { PageType } from "../page";

const navItems: { id: PageType; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "quiz", label: "Quiz Mode", icon: "📝" },
    { id: "sql", label: "SQL Terminal", icon: "🗄️" },
    { id: "dsa", label: "DSA Problems", icon: "🧩" },
    { id: "resume", label: "Resume AI", icon: "📄" },
    { id: "chat", label: "AI Assistant", icon: "🤖" },
];

export default function Sidebar({ currentPage, onNavigate }: { currentPage: PageType; onNavigate: (p: PageType) => void }) {
    return (
        <aside style={{
            position: "fixed", left: 0, top: 0, bottom: 0, width: 260,
            background: "var(--bg-secondary)", borderRight: "1px solid var(--border-color)",
            display: "flex", flexDirection: "column", padding: "24px 16px", zIndex: 50,
        }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px 28px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{
                    width: 42, height: 42, borderRadius: "var(--radius-md)",
                    background: "var(--gradient-primary)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 22, boxShadow: "var(--shadow-glow)",
                }}>⚡</div>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }} className="gradient-text">PrepMaster</h1>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>AI Interview Coach</span>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 24, flex: 1 }}>
                {navItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                        <button key={item.id} onClick={() => onNavigate(item.id)} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                            borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
                            fontSize: 14, fontWeight: isActive ? 600 : 500, fontFamily: "var(--font-sans)",
                            background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                            color: isActive ? "#a78bfa" : "var(--text-secondary)",
                            borderLeft: isActive ? "3px solid var(--accent-primary)" : "3px solid transparent",
                            transition: "all var(--transition-fast)",
                        }}
                            onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(124,58,237,0.06)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                            onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                        >
                            <span style={{ fontSize: 20 }}>{item.icon}</span>
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{
                padding: "16px", borderRadius: "var(--radius-md)", background: "rgba(124,58,237,0.06)",
                border: "1px solid var(--border-color)",
            }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    💡 <strong style={{ color: "var(--text-secondary)" }}>Tip:</strong> Use the AI Assistant for any interview questions
                </p>
            </div>
        </aside>
    );
}
