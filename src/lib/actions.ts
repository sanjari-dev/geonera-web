// src/lib/actions.ts
"use server";

import { analyzePipsInfluence } from "@/ai/flows/analyze-influences";
import type { CurrencyPair, PipsTarget, PipsPredictionOutcome, AnalyzePipsInfluenceInput } from "@/types";

export async function getPipsPredictionAction(
  currencyPair: CurrencyPair,
  pipsTarget: PipsTarget
): Promise<{ data?: PipsPredictionOutcome; error?: string }> {
  try {
    const input: AnalyzePipsInfluenceInput = {
      currencyPair,
      pipsTarget,
    };
    const predictionOutcome = await analyzePipsInfluence(input);
    
    if (!predictionOutcome.outcome || !predictionOutcome.reasoning) {
      return { error: "AI returned incomplete data. Please try again." };
    }
    return { data: predictionOutcome };
  } catch (e) {
    console.error("Error getting Pips-based Forex prediction:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while fetching the prediction.";
    return { error: `Failed to get prediction: ${errorMessage}` };
  }
}

