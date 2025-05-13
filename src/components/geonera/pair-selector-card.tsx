// src/components/geonera/pair-selector-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Bitcoin, Euro, Landmark, ChevronDown } from 'lucide-react';
import type { CurrencyPair, CurrencyOption } from '@/types';
import { cn } from '@/lib/utils';

interface PairSelectorCardProps {
  selectedCurrencyPairs: CurrencyPair[];
  onSelectedCurrencyPairsChangeAction: (value: CurrencyPair[]) => void;
  isLoading: boolean;
  className?: string;
  variant?: "card" | "button";
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

export function PairSelectorCard({
  selectedCurrencyPairs,
  onSelectedCurrencyPairsChangeAction,
  isLoading,
  className,
  variant = "card", // Default to "card"
}: PairSelectorCardProps) {

  const handleCurrencyToggle = (currencyValue: CurrencyPair) => {
    const newSelectedCurrencies = selectedCurrencyPairs.includes(currencyValue)
      ? selectedCurrencyPairs.filter(c => c !== currencyValue)
      : [...selectedCurrencyPairs, currencyValue];

    if (newSelectedCurrencies.length <= MAX_SELECTED_CURRENCIES) {
      onSelectedCurrencyPairsChangeAction(newSelectedCurrencies);
    }
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

  const triggerButtonClassName = variant === "button"
    ? "justify-between text-xs py-1 h-8 min-w-[180px] max-w-[280px] border-primary/30 focus:border-primary" // Adjusted for header
    : cn(
        "w-full justify-between text-xs py-1 h-8",
        selectedCurrencyPairs.length === 0 && "text-muted-foreground"
      );
  
  const dropdownMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="currency-pair-multiselect"
          variant="outline"
          className={triggerButtonClassName}
          disabled={isLoading}
          aria-label={`Select currency pairs, currently selected: ${getTriggerLabel()}`}
        >
          <span className="truncate">{getTriggerLabel()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuLabel className="text-xs">Select up to {MAX_SELECTED_CURRENCIES} currencies</DropdownMenuLabel>
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
              className="text-xs py-1"
              aria-label={option.label}
            >
              <div className="flex items-center">
                {IconComponent && <IconComponent aria-hidden="true" className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />}
                {option.label}
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === "button") {
    return <div className={className}>{dropdownMenu}</div>;
  }
  
  // Default "card" variant
  return (
    <Card className={cn("shadow-lg flex flex-col", className)}> {/* Removed h-full, parent should control height */}
      <CardHeader className="p-2">
        <CardTitle className="text-sm font-semibold text-primary flex items-center">
          <Coins className="h-4 w-4 mr-1.5" aria-hidden="true" />
          <span>Select Currency Pair(s)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0 flex-grow flex flex-col justify-center"> {/* justify-center to center vertically if card has height */}
        <div className={cn(variant === "card" && "mt-auto")}>{dropdownMenu}</div> {/* mt-auto only for card variant if it has extra space */}
      </CardContent>
    </Card>
  );
}
