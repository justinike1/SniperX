import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LiveTradingPanel() {
  const [buyToken, setBuyToken] = useState("");
  const [buyAmount, setBuyAmount] = useState("0.01");
  const [sellToken, setSellToken] = useState("");
  const [sellAmount, setSellAmount] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  const [lastTrade, setLastTrade] = useState<any>(null);
  const { toast } = useToast();

  const executeBuy = async () => {
    if (!buyToken || !buyAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter token address and amount",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenMint: buyToken,
          amount: parseFloat(buyAmount)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLastTrade({
          type: "BUY",
          token: data.tokenSymbol || buyToken.slice(0, 8),
          amount: buyAmount,
          txHash: data.txHash,
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: "Buy Order Executed!",
          description: `Bought ${data.tokenAmount || "tokens"} for ${buyAmount} SOL`,
        });
        
        setBuyToken("");
        setBuyAmount("0.01");
      } else {
        toast({
          title: "Trade Failed",
          description: data.message || "Failed to execute buy order",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to trading engine",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeSell = async () => {
    if (!sellToken || !sellAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter token address and amount",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenMint: sellToken,
          amount: parseFloat(sellAmount)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setLastTrade({
          type: "SELL",
          token: data.tokenSymbol || sellToken.slice(0, 8),
          amount: sellAmount,
          solReceived: data.solReceived,
          txHash: data.txHash,
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: "Sell Order Executed!",
          description: `Sold ${sellAmount} tokens for ${data.solReceived || "SOL"}`,
        });
        
        setSellToken("");
        setSellAmount("100");
      } else {
        toast({
          title: "Trade Failed",
          description: data.message || "Failed to execute sell order",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to trading engine",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeQuickBuy = async (tokenAddress: string, tokenName: string) => {
    setBuyToken(tokenAddress);
    toast({
      title: "Token Selected",
      description: `Ready to buy ${tokenName}`,
    });
  };

  return (
    <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-gray-900/95 to-black/95">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Live Trading Terminal
        </CardTitle>
        <CardDescription>
          Execute real trades on Solana - Connected to Jupiter DEX
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lastTrade && (
          <Alert className="mb-4 border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Last Trade: {lastTrade.type} {lastTrade.amount} {lastTrade.token}
              {lastTrade.txHash && (
                <a 
                  href={`https://solscan.io/tx/${lastTrade.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-blue-400 hover:underline"
                >
                  View TX
                </a>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-500/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-500/20">
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="buyToken">Token Address</Label>
              <Input
                id="buyToken"
                placeholder="Enter token mint address"
                value={buyToken}
                onChange={(e) => setBuyToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="buyAmount">Amount (SOL)</Label>
              <Input
                id="buyAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.01"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBuyAmount("0.01")}
              >
                0.01 SOL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBuyAmount("0.05")}
              >
                0.05 SOL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBuyAmount("0.1")}
              >
                0.1 SOL
              </Button>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              onClick={executeBuy}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Execute Buy Order
                </>
              )}
            </Button>

            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">Quick Buy Popular Tokens:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeQuickBuy("So11111111111111111111111111111111111111112", "WSOL")}
                >
                  WSOL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeQuickBuy("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "BONK")}
                >
                  BONK
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeQuickBuy("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", "JUP")}
                >
                  JUP
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeQuickBuy("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "USDC")}
                >
                  USDC
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sellToken">Token Address</Label>
              <Input
                id="sellToken"
                placeholder="Enter token mint address"
                value={sellToken}
                onChange={(e) => setSellToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sellAmount">Amount (Tokens)</Label>
              <Input
                id="sellAmount"
                type="number"
                step="1"
                min="1"
                placeholder="100"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSellAmount("100")}
              >
                100
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSellAmount("1000")}
              >
                1,000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSellAmount("10000")}
              >
                10,000
              </Button>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              onClick={executeSell}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Execute Sell Order
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <Alert className="mt-4 border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-xs">
            <strong>Live Trading Active:</strong> All trades execute real transactions on Solana mainnet. 
            Ensure you have SOL in your wallet for gas fees. Minimum 0.003 SOL required per trade.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}