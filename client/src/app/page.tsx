"use client";

import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import QuizPage from "./components/QuizPage";
import SQLTerminal from "./components/SQLTerminal";
import DSAEditor from "./components/DSAEditor";
import ChatAssistant from "./components/ChatAssistant";
import ResumeOptimizer from "./components/ResumeOptimizer";

export type PageType = "dashboard" | "quiz" | "sql" | "dsa" | "chat" | "resume";
export type QuizCategory = "databases" | "dsa" | "system-design" | "javascript" | "python" | "react" | "nodejs" | "os" | "networking" | "general";

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>("dashboard");
  const [quizCategory, setQuizCategory] = useState<QuizCategory>("databases");

  const startQuiz = (category: QuizCategory) => {
    setQuizCategory(category);
    setCurrentPage("quiz");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main style={{ flex: 1, marginLeft: 260, minHeight: "100vh" }}>
        {currentPage === "dashboard" && <Dashboard onStartQuiz={startQuiz} onNavigate={setCurrentPage} />}
        {currentPage === "quiz" && <QuizPage category={quizCategory} onBack={() => setCurrentPage("dashboard")} />}
        {currentPage === "sql" && <SQLTerminal />}
        {currentPage === "dsa" && <DSAEditor />}
        {currentPage === "resume" && <ResumeOptimizer />}
        {currentPage === "chat" && <ChatAssistant />}
      </main>
    </div>
  );
}
