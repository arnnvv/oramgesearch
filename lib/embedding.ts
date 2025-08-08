import { googleAIConfig } from "@/lib/config";

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": googleAIConfig.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: {
            parts: [{ text: text }],
          },
          taskType: "RETRIEVAL_QUERY",
          outputDimensionality: 256,
        }),
      },
    );
    console.log(response);

    const result = await response.json();

    if (!response.ok) {
      const errorMessage =
        result?.error?.message ?? `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    if (!result.embedding || !result.embedding.values) {
      throw new Error("Invalid embedding response from API");
    }

    return result.embedding.values;
  } catch (error) {
    console.error(`Error generating embedding: ${error}`);
    throw new Error("Failed to generate text embedding.");
  }
}
