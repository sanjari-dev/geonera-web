// src/ai/flows/generate-forecast.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating forex exchange rate forecasts.
 *
 * - generateForecast - A function that triggers the forex forecast generation flow.
 * - GenerateForecastInput - The input type for the generateForecast function, specifying the currency pair.
 * - GenerateForecastOutput - The output type for the generateForecast function, providing the forecast details.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateForecastInputSchema = z.object({
  currencyPair: z
    .string()
    .describe('The currency pair for which to generate the forecast (e.g., XAU/USD, BTC/USD).'),
});
export type GenerateForecastInput = z.infer<typeof GenerateForecastInputSchema>;

const GenerateForecastOutputSchema = z.object({
  forecast: z.string().describe('The predicted exchange rate for the specified currency pair.'),
  reasoning: z.string().describe('The reasoning behind the forecast, including factors considered.'),
  disclaimer: z
    .string()
    .optional()
    .describe('An optional disclaimer to display regarding the forecast.'),
});
export type GenerateForecastOutput = z.infer<typeof GenerateForecastOutputSchema>;

export async function generateForecast(input: GenerateForecastInput): Promise<GenerateForecastOutput> {
  return generateForecastFlow(input);
}

const generateForecastingPrompt = ai.definePrompt({
  name: 'generateForecastingPrompt',
  input: {schema: GenerateForecastInputSchema},
  output: {schema: GenerateForecastOutputSchema},
  prompt: `You are an expert in forex trading and technical analysis.

  Based on historical data, current market trends, and any other relevant factors, generate a forecast for the exchange rate of {{currencyPair}}.
  Explain your reasoning for the forecast.
  If there are any risks you must add a disclaimer.

  Format your response as a JSON object that can be parsed by Typescript code.
  `,
});

const generateForecastFlow = ai.defineFlow(
  {
    name: 'generateForecastFlow',
    inputSchema: GenerateForecastInputSchema,
    outputSchema: GenerateForecastOutputSchema,
  },
  async input => {
    const {output} = await generateForecastingPrompt(input);
    return output!;
  }
);
