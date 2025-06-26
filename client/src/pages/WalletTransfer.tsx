import React from 'react';
import { WalletConnector } from '@/components/WalletConnector';

export default function WalletTransfer() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4">Lightning-Fast Wallet Transfers</h1>
            <p className="text-xl text-muted-foreground">
              Transfer crypto from any wallet or exchange in seconds
            </p>
          </div>
          
          <WalletConnector />
        </div>
      </div>
    </div>
  );
}