// src/components/forex-prophet/prediction-display.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, TrendingUp } from "lucide-react";
import type { PredictionData } from '@/types';

interface PredictionDisplayProps {
  predictionData: PredictionData | null;
  isLoading: boolean;
  error: string | null;
  selectedCurrency: string | null;
}

export function PredictionDisplay({ predictionData, isLoading, error, selectedCurrency }: PredictionDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-card shadow-lg rounded-lg border border-border min-h-[200px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Generating prediction for {selectedCurrency}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="shadow-lg">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-xl font-semibold">Error</AlertTitle>
        <AlertDescription className="text-base">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!predictionData) {
    return (
      <div className="p-10 bg-card shadow-lg rounded-lg border border-border min-h-[200px] flex flex-col items-center justify-center">
         <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg text-center text-muted-foreground">
          Select a currency pair and provide data to generate a prediction.
        </p>
      </div>
    );
  }

  return (
    <Card className="shadow-xl border-accent">
      <CardHeader className="bg-accent/10 p-6 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-accent" />
          <div>
            <CardTitle className="text-2xl font-bold text-accent">
              AI Forex Forecast: {selectedCurrency}
            </CardTitle>
            <CardDescription className="text-md text-accent/80">
              Powered by Advanced AI Analysis
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-primary mb-2">Predicted Rate</h3>
          <p className="text-2xl font-bold text-foreground bg-secondary p-3 rounded-md shadow-sm">
            {predictionData.prediction}
          </p>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-primary mb-2">AI Reasoning</h3>
          <div className="text-base text-foreground p-4 border border-border rounded-md bg-background shadow-inner whitespace-pre-wrap">
            {predictionData.reasoning}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
