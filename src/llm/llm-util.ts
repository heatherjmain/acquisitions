export const parseLLMOutput = (raw: string) => {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.graphql || !parsed.variables) {
      console.error("⚠️ Invalid structure from LLM", JSON.stringify(parsed));
      throw new Error("Invalid structure from LLM");
    }
    return parsed;
  } catch (error) {
    console.error("⚠️ LLM did not return valid JSON", JSON.stringify(error));
    throw new Error("LLM did not return valid JSON");
  }
};
