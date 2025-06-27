import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Clock, Copy, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface TransferTestResult {
  success: boolean;
  realWorldReady: boolean;
  walletAddress: string;
  robinhoodCompatible: boolean;
  solscanVerified: boolean;
  currentBalance: number;
  transferInstructions: string;
  estimatedArrivalTime: string;
  networkFees: string;
  addressValidation: {
    isValid: boolean;
    format: string;
    length: number;
    checksumValid: boolean;
  };
  errors: string[];
  timestamp: string;
}

export function RobinhoodTransferTester() {
  const [testResult, setTestResult] = useState<TransferTestResult | null>(null);
  const [copied, setCopied] = useState(false);

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/wallet/test-robinhood-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1 })
      });
      if (!response.ok) throw new Error('Transfer test failed');
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error) => {
      console.error('Transfer test failed:', error);
    }
  });

  const copyAddress = () => {
    if (testResult?.walletAddress) {
      navigator.clipboard.writeText(testResult.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            Robinhood Transfer Validator
          </CardTitle>
          <CardDescription>
            Test real-world transfers from Robinhood to SniperX with 100% accuracy validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => testMutation.mutate()} 
            disabled={testMutation.isPending}
            className="w-full"
          >
            {testMutation.isPending ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Testing Transfer Compatibility...
              </>
            ) : (
              'Test Robinhood → SniperX Transfer'
            )}
          </Button>
        </CardContent>
      </Card>

      {testResult && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Alert className={testResult.realWorldReady ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
            <div className="flex items-center gap-2">
              {getStatusIcon(testResult.realWorldReady)}
              <AlertDescription className="font-semibold">
                {testResult.realWorldReady 
                  ? "✅ READY FOR REAL TRANSFERS - 100% Compatible with Robinhood"
                  : "❌ NOT READY - Transfer may fail with current configuration"
                }
              </AlertDescription>
            </div>
          </Alert>

          {/* Wallet Address */}
          <Card>
            <CardHeader>
              <CardTitle>Your SniperX Wallet Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                <code className="flex-1 text-sm font-mono">{testResult.walletAddress}</code>
                <Button size="sm" variant="outline" onClick={copyAddress}>
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a 
                    href={`https://solscan.io/account/${testResult.walletAddress}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Solscan
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Robinhood Compatible</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResult.robinhoodCompatible)}
                    <Badge variant={testResult.robinhoodCompatible ? "default" : "destructive"}>
                      {testResult.robinhoodCompatible ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Solscan Verified</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResult.solscanVerified)}
                    <Badge variant={testResult.solscanVerified ? "default" : "destructive"}>
                      {testResult.solscanVerified ? 'Verified' : 'Failed'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Address Format</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(testResult.addressValidation.isValid)}
                    <Badge variant={testResult.addressValidation.isValid ? "default" : "destructive"}>
                      {testResult.addressValidation.format}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span>Current Balance</span>
                  <Badge variant="outline">
                    {testResult.currentBalance} SOL
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Estimated Arrival Time:</span>
                <span>{testResult.estimatedArrivalTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Network Fees:</span>
                <span>{testResult.networkFees}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Address Length:</span>
                <span>{testResult.addressValidation.length} characters</span>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Instructions */}
          {testResult.realWorldReady && (
            <Card>
              <CardHeader>
                <CardTitle>Step-by-Step Transfer Instructions</CardTitle>
                <CardDescription>
                  Follow these exact steps to transfer SOL from Robinhood to your SniperX wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-lg overflow-auto">
                  {testResult.transferInstructions}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {testResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResult.errors.map((error, index) => (
                    <Alert key={index} className="border-red-500 bg-red-50">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Test performed: {new Date(testResult.timestamp).toLocaleString()}</div>
                <div>Address validation: {testResult.addressValidation.checksumValid ? 'Checksum valid' : 'Checksum invalid'}</div>
                <div>Format: {testResult.addressValidation.format}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}