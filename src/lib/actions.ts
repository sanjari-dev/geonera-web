// src/lib/actions.ts
"use server";

import type { CurrencyPair, PipsSettings, PipsPredictionOutcome } from "@/types";

// Helper function to generate mock prediction data
function generateMockPrediction(currencyPair: CurrencyPair, pipsSettings: PipsSettings): PipsPredictionOutcome {
  const randomFactor = Math.random();
  let signalDetails: string;
  let reasoning: string;
  let tradingSignal: PipsPredictionOutcome["tradingSignal"];

  const { profitPips, lossPips } = pipsSettings;

  // Use the average of the profit pips range for potential move calculation, or target min.
  const midPointProfitPips = (profitPips.min + profitPips.max) / 2;
  const basePipsForCalc = midPointProfitPips > 0 ? midPointProfitPips : profitPips.min;

  const potentialPipsMove = Math.round(basePipsForCalc * (0.5 + randomFactor * 1.5)); // Moves between 50% and 200% of target

  const profitRangeString = `${profitPips.min}-${profitPips.max} PIPS`;
  const lossRangeString = `${lossPips.min}-${lossPips.max} PIPS`;

  // Mock Price Data Generation
  let openPrice, closePrice, highPrice, lowPrice;
  const volume = Math.floor(Math.random() * 100000) + 5000;

  if (currencyPair === "XAU/USD") {
    const base = 2300 + (Math.random() - 0.5) * 100;
    openPrice = parseFloat((base + (Math.random() - 0.5) * 20).toFixed(2));
    closePrice = parseFloat((openPrice + (Math.random() - 0.5) * 15).toFixed(2));
    highPrice = parseFloat((Math.max(openPrice, closePrice) + Math.random() * 10).toFixed(2));
    lowPrice = parseFloat((Math.min(openPrice, closePrice) - Math.random() * 10).toFixed(2));
  } else if (currencyPair === "BTC/USD") {
    const base = 60000 + (Math.random() - 0.5) * 5000;
    openPrice = parseFloat((base + (Math.random() - 0.5) * 1000).toFixed(2));
    closePrice = parseFloat((openPrice + (Math.random() - 0.5) * 800).toFixed(2));
    highPrice = parseFloat((Math.max(openPrice, closePrice) + Math.random() * 500).toFixed(2));
    lowPrice = parseFloat((Math.min(openPrice, closePrice) - Math.random() * 500).toFixed(2));
  } else { // Other currency pairs (EUR/USD, GBP/USD, etc.)
    const base = 1.1 + (Math.random() - 0.5) * 0.1; // Base around 1.1 for EUR/USD like pairs
     openPrice = parseFloat((base + (Math.random() - 0.5) * 0.01).toFixed(5)); // 5 decimal places
     closePrice = parseFloat((openPrice + (Math.random() - 0.5) * 0.008).toFixed(5));
     highPrice = parseFloat((Math.max(openPrice, closePrice) + Math.random() * 0.005).toFixed(5));
     lowPrice = parseFloat((Math.min(openPrice, closePrice) - Math.random() * 0.005).toFixed(5));
  }


  if (randomFactor < 0.4) { // Price increase scenario (potential BUY)
    tradingSignal = "BUY";
    if (potentialPipsMove >= profitPips.min) {
      signalDetails = `Expected to increase by ~${potentialPipsMove} pips, potentially meeting/exceeding profit target of ${profitRangeString}. Loss target ${lossRangeString}.`;
      reasoning = `Mock Data: Strong positive momentum simulated for ${currencyPair}.`;
    } else {
      signalDetails = `Expected to increase by ~${potentialPipsMove} pips, may not reach full profit target of ${profitRangeString}. Loss target ${lossRangeString}.`;
      reasoning = `Mock Data: Slight positive momentum simulated for ${currencyPair}, profit target reach uncertain.`;
    }
  } else if (randomFactor < 0.8) { // Consolidation or uncertain move
    tradingSignal = Math.random() < 0.5 ? "HOLD" : "WAIT";
    signalDetails = `Price may consolidate or move slightly; profit target ${profitRangeString} likely missed. Loss target ${lossRangeString}.`;
    reasoning = `Mock Data: Market conditions for ${currencyPair} appear consolidative or lacking clear direction.`;
  } else { // Price decrease scenario (potential SELL)
    tradingSignal = "SELL";
    // For a SELL signal, we can relate it to the lossPips for a BUY scenario or imply it's a good sell opportunity.
    signalDetails = `Expected to decrease by ~${potentialPipsMove} pips. This could be a SELL opportunity or hit loss targets (${lossRangeString}) if in a BUY position. Profit target for BUY was ${profitRangeString}.`;
    reasoning = `Mock Data: Negative pressure simulated on ${currencyPair}.`;
  }
  
  reasoning = `${reasoning} Profit Target: ${profitRangeString}, Loss Target: ${lossRangeString} for ${currencyPair}. Not financial advice.`;

  return { 
    tradingSignal, 
    signalDetails, 
    reasoning,
    openPrice,
    closePrice,
    highPrice,
    lowPrice,
    volume
  };
}

export async function getPipsPredictionAction(
  currencyPair: CurrencyPair,
  pipsSettings: PipsSettings // Changed from pipsTarget
): Promise<{ data?: PipsPredictionOutcome; error?: string }> {
  try {
    const { profitPips, lossPips } = pipsSettings;
    // Validate pipsSettings
    if (profitPips.min <= 0 || profitPips.max <= 0 || profitPips.min > profitPips.max ||
        lossPips.min <= 0 || lossPips.max <= 0 || lossPips.min > lossPips.max) {
      return { error: "Invalid PIPS settings. Min and Max for both profit and loss must be positive, and Min must be less than or equal to Max for each." };
    }
    
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));

    const predictionOutcome = generateMockPrediction(currencyPair, pipsSettings);
    
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
