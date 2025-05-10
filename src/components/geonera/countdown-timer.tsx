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
  const [remainingTime, setRemainingTime] = useState<string>("--:--");
  const [isExpired, setIsExpired] = useState(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    targetDateRef.current = new Date(expiresAt); // Update targetDate if expiresAt prop changes
    setIsExpired(false); // Reset expired state if expiresAt changes
    setRemainingTime("--:--"); // Reset display

    const calculateRemainingTime = () => {
      const now = new Date();
      const secondsLeft = differenceInSeconds(targetDateRef.current, now);

      if (secondsLeft <= 0) {
        setRemainingTime("00:00");
        setIsExpired(true);
        if (onExpire) {
          onExpire();
        }
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
        }
        return;
      }

      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;
      setRemainingTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
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
        className
      )}
      {...props}
    >
      {isExpired ? "Expired" : remainingTime}
    </span>
  );
}
