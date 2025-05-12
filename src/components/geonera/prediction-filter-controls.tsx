// src/components/geonera/prediction-filter-controls.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StatusFilterType, SignalFilterType, DateRangeFilter } from "@/types";
import { Filter, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { format as formatDateFns, isValid } from 'date-fns';

interface PredictionFilterControlsProps {
  filterStatus: StatusFilterType;
  onFilterStatusChange: (value: StatusFilterType) => void;
  filterSignal: SignalFilterType;
  onFilterSignalChange: (value: SignalFilterType) => void;
  dateRangeFilter: DateRangeFilter;
  onDateRangeChange: (newRange: DateRangeFilter) => void;
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

const formatDateToDateTimeLocal = (date: Date | null): string => {
  if (!date || !isValid(date)) return '';
  // Ensure date is treated as local timezone before formatting
  // This typically involves ensuring the Date object itself represents local time
  // or adjusting if it's UTC before formatting.
  // For `datetime-local` input, it expects "yyyy-MM-ddTHH:mm"
  return formatDateFns(date, "yyyy-MM-dd'T'HH:mm:ss"); // Standard ISO format without timezone
};


export function PredictionFilterControls({
  filterStatus,
  onFilterStatusChange,
  filterSignal,
  onFilterSignalChange,
  dateRangeFilter,
  onDateRangeChange,
  className,
}: PredictionFilterControlsProps) {
  return (
    <div className={cn("space-y-1 p-2 bg-card shadow-lg rounded-lg border border-border h-full flex flex-col", className)}>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-1">
        <Filter className="h-4 w-4" aria-hidden="true" />
        <span>Filter & Sort</span>
      </div>
      <div className="grid grid-cols-2 gap-1 flex-grow">
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
        <div className="flex flex-col justify-end">
            <Label htmlFor="date-filter-start" className="text-xs font-medium mb-0.5 block flex items-center">
                 <CalendarDays className="h-3 w-3 mr-1" /> From:
            </Label>
            <Input
                type="datetime-local"
                id="date-filter-start"
                value={formatDateToDateTimeLocal(dateRangeFilter.start)}
                onChange={(e) => {
                  const newStart = e.target.value ? new Date(e.target.value) : null;
                  if (newStart && isValid(newStart)) {
                    onDateRangeChange({ ...dateRangeFilter, start: newStart });
                  } else if (!e.target.value) {
                     onDateRangeChange({ ...dateRangeFilter, start: null });
                  }
                }}
                className="h-8 text-xs py-1 w-full"
                aria-label="Filter start date and time"
              />
        </div>
        <div className="flex flex-col justify-end">
             <Label htmlFor="date-filter-end" className="text-xs font-medium mb-0.5 block flex items-center">
                <CalendarDays className="h-3 w-3 mr-1" /> To:
             </Label>
             <Input
                type="datetime-local"
                id="date-filter-end"
                value={formatDateToDateTimeLocal(dateRangeFilter.end)}
                onChange={(e) => {
                  const newEnd = e.target.value ? new Date(e.target.value) : null;
                   if (newEnd && isValid(newEnd)) {
                    onDateRangeChange({ ...dateRangeFilter, end: newEnd });
                  } else if (!e.target.value) {
                    onDateRangeChange({ ...dateRangeFilter, end: null });
                  }
                }}
                className="h-8 text-xs py-1 w-full"
                aria-label="Filter end date and time"
              />
        </div>
      </div>
    </div>
  );
}
