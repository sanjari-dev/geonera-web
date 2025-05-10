// src/components/geonera/prediction-form.tsx
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Coins, Bitcoin } from 'lucide-react';
import { getForexPredictionAction } from '@/lib/actions';
import type { CurrencyPair, CurrencyOption } from '@/types';
import type { FormState } from '@/app/page'; 
import { useToast } from "@/hooks/use-toast";

interface PredictionFormProps {
  initialCurrency: CurrencyPair;
  onStateChange: (newState: Partial<FormState>) => void;
}

const currencyOptions: CurrencyOption[] = [
  { value: "XAU/USD", label: "Gold (XAU/USD)", icon: Coins },
  { value: "BTC/USD", label: "Bitcoin (BTC/USD)", icon: Bitcoin },
];

const defaultHistoricalData: Record<CurrencyPair, string> = {
  "XAU/USD": "Historical data for XAU/USD: \n- Past 7 days: Ranged between $2300 and $2350. \n- Key support at $2280, resistance at $2360. \n- RSI indicating neutral momentum.",
  "BTC/USD": "Historical data for BTC/USD: \n- Past 7 days: Volatile, traded between $60,000 and $65,000. \n- Strong support near $58,000. \n- Trading volume has been moderate.",
};

const defaultMarketNews: Record<CurrencyPair, string> = {
  "XAU/USD": "Recent market news for XAU/USD: \n- Federal Reserve meeting minutes suggest a cautious approach to rate cuts. \n- Geopolitical tensions in Eastern Europe are increasing safe-haven demand for gold. \n- US Dollar Index showing slight weakness.",
  "BTC/USD": "Recent market news for BTC/USD: \n- Major crypto exchange announced new security upgrades. \n- Regulatory discussions ongoing in several key markets. \n- Increased institutional interest reported by analytics firms.",
};

export function PredictionForm({ initialCurrency, onStateChange }: PredictionFormProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyPair>(initialCurrency);
  const [historicalData, setHistoricalData] = useState(defaultHistoricalData[initialCurrency]);
  const [marketNews, setMarketNews] = useState(defaultMarketNews[initialCurrency]);
  const [isLoading, setIsLoading] = useState(false); // Internal loading state for the button
  const { toast } = useToast();

  useEffect(() => {
    // Sync with parent if initialCurrency changes externally (though not typical for this setup)
    setSelectedCurrency(initialCurrency);
    setHistoricalData(defaultHistoricalData[initialCurrency]);
    setMarketNews(defaultMarketNews[initialCurrency]);
  }, [initialCurrency]);
  
  useEffect(() => {
    // Update text areas when selectedCurrency changes internally
    setHistoricalData(defaultHistoricalData[selectedCurrency]);
    setMarketNews(defaultMarketNews[selectedCurrency]);
  }, [selectedCurrency]);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    onStateChange({ currency: selectedCurrency, loading: true, prediction: null, error: null });

    if (!historicalData.trim() || !marketNews.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide historical data and market news.",
        variant: "destructive",
      });
      setIsLoading(false);
      onStateChange({ loading: false, error: "Historical data and market news cannot be empty." });
      return;
    }

    const result = await getForexPredictionAction(selectedCurrency, historicalData, marketNews);
    setIsLoading(false);

    if (result.error) {
      onStateChange({ loading: false, prediction: null, error: result.error });
      toast({
        title: "Prediction Error",
        description: result.error,
        variant: "destructive",
      });
    } else if (result.data) {
      onStateChange({ loading: false, prediction: result.data, error: null });
      toast({
        title: "Prediction Generated",
        description: `Forecast for ${selectedCurrency} is ready.`,
      });
    }
  };

  const handleCurrencyChange = (value: string) => {
    const newCurrency = value as CurrencyPair;
    setSelectedCurrency(newCurrency);
    // Notify parent about currency change and reset other states
    onStateChange({ currency: newCurrency, prediction: null, error: null, loading: false });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-card shadow-lg rounded-lg border">
      <div>
        <Label htmlFor="currency-pair" className="text-lg font-semibold mb-2 block text-primary">Select Currency Pair</Label>
        <Select onValueChange={handleCurrencyChange} value={selectedCurrency} name="currencyPair">
          <SelectTrigger id="currency-pair" className="w-full text-base py-3 h-auto">
            <SelectValue placeholder="Select a currency pair" />
          </SelectTrigger>
          <SelectContent>
            {currencyOptions.map(option => {
              const IconComponent = option.icon;
              return (
                <SelectItem key={option.value} value={option.value} className="text-base py-2">
                  <div className="flex items-center">
                    {IconComponent && <IconComponent className="h-5 w-5 mr-2 text-muted-foreground" />}
                    {option.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="historical-data" className="text-lg font-semibold mb-2 block text-primary">Historical Data</Label>
        <Textarea
          id="historical-data"
          value={historicalData}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setHistoricalData(e.target.value)}
          placeholder="Enter relevant historical data for the selected pair..."
          className="min-h-[120px] text-sm bg-background focus:ring-accent"
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-1">Provide a summary of recent price movements, support/resistance levels, etc.</p>
      </div>

      <div>
        <Label htmlFor="market-news" className="text-lg font-semibold mb-2 block text-primary">Market News</Label>
        <Textarea
          id="market-news"
          value={marketNews}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMarketNews(e.target.value)}
          placeholder="Enter recent market news and events..."
          className="min-h-[120px] text-sm bg-background focus:ring-accent"
          rows={5}
        />
        <p className="text-xs text-muted-foreground mt-1">Include news that might affect the currency pair's valuation.</p>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-3 rounded-md">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Prediction...
          </>
        ) : (
          "Get AI Prediction"
        )}
      </Button>
    </form>
  );
}
