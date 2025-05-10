// src/lib/actions.ts
"use server";

import { analyzeInfluences, type AnalyzeInfluencesInput, type AnalyzeInfluencesOutput } from "@/ai/flows/analyze-influences";
import type { CurrencyPair } from "@/types";

export async function getForexPredictionAction(
  currencyPair: CurrencyPair,
  historicalData: string,
  marketNews: string
): Promise<{ data?: AnalyzeInfluencesOutput; error?: string }> {
  try {
    const input: AnalyzeInfluencesInput = {
      currencyPair,
      historicalData,
      marketNews,
    };
    const prediction = await analyzeInfluences(input);
    if (!prediction.prediction || !prediction.reasoning) {
      // This case might happen if AI returns empty strings or undefined values for these fields
      // even if the flow itself doesn't throw.
      return { error: "AI returned incomplete data. Please try again." };
    }
    return { data: prediction };
  } catch (e) {
    console.error("Error getting Forex prediction:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the prediction.";
    return { error: `Failed to get prediction: ${errorMessage}` };
  }
}
