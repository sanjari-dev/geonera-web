// src/components/geonera/pips-parameter-form.tsx
"use client";

import type { ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Coins, Bitcoin, Settings2, Euro, Landmark, ChevronDown } from 'lucide-react';
import type { CurrencyPair, CurrencyOption, PipsTargetRange } from '@/types';
import { cn } from '@/lib/utils';

interface PipsParameterFormProps {
  selectedCurrencyPairs: CurrencyPair[];
  pipsTarget: PipsTargetRange;
  onSelectedCurrencyPairsChange: (value: CurrencyPair[]) => void;
  onPipsChange: (value: PipsTargetRange) => void;
  isLoading: boolean;
}

const currencyOptions: CurrencyOption[] = [
  { value: "XAU/USD", label: "Gold (XAU/USD)", icon: Coins },
  { value: "BTC/USD", label: "Bitcoin (BTC/USD)", icon: Bitcoin },
  { value: "EUR/USD", label: "Euro/USD (EUR/USD)", icon: Euro },
  { value: "GBP/USD", label: "Pound/USD (GBP/USD)", icon: Landmark },
  { value: "USD/JPY", label: "USD/Yen (USD/JPY)", icon: Landmark },
  { value: "AUD/USD", label: "AUD/USD (AUD/USD)", icon: Landmark },
  { value: "USD/CAD", label: "USD/CAD (USD/CAD)", icon: Landmark },
];

const MAX_SELECTED_CURRENCIES = 5;

export function PipsParameterForm({
  selectedCurrencyPairs,
  pipsTarget,
  onSelectedCurrencyPairsChange,
  onPipsChange,
  isLoading,
}: PipsParameterFormProps) {

  const handleCurrencyToggle = (currencyValue: CurrencyPair) => {
    const newSelectedCurrencies = selectedCurrencyPairs.includes(currencyValue)
      ? selectedCurrencyPairs.filter(c => c !== currencyValue)
      : [...selectedCurrencyPairs, currencyValue];

    if (newSelectedCurrencies.length <= MAX_SELECTED_CURRENCIES) {
      onSelectedCurrencyPairsChange(newSelectedCurrencies);
    } else {
      // Optionally, provide feedback that limit is reached, though disabling items is primary
    }
  };

  const handleMinPipsInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const newMin = !isNaN(value) ? value : 0;
    onPipsChange({ ...pipsTarget, min: newMin });
  };

  const handleMaxPipsInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const newMax = !isNaN(value) ? value : 0;
    onPipsChange({ ...pipsTarget, max: newMax });
  };

  const getTriggerLabel = () => {
    if (selectedCurrencyPairs.length === 0) return "Select currencies...";
    if (selectedCurrencyPairs.length === 1) {
      const option = currencyOptions.find(opt => opt.value === selectedCurrencyPairs[0]);
      return option ? option.label : selectedCurrencyPairs[0];
    }
    if (selectedCurrencyPairs.length <= 3) return selectedCurrencyPairs.join(', ');
    return `${selectedCurrencyPairs.length} currencies selected`;
  };
  
  return (
    <div className="space-y-6 p-6 bg-card shadow-lg rounded-lg border border-border">
      <div className="flex items-center gap-2 text-xl font-semibold text-primary">
        <Settings2 className="h-6 w-6" />
        <span>Prediction Parameters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Label htmlFor="currency-pair-multiselect" className="text-md font-medium mb-1 block">
            Currency Pair(s)
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="currency-pair-multiselect"
                variant="outline"
                className={cn(
                  "w-full justify-between text-base py-2.5 h-auto",
                  selectedCurrencyPairs.length === 0 && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <span className="truncate">{getTriggerLabel()}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuLabel>Select up to {MAX_SELECTED_CURRENCIES} currencies</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currencyOptions.map(option => {
                const IconComponent = option.icon;
                const isSelected = selectedCurrencyPairs.includes(option.value);
                const isDisabled = !isSelected && selectedCurrencyPairs.length >= MAX_SELECTED_CURRENCIES;
                return (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={isSelected}
                    onCheckedChange={() => handleCurrencyToggle(option.value)}
                    disabled={isDisabled || isLoading}
                    className="text-base py-2"
                  >
                    <div className="flex items-center">
                      {IconComponent && <IconComponent className="h-5 w-5 mr-2 text-muted-foreground" />}
                      {option.label}
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div>
          <Label htmlFor="min-pips-target" className="text-md font-medium mb-1 block">Min Target PIPS</Label>
          <Input
            id="min-pips-target"
            type="number"
            value={pipsTarget.min}
            onChange={handleMinPipsInputChange}
            placeholder="e.g., 5"
            className="text-base py-2.5 h-auto"
            min="1"
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="max-pips-target" className="text-md font-medium mb-1 block">Max Target PIPS</Label>
          <Input
            id="max-pips-target"
            type="number"
            value={pipsTarget.max}
            onChange={handleMaxPipsInputChange}
            placeholder="e.g., 20"
            className="text-base py-2.5 h-auto"
            min="1"
            disabled={isLoading}
          />
        </div>
      </div>

       <p className="text-sm text-center text-muted-foreground pt-2">
        Predictions will be generated automatically based on the parameters above. Ensure Min PIPS is less than or equal to Max PIPS.
      </p>
    </div>
  );
}
