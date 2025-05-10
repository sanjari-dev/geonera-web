// src/lib/actions.ts
"use server";

// AI flow is no longer used for prediction.
// import { analyzePipsInfluence } from "@/ai/flows/analyze-influences"; 
import type { CurrencyPair, PipsTarget, PipsPredictionOutcome } from "@/types";

// Helper function to generate mock prediction data
function generateMockPrediction(currencyPair: CurrencyPair, pipsTarget: PipsTarget): PipsPredictionOutcome {
  const randomFactor = Math.random();
  let outcome: string;
  let reasoning: string;

  // Simulate different outcomes based on pipsTarget and randomness
  const potentialPipsMove = Math.round(pipsTarget * (0.5 + randomFactor)); // Moves between 50% and 150% of target

  if (randomFactor < 0.35) { // Price increase scenario
    outcome = `Price expected to increase by ~${potentialPipsMove} pips.`;
    reasoning = `Mock Data: Simulated analysis suggests positive momentum for ${currencyPair}, potentially exceeding the ${pipsTarget} pips target.`;
    if (potentialPipsMove < pipsTarget) {
       outcome = `Price expected to increase by ~${potentialPipsMove} pips, but may not reach ${pipsTarget} pips.`;
       reasoning = `Mock Data: Simulated analysis suggests slight positive momentum for ${currencyPair}, though reaching the full ${pipsTarget} pips target is uncertain.`;
    }
  } else if (randomFactor < 0.7) { // Consolidation or slight move
    outcome = `Price may consolidate or move slightly, likely missing the ${pipsTarget} pips target.`;
    reasoning = `Mock Data: Simulated market conditions for ${currencyPair} indicate consolidation or minor fluctuations, making the ${pipsTarget} pips target unlikely.`;
  } else { // Price decrease scenario
    outcome = `Price expected to decrease, moving against the ${pipsTarget} pips target.`;
    reasoning = `Mock Data: Simulated analysis indicates negative pressure on ${currencyPair}, moving away from the ${pipsTarget} pips target.`;
  }
  
  // Ensure reasoning mentions the pair and target for clarity
  reasoning = `${reasoning} Target was ${pipsTarget} pips for ${currencyPair}. This is not financial advice.`;

  return { outcome, reasoning };
}

export async function getPipsPredictionAction(
  currencyPair: CurrencyPair,
  pipsTarget: PipsTarget
): Promise<{ data?: PipsPredictionOutcome; error?: string }> {
  try {
    // Simulate a short delay, similar to a quick API call
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));

    // Generate mock prediction data instead of calling an AI flow
    const predictionOutcome = generateMockPrediction(currencyPair, pipsTarget);
    
    if (!predictionOutcome.outcome || !predictionOutcome.reasoning) {
      // This case should ideally not be hit with the current mock generator
      return { error: "Mock data generation resulted in incomplete data. Please check the generation logic." };
    }
    return { data: predictionOutcome };
  } catch (e) {
    console.error("Error in mock Pips-based Forex prediction generation:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during mock prediction generation.";
    return { error: `Failed to get mock prediction: ${errorMessage}` };
  }
}
