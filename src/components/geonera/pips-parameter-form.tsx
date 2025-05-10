// src/components/geonera/pips-parameter-form.tsx
"use client";

import type { ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins, Bitcoin, Settings2 } from 'lucide-react';
import type { CurrencyPair, CurrencyOption, PipsTarget } from '@/types';

interface PipsParameterFormProps {
  currencyPair: CurrencyPair;
  pipsTarget: PipsTarget;
  onCurrencyChange: (value: CurrencyPair) => void;
  onPipsChange: (value: PipsTarget) => void;
  isLoading: boolean;
}

const currencyOptions: CurrencyOption[] = [
  { value: "XAU/USD", label: "Gold (XAU/USD)", icon: Coins },
  { value: "BTC/USD", label: "Bitcoin (BTC/USD)", icon: Bitcoin },
];

export function PipsParameterForm({
  currencyPair,
  pipsTarget,
  onCurrencyChange,
  onPipsChange,
  isLoading,
}: PipsParameterFormProps) {

  const handlePipsInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      onPipsChange(value);
    } else if (e.target.value === '') {
      onPipsChange(0); 
    }
  };
  
  return (
    <div className="space-y-6 p-6 bg-card shadow-lg rounded-lg border border-border">
      <div className="flex items-center gap-2 text-xl font-semibold text-primary">
        <Settings2 className="h-6 w-6" />
        <span>Prediction Parameters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currency-pair" className="text-md font-medium mb-1 block">Currency Pair</Label>
          <Select 
            onValueChange={(value) => onCurrencyChange(value as CurrencyPair)} 
            value={currencyPair} 
            name="currencyPair"
            disabled={isLoading}
          >
            <SelectTrigger id="currency-pair" className="w-full text-base py-2.5 h-auto">
              <SelectValue placeholder="Select pair" />
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
          <Label htmlFor="pips-target" className="text-md font-medium mb-1 block">Target Pips</Label>
          <Input
            id="pips-target"
            type="number"
            value={pipsTarget}
            onChange={handlePipsInputChange}
            placeholder="e.g., 10"
            className="text-base py-2.5 h-auto"
            min="1"
            disabled={isLoading}
          />
        </div>
      </div>

       <p className="text-sm text-center text-muted-foreground pt-2">
        Predictions will be generated automatically every minute based on the parameters above.
      </p>
    </div>
  );
}
