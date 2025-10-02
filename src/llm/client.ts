import OpenAI from "openai";
import { tools } from "./tools";

export const getOpenAIClient = () => {
  const { OPENAI_API_KEY } = process.env;
  if (OPENAI_API_KEY) {
    return new OpenAI({ apiKey: OPENAI_API_KEY });
  } else {
    throw new Error("Missing OPENAI_API_KEY");
  }
};

export async function runLLM(userPrompt: string, systemPrompt: string) {
  const openAIClient = getOpenAIClient();
  const response = await openAIClient.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools,
  });

  if (!response.output_text) {
    console.error("⚠️ No response from LLM");
    throw new Error("LLM returned empty response");
  }

  console.debug("🐛 LLM raw response: ", response.output_text);
  return response.output_text.replace(/(^```json\s*|```$)/g, "").trim();
}
