import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface SmoothUpdaterProps {
  queryKey: string[];
  refetchInterval: number;
  children: (data: any, isLoading: boolean) => React.ReactNode;
}

export const SmoothUpdater = ({ queryKey, refetchInterval, children }: SmoothUpdaterProps) => {
  const [displayData, setDisplayData] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  const { data, isLoading } = useQuery({
    queryKey,
    refetchInterval,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (data && JSON.stringify(data) !== JSON.stringify(displayData)) {
      setIsTransitioning(true);
      
      // Clear existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      // Smooth transition with debouncing
      transitionTimeoutRef.current = setTimeout(() => {
        setDisplayData(data);
        setIsTransitioning(false);
      }, 100); // 100ms debounce
    }
  }, [data, displayData]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-95' : 'opacity-100'}`}
      style={{ minHeight: '1px' }} // Prevent layout shift
    >
      {children(displayData || data, isLoading)}
    </div>
  );
};