// src/lib/actions.ts
"use server";

import type { CurrencyPair, PipsTarget, PipsPredictionOutcome } from "@/types";

// Helper function to generate mock prediction data
function generateMockPrediction(currencyPair: CurrencyPair, pipsTarget: PipsTarget): PipsPredictionOutcome {
  const randomFactor = Math.random();
  let signalDetails: string;
  let reasoning: string;
  let tradingSignal: PipsPredictionOutcome["tradingSignal"];

  const potentialPipsMove = Math.round(pipsTarget * (0.5 + randomFactor * 1.5)); // Moves between 50% and 200% of target

  if (randomFactor < 0.4) { // Price increase scenario
    tradingSignal = "BUY";
    if (potentialPipsMove >= pipsTarget) {
      signalDetails = `Expected to increase by ~${potentialPipsMove} pips, meeting/exceeding target.`;
      reasoning = `Mock Data: Strong positive momentum simulated for ${currencyPair}.`;
    } else {
      signalDetails = `Expected to increase by ~${potentialPipsMove} pips, may not reach full ${pipsTarget} pips target.`;
      reasoning = `Mock Data: Slight positive momentum simulated for ${currencyPair}, target reach uncertain.`;
    }
  } else if (randomFactor < 0.8) { // Consolidation or uncertain move
    tradingSignal = Math.random() < 0.5 ? "HOLD" : "WAIT";
    signalDetails = `Price may consolidate or move slightly; ${pipsTarget} pips target likely missed.`;
    reasoning = `Mock Data: Market conditions for ${currencyPair} appear consolidative or lacking clear direction.`;
  } else { // Price decrease scenario
    tradingSignal = "SELL";
    signalDetails = `Expected to decrease by ~${potentialPipsMove} pips, moving against buy target.`;
    reasoning = `Mock Data: Negative pressure simulated on ${currencyPair}.`;
  }
  
  reasoning = `${reasoning} Target: ${pipsTarget} pips for ${currencyPair}. Not financial advice.`;

  return { tradingSignal, signalDetails, reasoning };
}

export async function getPipsPredictionAction(
  currencyPair: CurrencyPair,
  pipsTarget: PipsTarget
): Promise<{ data?: PipsPredictionOutcome; error?: string }> {
  try {
    // Simulate a short delay, similar to a quick API call
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));

    const predictionOutcome = generateMockPrediction(currencyPair, pipsTarget);
    
    if (!predictionOutcome.tradingSignal || !predictionOutcome.signalDetails || !predictionOutcome.reasoning) {
      return { error: "Mock data generation resulted in incomplete data. Please check the generation logic." };
    }
    return { data: predictionOutcome };
  } catch (e) {
    console.error("Error in mock Pips-based Forex prediction generation:", e);
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during mock prediction generation.";
    return { error: `Failed to get mock prediction: ${errorMessage}` };
  }
}
