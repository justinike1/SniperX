import { useState } from 'react';
import { CheckCircle, XCircle, Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ExchangeCompatibilityResult {
  isValid: boolean;
  exchange: string;
  reason?: string;
}

interface CompatibilityReport {
  overallValid: boolean;
  compatibleExchanges: string[];
  incompatibleExchanges: Array<{
    exchange: string;
    reason: string;
  }>;
}

interface AddressValidationProps {
  address: string;
  showFullReport?: boolean;
}

export const ExchangeCompatibilityDisplay = ({ address, showFullReport = false }: AddressValidationProps) => {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);

  // Fetch compatibility report for the address
  const { data: compatibilityData, isLoading, refetch } = useQuery({
    queryKey: [`/api/wallet/compatibility-test/${address}`],
    enabled: !!address && address.length === 44,
    staleTime: 300000, // 5 minutes
  });

  const validateAddress = async () => {
    setIsValidating(true);
    try {
      await refetch();
      toast({
        title: "Validation Complete",
        description: "Address compatibility checked across all major exchanges",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Unable to validate address compatibility",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  if (!address || address.length !== 44) {
    return (
      <Card className="border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Invalid address format for compatibility check</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Validating exchange compatibility...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const report = compatibilityData as CompatibilityReport & {
    summary: {
      total: number;
      compatible: number;
      incompatible: number;
    };
  };

  if (!report) {
    return (
      <Card>
        <CardContent className="p-4">
          <Button 
            onClick={validateAddress}
            disabled={isValidating}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isValidating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Check Exchange Compatibility
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${report.overallValid ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Exchange Compatibility</span>
          <Badge variant={report.overallValid ? "default" : "destructive"}>
            {report.summary?.compatible || 0}/{report.summary?.total || 0} Compatible
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Status */}
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          report.overallValid 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {report.overallValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {report.overallValid 
              ? 'Address works with all major exchanges' 
              : 'Address has compatibility issues'
            }
          </span>
        </div>

        {/* Compatible Exchanges */}
        {report.compatibleExchanges && report.compatibleExchanges.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
              ✓ Compatible Exchanges
            </h4>
            <div className="flex flex-wrap gap-1">
              {report.compatibleExchanges.map((exchange) => (
                <Badge key={exchange} variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  {exchange}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Incompatible Exchanges */}
        {report.incompatibleExchanges && report.incompatibleExchanges.length > 0 && showFullReport && (
          <div>
            <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
              ✗ Compatibility Issues
            </h4>
            <div className="space-y-1">
              {report.incompatibleExchanges.map((item, index) => (
                <div key={index} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  <span className="font-medium">{item.exchange}:</span> {item.reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={validateAddress}
            disabled={isValidating}
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
          >
            {isValidating ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Recheck
          </Button>
          
          {!report.overallValid && (
            <Button 
              onClick={() => window.location.reload()}
              size="sm"
              className="flex-1 text-xs"
            >
              Generate New Address
            </Button>
          )}
        </div>

        {/* Robinhood Transfer Notice */}
        {report.compatibleExchanges?.includes('Robinhood') && (
          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            ✓ Robinhood transfers supported - address format verified compatible
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExchangeCompatibilityDisplay;