// src/components/geonera/countdown-timer.tsx
"use client";

import type { HTMLAttributes } from 'react';
import { useState, useEffect, useRef } from 'react';
import { differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';

interface CountdownTimerProps extends HTMLAttributes<HTMLSpanElement> {
  expiresAt: Date | string;
  onExpire?: () => void; // Optional: Callback when timer reaches zero or below
}

export function CountdownTimer({ expiresAt, onExpire, className, ...props }: CountdownTimerProps) {
  const targetDateRef = useRef(new Date(expiresAt));
  const [remainingTime, setRemainingTime] = useState<string>("-- --:--:--");
  const [isExpired, setIsExpired] = useState(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    targetDateRef.current = new Date(expiresAt); // Update targetDate if expiresAt prop changes
    setIsExpired(false); // Reset expired state if expiresAt changes
    setRemainingTime("-- --:--:--"); // Reset display

    const calculateRemainingTime = () => {
      const now = new Date();
      let secondsLeft = differenceInSeconds(targetDateRef.current, now);

      if (secondsLeft <= 0) {
        setRemainingTime("Expired");
        setIsExpired(true);
        if (onExpire) {
          onExpire();
        }
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
        }
        return;
      }

      const days = Math.floor(secondsLeft / (24 * 60 * 60));
      secondsLeft -= days * 24 * 60 * 60;
      const hours = Math.floor(secondsLeft / (60 * 60));
      secondsLeft -= hours * 60 * 60;
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;

      const formattedDays = String(days).padStart(2, '0');
      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');

      setRemainingTime(`${formattedDays} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
      setIsExpired(false);
    };

    calculateRemainingTime(); // Initial calculation
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }
    intervalIdRef.current = setInterval(calculateRemainingTime, 1000);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [expiresAt, onExpire]);

  return (
    <span
      className={cn(
        isExpired ? "text-destructive/80" : "text-foreground",
        "min-w-[80px] text-center", // Added min-width and text-center for better alignment
        className
      )}
      {...props}
    >
      {remainingTime}
    </span>
  );
}
