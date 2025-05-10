// src/lib/actions.ts
"use server";

import type { CurrencyPair, PipsTargetRange, PipsPredictionOutcome } from "@/types";

// Helper function to generate mock prediction data
function generateMockPrediction(currencyPair: CurrencyPair, pipsTarget: PipsTargetRange): PipsPredictionOutcome {
  const randomFactor = Math.random();
  let signalDetails: string;
  let reasoning: string;
  let tradingSignal: PipsPredictionOutcome["tradingSignal"];

  // Use the average of the pips range for potential move calculation, or target min.
  const midPointPips = (pipsTarget.min + pipsTarget.max) / 2;
  const basePipsForCalc = midPointPips > 0 ? midPointPips : pipsTarget.min; // Ensure we use a positive base

  const potentialPipsMove = Math.round(basePipsForCalc * (0.5 + randomFactor * 1.5)); // Moves between 50% and 200% of target (min or average)

  const targetRangeString = `${pipsTarget.min}-${pipsTarget.max} PIPS`;

  if (randomFactor < 0.4) { // Price increase scenario
    tradingSignal = "BUY";
    if (potentialPipsMove >= pipsTarget.min) { // Check against min of the range
      signalDetails = `Expected to increase by ~${potentialPipsMove} pips, potentially meeting/exceeding ${targetRangeString} target.`;
      reasoning = `Mock Data: Strong positive momentum simulated for ${currencyPair}.`;
    } else {
      signalDetails = `Expected to increase by ~${potentialPipsMove} pips, may not reach full ${targetRangeString} target.`;
      reasoning = `Mock Data: Slight positive momentum simulated for ${currencyPair}, target range reach uncertain.`;
    }
  } else if (randomFactor < 0.8) { // Consolidation or uncertain move
    tradingSignal = Math.random() < 0.5 ? "HOLD" : "WAIT";
    signalDetails = `Price may consolidate or move slightly; ${targetRangeString} target likely missed.`;
    reasoning = `Mock Data: Market conditions for ${currencyPair} appear consolidative or lacking clear direction.`;
  } else { // Price decrease scenario
    tradingSignal = "SELL";
    signalDetails = `Expected to decrease by ~${potentialPipsMove} pips, moving against buy target within ${targetRangeString}.`;
    reasoning = `Mock Data: Negative pressure simulated on ${currencyPair}.`;
  }
  
  reasoning = `${reasoning} Target Range: ${targetRangeString} for ${currencyPair}. Not financial advice.`;

  return { tradingSignal, signalDetails, reasoning };
}

export async function getPipsPredictionAction(
  currencyPair: CurrencyPair,
  pipsTarget: PipsTargetRange
): Promise<{ data?: PipsPredictionOutcome; error?: string }> {
  try {
    // Validate pipsTarget range
    if (pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max) {
      return { error: "Invalid PIPS target range. Min and Max must be positive, and Min must be less than or equal to Max." };
    }
    
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
