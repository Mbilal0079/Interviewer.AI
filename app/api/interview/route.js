export async function POST(request) {
  try {
    const { action, jobDesc, question, answer, questionsAndAnswers } =
      await request.json();

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return Response.json({ error: "API key missing" }, { status: 500 });
    }

    let prompt = "";
    if (action === "generate_questions") {
      prompt = `Based on this job description, generate exactly 5 interview questions. Return ONLY a JSON array of 5 strings. No markdown, no backticks. Job Description: ${jobDesc}`;
    } else if (action === "evaluate_answer") {
      prompt = `Evaluate this answer. Return ONLY JSON with "score" (1-10) and "feedback" (2-3 sentences). No markdown. Question: ${question} Answer: ${answer}`;
    } else if (action === "generate_summary") {
      const qa = questionsAndAnswers
        .map((item, i) => `Q${i+1}: ${item.question}\nAnswer: ${item.answer}\nScore: ${item.score}/10`)
        .join("\n\n");
      prompt = `Write a 3-paragraph interview coaching summary. Plain text only. ${qa}`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://interviewer-ai-kappa.vercel.app",
        "X-Title": "Interview AI"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    
    // Log full response to debug
    console.log("OpenRouter response:", JSON.stringify(data));

    if (!response.ok || !data.choices || !data.choices[0]) {
      console.error("Bad response:", JSON.stringify(data));
      return Response.json({ error: "Bad API response: " + JSON.stringify(data) }, { status: 500 });
    }

    const text = data.choices[0].message.content;
    return Response.json({ result: text });

  } catch (error) {
    console.error("API error:", error);
    return Response.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}
