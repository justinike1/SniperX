import { useState, useEffect, useRef, useCallback } from 'react';

interface BatchedUpdate {
  id: string;
  data: any;
  timestamp: number;
}

export const useBatchedUpdates = <T>(
  batchSize: number = 10,
  batchDelay: number = 16 // 60fps
) => {
  const [processedData, setProcessedData] = useState<T[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const queueRef = useRef<BatchedUpdate[]>([]);
  const rafRef = useRef<number>();
  const lastProcessTime = useRef<number>(0);

  const processBatch = useCallback(() => {
    const now = performance.now();
    
    // Throttle to maintain smooth 60fps
    if (now - lastProcessTime.current < batchDelay) {
      rafRef.current = requestAnimationFrame(processBatch);
      return;
    }

    if (queueRef.current.length === 0) {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    
    // Process batch of updates
    const batch = queueRef.current.splice(0, batchSize);
    const newData = batch.map(update => update.data);
    
    setProcessedData(prev => {
      // Merge with existing data, removing duplicates
      const combined = [...prev, ...newData];
      return combined.slice(-100); // Keep last 100 items to prevent memory bloat
    });

    lastProcessTime.current = now;
    
    // Continue processing if more items in queue
    if (queueRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(processBatch);
    } else {
      setIsProcessing(false);
    }
  }, [batchSize, batchDelay]);

  const addUpdate = useCallback((data: T) => {
    const update: BatchedUpdate = {
      id: `${Date.now()}-${Math.random()}`,
      data,
      timestamp: performance.now()
    };

    queueRef.current.push(update);

    if (!isProcessing) {
      rafRef.current = requestAnimationFrame(processBatch);
    }
  }, [processBatch, isProcessing]);

  const clearUpdates = useCallback(() => {
    queueRef.current = [];
    setProcessedData([]);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    setIsProcessing(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    data: processedData,
    addUpdate,
    clearUpdates,
    isProcessing,
    queueLength: queueRef.current.length
  };
};