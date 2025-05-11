// src/components/geonera/prediction-filter-controls.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { StatusFilterType, SignalFilterType } from "@/types";
import { Filter } from "lucide-react";

interface PredictionFilterControlsProps {
  filterStatus: StatusFilterType;
  onFilterStatusChange: (value: StatusFilterType) => void;
  filterSignal: SignalFilterType;
  onFilterSignalChange: (value: SignalFilterType) => void;
}

const statusOptions: { value: StatusFilterType; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SUCCESS", label: "Success" },
  { value: "ERROR", label: "Error" },
];

const signalOptions: { value: SignalFilterType; label: string }[] = [
  { value: "ALL", label: "All Signals" },
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "HOLD", label: "Hold" },
  { value: "WAIT", label: "Wait" },
  { value: "N/A", label: "N/A" },
];

export function PredictionFilterControls({
  filterStatus,
  onFilterStatusChange,
  filterSignal,
  onFilterSignalChange,
}: PredictionFilterControlsProps) {
  return (
    <div className="space-y-2 p-3 bg-card shadow-lg rounded-lg border border-border h-full">
      <div className="flex items-center gap-2 text-base font-semibold text-primary">
        <Filter className="h-5 w-5" />
        <span>Filter Predictions</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex flex-col justify-end">
          <Label htmlFor="filter-status" className="text-sm font-medium mb-1 block">
            Filter by Status
          </Label>
          <Select
            value={filterStatus}
            onValueChange={(value) => onFilterStatusChange(value as StatusFilterType)}
          >
            <SelectTrigger id="filter-status" className="w-full text-sm py-2 h-9" aria-label="Filter by prediction status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-sm py-1.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end">
          <Label htmlFor="filter-signal" className="text-sm font-medium mb-1 block">
            Filter by Signal (MT5)
          </Label>
          <Select
            value={filterSignal}
            onValueChange={(value) => onFilterSignalChange(value as SignalFilterType)}
          >
            <SelectTrigger id="filter-signal" className="w-full text-sm py-2 h-9" aria-label="Filter by trading signal">
              <SelectValue placeholder="Select signal" />
            </SelectTrigger>
            <SelectContent>
              {signalOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-sm py-1.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
