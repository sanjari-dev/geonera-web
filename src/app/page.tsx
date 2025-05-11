
"use client";

import type { ChangeEvent } from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { produce } from 'immer';
import { AppHeader } from '@/components/geonera/header';
import { PipsParameterForm } from '@/components/geonera/pips-parameter-form';
import { PredictionsTable } from '@/components/geonera/predictions-table';
import { PredictionDetailsPanel } from '@/components/geonera/prediction-details-panel';
import { PredictionFilterControls } from '@/components/geonera/prediction-filter-controls';
import { NotificationDisplay } from '@/components/geonera/notification-display';
import type {
  PredictionLogItem,
  PipsTargetRange,
  CurrencyPair,
  User,
  StatusFilterType,
  SignalFilterType,
  SortConfig,
  SortableColumnKey,
  NotificationMessage,
} from '@/types';
import { getPipsPredictionAction } from '@/lib/actions';
import { v4 as uuidv4 } from 'uuid';
import { addSeconds, isAfter } from 'date-fns';

const PREDICTION_INTERVAL_MS = 5000; // 5 seconds
const MIN_EXPIRATION_SECONDS = 10; // Minimum 10 seconds
const MAX_EXPIRATION_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_PREDICTION_LOGS = 1500;

export default function GeoneraPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClientReady, setIsClientReady] = useState(false);

  const [predictionLogs, setPredictionLogs] = useState<PredictionLogItem[]>([]);
  const [selectedCurrencyPairs, setSelectedCurrencyPairs] = useState<CurrencyPair[]>([]);
  const [pipsTarget, setPipsTarget] = useState<PipsTargetRange>({ min: 10, max: 20 });
  const [selectedPredictionLog, setSelectedPredictionLog] = useState<PredictionLogItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [filterStatus, setFilterStatus] = useState<StatusFilterType>("ALL");
  const [filterSignal, setFilterSignal] = useState<SignalFilterType>("ALL");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'timestamp', direction: 'asc' });
  const [latestNotification, setLatestNotification] = useState<NotificationMessage | null>(null);

  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const [currentYear, setCurrentYear] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('geoneraUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          setCurrentUser(user);
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          localStorage.removeItem('geoneraUser');
          // router.replace('/login'); // Moved to dedicated effect
        }
      }
      // else { // Moved to dedicated effect
      // router.replace('/login');
      // }
      setIsClientReady(true);
    }
  }, []); // Removed router from dependencies

  // Dedicated effect for redirection based on currentUser
  useEffect(() => {
    if (isClientReady && !currentUser && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [isClientReady, currentUser, router]);


  const requestFullscreen = useCallback(async () => {
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Error attempting to enable full-screen mode:", err);
        // Optionally notify user that fullscreen was blocked
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document !== 'undefined') {
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      // Automatically request fullscreen when component mounts and user is logged in
      if (currentUser && !isFullscreen) {
        // requestFullscreen(); // Commented out for now to avoid immediate fullscreen on load if not desired
      }
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      };
    }
  }, [currentUser, isFullscreen, requestFullscreen]);


  const handleLogout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geoneraUser');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error("Error exiting fullscreen during logout:", err));
      }
    }
    setCurrentUser(null);
    setPredictionLogs([]);
    setSelectedPredictionLog(null);
    setLatestNotification(null);
    // router.replace('/login'); // Redirection handled by useEffect
  }, []); // Removed router from dependencies

  const handlePipsTargetChange = useCallback((newPipsTarget: PipsTargetRange) => {
    setPipsTarget(newPipsTarget);
  }, []);

  const handleSelectedCurrencyPairsChange = useCallback((newPairs: CurrencyPair[]) => {
    setSelectedCurrencyPairs(newPairs);
  }, []);

  const handlePredictionSelect = useCallback((log: PredictionLogItem) => {
    setSelectedPredictionLog(log);
  }, []);

  const generateNewPredictions = useCallback(async () => {
    if (isFetchingRef.current || !currentUser || selectedCurrencyPairs.length === 0) {
      return;
    }
    if (pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max) {
      setLatestNotification({
        title: "Parameter Error",
        description: `Invalid PIPS target range (${pipsTarget.min}-${pipsTarget.max}). Min/Max must be positive, Min <= Max.`,
        variant: "destructive",
        timestamp: new Date(),
      });
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);

    const newPredictionsPromises = selectedCurrencyPairs.map(async (pair) => {
      const numPredictionsToGenerate = Math.floor(Math.random() * 10) + 1;
      const predictionsForPair: PredictionLogItem[] = [];

      for (let i = 0; i < numPredictionsToGenerate; i++) {
        const newPredictionId = uuidv4();
        const timestamp = new Date();
        const randomExpirationSeconds = Math.floor(Math.random() * (MAX_EXPIRATION_SECONDS - MIN_EXPIRATION_SECONDS + 1)) + MIN_EXPIRATION_SECONDS;
        const expiresAt = addSeconds(timestamp, randomExpirationSeconds);

        const pendingLogItem: PredictionLogItem = {
          id: newPredictionId,
          timestamp,
          currencyPair: pair,
          pipsTarget,
          status: "PENDING",
          expiresAt,
        };
        predictionsForPair.push(pendingLogItem);
      }
      return predictionsForPair;
    });

    try {
      const resultsArray = await Promise.all(newPredictionsPromises);
      const newPendingLogs = resultsArray.flat();

      if (newPendingLogs.length > 0) {
        setPredictionLogs(prevLogs => {
          const updatedLogs = [...prevLogs, ...newPendingLogs];
          updatedLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return updatedLogs.slice(Math.max(0, updatedLogs.length - MAX_PREDICTION_LOGS));
        });
      }

      for (const pendingLog of newPendingLogs) {
        const { data, error } = await getPipsPredictionAction(pendingLog.currencyPair, pendingLog.pipsTarget);
        setPredictionLogs(prevLogs => produce(prevLogs, draftLogs => {
          const logIndex = draftLogs.findIndex(log => log.id === pendingLog.id);
          if (logIndex !== -1) {
            if (error) {
              draftLogs[logIndex].status = "ERROR";
              draftLogs[logIndex].error = error;
            } else if (data) {
              draftLogs[logIndex].status = "SUCCESS";
              draftLogs[logIndex].predictionOutcome = data;
            }
          }
        }));
      }

      if (newPendingLogs.length > 0) {
        const latestPairGenerated = newPendingLogs[newPendingLogs.length - 1].currencyPair;
        setLatestNotification({
          title: "New Predictions Added",
          description: `${newPendingLogs.length} new prediction(s) generated, including for ${latestPairGenerated}.`,
          variant: "success",
          timestamp: new Date(),
        });
      }
    } catch (e) {
      console.error("Error generating predictions:", e);
      setLatestNotification({
        title: "Prediction Generation Error",
        description: "An unexpected error occurred while trying to generate new predictions.",
        variant: "destructive",
        timestamp: new Date(),
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [currentUser, selectedCurrencyPairs, pipsTarget]);

  useEffect(() => {
    if (!currentUser || !isClientReady || selectedCurrencyPairs.length === 0) {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }
    if (pipsTarget.min <= 0 || pipsTarget.max <= 0 || pipsTarget.min > pipsTarget.max) {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }

    generateNewPredictions();

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }
    intervalIdRef.current = setInterval(generateNewPredictions, PREDICTION_INTERVAL_MS);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [generateNewPredictions, currentUser, isClientReady, selectedCurrencyPairs, pipsTarget.min, pipsTarget.max]);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      let didAnyExpire = false;
      let selectedLogStillExists = false;

      setPredictionLogs(prevLogs => {
        const activeLogs = prevLogs.filter(log => {
          if (log.expiresAt && isAfter(now, new Date(log.expiresAt))) {
            didAnyExpire = true;
            return false; // Remove expired log
          }
          if (selectedPredictionLog && log.id === selectedPredictionLog.id) {
            selectedLogStillExists = true;
          }
          return true; // Keep active log
        });

        if (didAnyExpire) {
          setLatestNotification({ // Use a new object for notification
            title: "Predictions Expired",
            description: `${prevLogs.length - activeLogs.length} prediction(s) have expired and were removed.`,
            variant: "default",
            timestamp: new Date(),
          });

          // If the selected prediction expired, clear it
          if (selectedPredictionLog && !activeLogs.find(log => log.id === selectedPredictionLog.id)) {
            setSelectedPredictionLog(null);
          }
        }
        return activeLogs;
      });
    }, 1000);

    return () => clearInterval(cleanupInterval);
  }, [selectedPredictionLog]); // Removed setLatestNotification from dependencies to avoid re-triggering

  const handleSort = useCallback((key: SortableColumnKey) => {
    setSortConfig(prevConfig => {
      const direction = prevConfig && prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc';
      return { key, direction };
    });
  }, []);

  const sortedAndFilteredLogs = useMemo(() => {
    let logs = [...predictionLogs];

    if (filterStatus !== "ALL") {
      logs = logs.filter(log => log.status === filterStatus);
    }

    if (filterSignal !== "ALL") {
      logs = logs.filter(log => log.predictionOutcome?.tradingSignal === filterSignal);
    }

    if (sortConfig !== null) {
      logs.sort((a, b) => {
        let valA: string | number | Date = '';
        let valB: string | number | Date = '';

        switch (sortConfig.key) {
          case 'status':
            valA = a.status;
            valB = b.status;
            break;
          case 'timestamp':
            valA = new Date(a.timestamp);
            valB = new Date(b.timestamp);
            break;
          case 'currencyPair':
            valA = a.currencyPair;
            valB = b.currencyPair;
            break;
          case 'pipsTargetMin':
            valA = a.pipsTarget.min;
            valB = b.pipsTarget.min;
            break;
          case 'tradingSignal':
            valA = a.predictionOutcome?.tradingSignal || 'N/A';
            valB = b.predictionOutcome?.tradingSignal || 'N/A';
            break;
          case 'expiresAt':
            valA = a.expiresAt ? new Date(a.expiresAt) : new Date(0);
            valB = b.expiresAt ? new Date(b.expiresAt) : new Date(0);
            break;
          default:
            return 0;
        }

        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return logs;
  }, [predictionLogs, filterStatus, filterSignal, sortConfig]);

  useEffect(() => {
    if (sortedAndFilteredLogs.length > 0) {
      const currentSelectionStillValid = selectedPredictionLog && sortedAndFilteredLogs.find(log => log.id === selectedPredictionLog.id);
      if (!currentSelectionStillValid) {
        setSelectedPredictionLog(sortedAndFilteredLogs[0]);
      }
    } else {
      setSelectedPredictionLog(null);
    }
  }, [sortedAndFilteredLogs, selectedPredictionLog]);

  if (!isClientReady) { // Simplified loading state, redirection handled by separate effect
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" aria-live="polite" aria-busy="true">
        <div className="animate-pulse text-primary text-lg">Loading Geonera Platform...</div>
      </div>
    );
  }

  if (!currentUser) { // This case should ideally be handled by the redirection effect
     // but as a fallback or if redirection is pending:
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <div className="text-primary text-lg">Redirecting to login...</div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader user={currentUser} onLogout={handleLogout} />
      <main className="flex-grow container mx-auto px-1 py-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-1 h-[100px] md:h-[80px]">
          <div className="md:col-span-1">
            <PipsParameterForm
              selectedCurrencyPairs={selectedCurrencyPairs}
              pipsTarget={pipsTarget}
              onSelectedCurrencyPairsChange={handleSelectedCurrencyPairsChange}
              onPipsChange={handlePipsTargetChange}
              isLoading={isLoading}
            />
          </div>
          <div className="md:col-span-1">
            <PredictionFilterControls
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              filterSignal={filterSignal}
              onFilterSignalChange={setFilterSignal}
            />
          </div>
          <div className="md:col-span-1">
            <NotificationDisplay notification={latestNotification} className="h-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 flex-grow" style={{ height: 'calc(100vh - 120px - 50px - 1rem)' }}>
          <div className="md:col-span-2 overflow-hidden">
            <PredictionsTable
              predictions={sortedAndFilteredLogs}
              onRowClick={handlePredictionSelect}
              selectedPredictionId={selectedPredictionLog?.id}
              maxLogs={MAX_PREDICTION_LOGS}
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </div>
          <div className="md:col-span-1 overflow-hidden">
            <PredictionDetailsPanel selectedPrediction={selectedPredictionLog} />
          </div>
        </div>
      </main>
      <footer className="py-1 text-center text-xs text-muted-foreground border-t border-border">
        © {currentYear} Geonera. All predictions are based on mock data for demonstration purposes only and are not financial advice.
      </footer>
    </div>
  );
}
