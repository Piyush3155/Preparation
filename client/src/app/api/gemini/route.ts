import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY1 || "");

export async function POST(request: NextRequest) {
    try {
        const { prompt, type } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured. Please add it to your .env.local file." },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let systemPrompt = "";

        switch (type) {
            case "generate_quiz":
                systemPrompt = `You are an expert interview preparation assistant. Generate exactly 10 multiple choice questions based on the topic requested. 
        
        IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text.
        
        Return the response in this exact JSON format:
        {
          "questions": [
            {
              "id": 1,
              "question": "Question text here?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctAnswer": 0,
              "explanation": "Brief explanation of why this is correct."
            }
          ]
        }
        
        Make the questions progressively harder. Include a mix of conceptual, practical, and scenario-based questions. Each question should test real interview-level knowledge.`;
                break;

            case "explain_answer":
                systemPrompt = `You are an expert interview coach. Provide a detailed, clear explanation for the given question and answer. Include:
        - Why the correct answer is right
        - Why the other options are wrong
        - A real-world example or analogy if helpful
        - Key takeaway for interview preparation
        
        Keep the explanation concise but thorough. Use markdown formatting.`;
                break;

            case "sql_help":
                systemPrompt = `You are an expert SQL database instructor. Help the user with their SQL query or database question. 
        
        If they provide a query, analyze it and:
        - Explain what it does
        - Suggest optimizations
        - Point out any issues
        
        If they ask a question, provide:
        - A clear explanation
        - Example queries
        - Best practices
        
        Use markdown formatting with code blocks for SQL.`;
                break;

            case "sql_execute":
                systemPrompt = `You are an SQL query executor simulator. The user will provide an SQL query. 
        
        IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text.
        
        Simulate the execution and return the result in this exact JSON format:
        {
          "success": true,
          "type": "SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP",
          "message": "Query executed successfully",
          "columns": ["col1", "col2"],
          "rows": [["val1", "val2"], ["val3", "val4"]],
          "rowCount": 2,
          "explanation": "This query selects..."
        }
        
        For SELECT queries, generate realistic sample data (5-10 rows).
        For DDL/DML queries, simulate the success response.
        If the query has errors, set success to false and explain the error.
        Make sample data realistic and relevant to the table names used.`;
                break;

            case "dsa_generate":
                systemPrompt = `You are an expert DSA (Data Structures and Algorithms) interview coach. Generate a coding problem based on the topic requested.
        
        IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no extra text.
        
        Return the response in this exact JSON format:
        {
          "title": "Problem Title",
          "difficulty": "Easy|Medium|Hard",
          "description": "Detailed problem description with clear requirements.",
          "examples": [
            {
              "input": "Input description",
              "output": "Expected output",
              "explanation": "Brief explanation"
            }
          ],
          "constraints": ["Constraint 1", "Constraint 2"],
          "hints": ["Hint 1", "Hint 2"],
          "starterCode": {
            "javascript": "function solutionName(params) {\\n  // Your code here\\n}",
            "python": "def solution_name(params):\\n    # Your code here\\n    pass",
            "java": "class Solution {\\n    public ReturnType solutionName(ParamType param) {\\n        // Your code here\\n    }\\n}",
            "cpp": "#include <vector>\\nusing namespace std;\\n\\nclass Solution {\\npublic:\\n    ReturnType solutionName(ParamType param) {\\n        // Your code here\\n    }\\n};"
          },
          "solution": "Explain the optimal approach and the time/space complexity.",
          "timeComplexity": "O(...)",
          "spaceComplexity": "O(...)"
        }`;
                break;

            case "dsa_review":
                systemPrompt = `You are an expert code reviewer specializing in DSA interview problems. Review the user's code solution and provide:
        
        1. **Correctness**: Does the code solve the problem correctly?
        2. **Time Complexity**: What is the time complexity?
        3. **Space Complexity**: What is the space complexity?
        4. **Code Quality**: Is the code clean and readable?
        5. **Optimizations**: Can it be improved?
        6. **Edge Cases**: Are edge cases handled?
        
        Use markdown formatting. Be constructive and encouraging.`;
                break;

            case "chat":
                systemPrompt = `You are PrepAI, an expert interview preparation assistant. You help with:
        - Data Structures & Algorithms
        - Database & SQL concepts
        - System Design
        - Programming concepts
        - Interview tips and strategies
        
        Be concise, clear, and helpful. Use markdown formatting with code blocks when needed. Always relate answers to interview contexts.`;
                break;

            default:
                systemPrompt = "You are a helpful interview preparation assistant.";
        }

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: prompt },
        ]);

        const response = result.response;
        const text = response.text();

        return NextResponse.json({ result: text });
    } catch (error: unknown) {
        console.error("Gemini API error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to get response from AI";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
