export async function POST(request) {
  try {
    const { action, jobDesc, question, answer, questionsAndAnswers } =
      await request.json();

    let prompt = "";

    if (action === "generate_questions") {
      prompt = `Based on this job description, generate exactly 5 interview questions. Return ONLY a JSON array of 5 strings. No markdown, no backticks, no extra text. Job Description: ${jobDesc}`;
    } else if (action === "evaluate_answer") {
      prompt = `Evaluate this interview answer. Return ONLY a raw JSON object with exactly two fields: "score" (integer 1-10) and "feedback" (2-3 sentences). No markdown, no backticks. Job Description: ${jobDesc} Question: ${question} Answer: ${answer}`;
    } else if (action === "generate_summary") {
      const qa = questionsAndAnswers
        .map((item, i) => `Q${i+1}: ${item.question}\nAnswer: ${item.answer}\nScore: ${item.score}/10`)
        .join("\n\n");
      prompt = `Write a 3-paragraph interview coaching summary. Paragraph 1: Overall performance. Paragraph 2: Key strengths. Paragraph 3: Areas to improve. Plain text only. ${qa}`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content;
    return Response.json({ result: text });

  } catch (error) {
    console.error("API error:", error);
    return Response.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}
