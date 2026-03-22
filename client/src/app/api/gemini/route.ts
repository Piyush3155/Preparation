import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Collect all available Gemini API keys for rotation
function getApiKeys(): string[] {
    const keys: string[] = [];
    const seen = new Set<string>();
    const envKeys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY1,
        process.env.GEMINI_API_KEY2,
        process.env.GEMINI_API_KEY3,
    ];
    for (const k of envKeys) {
        if (k && !seen.has(k)) {
            seen.add(k);
            keys.push(k);
        }
    }
    return keys;
}

const API_KEYS = getApiKeys();

// Helper: sleep for given ms
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Try generating content, cycling through API keys on 429 errors
async function generateWithFallback(
    systemPrompt: string,
    userPrompt: string,
    maxRetries: number = 2,
): Promise<string> {
    const errors: string[] = [];

    for (const apiKey of API_KEYS) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await model.generateContent([
                    { text: systemPrompt },
                    { text: userPrompt },
                ]);
                return result.response.text();
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                const is429 = msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota");

                if (is429 && attempt < maxRetries) {
                    // Wait before retrying with the same key
                    await sleep(2000 * (attempt + 1));
                    continue;
                }

                if (is429) {
                    // This key is exhausted, try next key
                    errors.push(`Key …${apiKey.slice(-6)}: rate limited`);
                    break;
                }

                // Non-rate-limit error — throw immediately
                throw err;
            }
        }
    }

    throw new Error(
        `All API keys exhausted (rate limited). Tried ${API_KEYS.length} key(s). ` +
        `Please wait a minute and try again, or add more API keys to .env.local (GEMINI_API_KEY2, GEMINI_API_KEY3, etc.). ` +
        `Details: ${errors.join("; ")}`
    );
}

export async function POST(request: NextRequest) {
    try {
        const { prompt, type } = await request.json();

        if (API_KEYS.length === 0) {
            return NextResponse.json(
                { error: "No Gemini API keys configured. Please add GEMINI_API_KEY to your .env.local file." },
                { status: 500 }
            );
        }

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

            case "resume_optimize":
                systemPrompt = `You are an expert ATS-optimized resume writer and career coach. Your task is to tailor the user's existing resume for a specific job role and job description.

RULES:
1. **Preserve the original resume's structure, formatting style, and section order exactly.** Do not add or remove sections.
2. **Rewrite bullet points** to emphasize skills, keywords, and achievements that align with the job description.
3. **Incorporate relevant keywords** from the job description naturally into the experience, skills, and summary sections.
4. **Quantify achievements** where possible (metrics, percentages, numbers).
5. **Adjust the professional summary / objective** to directly target the role.
6. **Reorder skills** so the most relevant ones appear first.
7. **Do NOT fabricate experience or skills** the candidate doesn't already have — only rephrase and emphasize existing content.
8. **Output the full, ready-to-use resume text** — not a diff or a list of suggestions. The user should be able to copy-paste the output as their new resume.
9. Use clear, professional language. Avoid buzzwords without substance.
10. If the resume contains a "Skills" or "Technologies" section, make sure it mirrors the tech stack mentioned in the job description (only include skills the candidate actually listed).

Return ONLY the optimized resume text, no commentary, no markdown code fences, no explanations before or after.`;
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

        const text = await generateWithFallback(systemPrompt, prompt);

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
