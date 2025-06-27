import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

interface OptimizedQueryOptions {
  queryKey: string[];
  refetchInterval: number;
  enableBackgroundRefetch?: boolean;
  staleTime?: number;
  debounceMs?: number;
}

export const useOptimizedQuery = <T>({
  queryKey,
  refetchInterval,
  enableBackgroundRefetch = true,
  staleTime = 0,
  debounceMs = 50
}: OptimizedQueryOptions) => {
  const [optimizedData, setOptimizedData] = useState<T | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<string>('');

  const { data, isLoading, error } = useQuery<T>({
    queryKey,
    refetchInterval,
    refetchIntervalInBackground: enableBackgroundRefetch,
    staleTime,
    notifyOnChangeProps: ['data', 'error'],
  });

  const scheduleUpdate = useCallback((newData: T) => {
    const dataString = JSON.stringify(newData);
    
    // Skip update if data hasn't actually changed
    if (dataString === lastUpdateRef.current) {
      return;
    }

    setIsUpdating(true);
    
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounced update to prevent rapid DOM thrashing
    updateTimeoutRef.current = setTimeout(() => {
      // Use requestAnimationFrame for smooth DOM updates
      requestAnimationFrame(() => {
        setOptimizedData(newData);
        setIsUpdating(false);
        lastUpdateRef.current = dataString;
      });
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    if (data) {
      scheduleUpdate(data);
    }
  }, [data, scheduleUpdate]);

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    data: optimizedData || data,
    isLoading: isLoading && !optimizedData,
    isUpdating,
    error,
    hasData: !!optimizedData || !!data
  };
};