
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `You are an expert interview coach with 15 years of experience 
helping candidates land jobs at top companies. You conduct realistic, role-specific 
mock interviews and provide honest, actionable feedback.`,
});

export async function POST(request) {
  try {
    const { action, jobDesc, question, answer, questionsAndAnswers } =
      await request.json();

    let prompt = "";

    if (action === "generate_questions") {
      prompt = `Based on this job description, generate exactly 5 interview questions.
Return ONLY a JSON array of 5 strings, no other text, no markdown, no backticks.

Job Description:
${jobDesc}`;

    } else if (action === "evaluate_answer") {
      prompt = `Evaluate this interview answer. 
Return ONLY a raw JSON object with exactly two fields:
- "score": integer from 1 to 10
- "feedback": 2-3 sentences of specific, actionable feedback

No markdown, no backticks, no extra text.

Job Description: ${jobDesc}
Question: ${question}
Answer: ${answer}`;

    } else if (action === "generate_summary") {
      const qa = questionsAndAnswers
        .map((item, i) =>
          `Q${i + 1}: ${item.question}\nAnswer: ${item.answer}\nScore: ${item.score}/10`
        )
        .join("\n\n");

      prompt = `Based on these mock interview Q&As, write a 3-paragraph coaching summary:
Paragraph 1: Overall performance assessment
Paragraph 2: Key strengths demonstrated
Paragraph 3: Top 2-3 areas to improve with specific advice

Be specific, encouraging but honest. Use plain text only, no markdown, no bullet points.

${qa}`;

    } else {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return Response.json({ result: text });

  } catch (error) {
    console.error("Interview API error:", error);
    return Response.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
