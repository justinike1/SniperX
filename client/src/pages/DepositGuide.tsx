import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DepositGuide() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const walletAddress = "7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv";

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast({
      title: "Wallet address copied!",
      description: "You can now paste it in your wallet app",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <Card className="border-2 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Add SOL to Enable Trading
          </CardTitle>
          <CardDescription className="text-lg">
            Fund your SniperX wallet to start 24/7 autonomous trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-200">
              Your trading bot is active and waiting for funds. Once you deposit SOL, it will automatically start trading!
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Your SniperX Wallet Address:</h3>
            <div className="flex items-center gap-2 p-4 bg-gray-900 rounded-lg border border-gray-700">
              <code className="flex-1 text-sm text-green-400 break-all font-mono">
                {walletAddress}
              </code>
              <Button
                onClick={copyAddress}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">How to Deposit SOL:</h3>
            <div className="space-y-3">
              <div className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                <span className="text-2xl font-bold text-purple-500">1</span>
                <div>
                  <p className="font-semibold">Open your Solana wallet</p>
                  <p className="text-sm text-gray-400">Use Phantom, Solflare, or any Solana wallet</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                <span className="text-2xl font-bold text-purple-500">2</span>
                <div>
                  <p className="font-semibold">Click Send or Transfer</p>
                  <p className="text-sm text-gray-400">Select SOL as the token to send</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                <span className="text-2xl font-bold text-purple-500">3</span>
                <div>
                  <p className="font-semibold">Paste the wallet address above</p>
                  <p className="text-sm text-gray-400">Double-check the address matches exactly</p>
                </div>
              </div>
              
              <div className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                <span className="text-2xl font-bold text-purple-500">4</span>
                <div>
                  <p className="font-semibold">Enter amount and send</p>
                  <p className="text-sm text-gray-400">Recommended: Start with 0.5 - 1 SOL for testing</p>
                </div>
              </div>
            </div>
          </div>

          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription>
              <strong>Recommended Amounts:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Minimum: 0.1 SOL (for testing)</li>
                <li>• Suggested: 0.5 - 1 SOL (for active trading)</li>
                <li>• Keep 0.05 SOL as fee reserve</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Need SOL?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => window.open("https://www.coinbase.com", "_blank")}
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-semibold">Coinbase</p>
                  <p className="text-sm text-gray-400">Buy SOL with card/bank</p>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => window.open("https://www.binance.com", "_blank")}
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-semibold">Binance</p>
                  <p className="text-sm text-gray-400">Global exchange</p>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => window.open("https://phantom.app", "_blank")}
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-semibold">Phantom Wallet</p>
                  <p className="text-sm text-gray-400">Popular Solana wallet</p>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => window.open("https://jupiter.exchange", "_blank")}
              >
                <ExternalLink className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <p className="font-semibold">Jupiter Exchange</p>
                  <p className="text-sm text-gray-400">Swap other tokens to SOL</p>
                </div>
              </Button>
            </div>
          </div>

          <Alert className="border-blue-500/50 bg-blue-500/10">
            <AlertDescription>
              <strong>After Depositing:</strong> The bot will automatically detect your balance and start trading within 10-30 seconds. You'll receive a Telegram notification when trading begins!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}