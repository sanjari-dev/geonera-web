// src/components/geonera/prediction-filter-controls.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { StatusFilterType, SignalFilterType } from "@/types";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionFilterControlsProps {
  filterStatus: StatusFilterType;
  onFilterStatusChange: (value: StatusFilterType) => void;
  filterSignal: SignalFilterType;
  onFilterSignalChange: (value: SignalFilterType) => void;
  showExpired: boolean;
  onShowExpiredChange: (checked: boolean) => void;
  className?: string;
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
  showExpired,
  onShowExpiredChange,
  className,
}: PredictionFilterControlsProps) {
  return (
    <div className={cn("space-y-1 p-2 bg-card shadow-lg rounded-lg border border-border h-full flex flex-col", className)}>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-1">
        <Filter className="h-4 w-4" aria-hidden="true" />
        <span>Filter & Sort</span>
      </div>
      <div className="grid grid-cols-2 gap-1 flex-grow content-end"> {/* Use content-end to push items to bottom */}
        <div className="flex flex-col justify-end">
          <Label htmlFor="filter-status" className="text-xs font-medium mb-0.5 block">
            By Status
          </Label>
          <Select
            value={filterStatus}
            onValueChange={(value) => onFilterStatusChange(value as StatusFilterType)}
          >
            <SelectTrigger id="filter-status" className="w-full text-xs py-1 h-8" aria-label="Filter by prediction status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs py-1">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end">
          <Label htmlFor="filter-signal" className="text-xs font-medium mb-0.5 block">
            By Signal
          </Label>
          <Select
            value={filterSignal}
            onValueChange={(value) => onFilterSignalChange(value as SignalFilterType)}
          >
            <SelectTrigger id="filter-signal" className="w-full text-xs py-1 h-8" aria-label="Filter by trading signal">
              <SelectValue placeholder="Select signal" />
            </SelectTrigger>
            <SelectContent>
              {signalOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs py-1">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
         <div className="flex items-center space-x-1.5 col-span-2 justify-self-start mt-1"> {/* Aligned to start (left) and added margin top */}
          <Switch
            id="show-expired"
            checked={showExpired}
            onCheckedChange={onShowExpiredChange}
            aria-label={showExpired ? "Hide expired predictions" : "Show expired predictions"}
          />
          <Label htmlFor="show-expired" className="text-xs font-medium">Show Expired</Label>
        </div>
      </div>
    </div>
  );
}
