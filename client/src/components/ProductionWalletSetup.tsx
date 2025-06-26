import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, CheckCircle, ArrowRight, DollarSign } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ProductionWalletSetupProps {
  userId: number;
  onWalletCreated: (walletData: any) => void;
}

export function ProductionWalletSetup({ userId, onWalletCreated }: ProductionWalletSetupProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleCreateProductionWallet = async () => {
    setError('');
    
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiRequest('POST', '/api/wallet/create-production', {
        userId,
        password
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Production Wallet Created",
          description: "Your secure wallet is ready for real transfers from Robinhood and other platforms",
        });
        onWalletCreated(data.wallet);
      } else {
        setError(data.message || 'Failed to create production wallet');
      }
    } catch (error) {
      console.error('Production wallet creation error:', error);
      setError('Failed to create secure wallet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="border-2 border-green-500/20 bg-gradient-to-br from-green-950/50 to-emerald-950/30">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <Shield className="h-8 w-8 text-green-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-green-400">
          Create Production Wallet
        </CardTitle>
        <CardDescription className="text-green-200">
          Set up your secure wallet for real transfers from Robinhood, Coinbase, and other platforms
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Security Features */}
        <div className="grid gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <Lock className="h-5 w-5 text-green-400" />
            <div>
              <p className="font-medium text-green-200">Bank-Grade Encryption</p>
              <p className="text-sm text-green-300/70">Your private keys are encrypted with AES-256</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div>
              <p className="font-medium text-green-200">Real Solana Blockchain</p>
              <p className="text-sm text-green-300/70">Connected to live mainnet for actual transfers</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <DollarSign className="h-5 w-5 text-green-400" />
            <div>
              <p className="font-medium text-green-200">Ready for Real Money</p>
              <p className="text-sm text-green-300/70">Receive transfers from any crypto platform</p>
            </div>
          </div>
        </div>

        {/* Password Setup */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-green-200 mb-2 block">
              Secure Password
            </label>
            <Input
              type="password"
              placeholder="Enter secure password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-green-950/30 border-green-500/30 text-green-100 placeholder:text-green-400/50"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-green-200 mb-2 block">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-green-950/30 border-green-500/30 text-green-100 placeholder:text-green-400/50"
            />
          </div>
        </div>

        {error && (
          <Alert className="border-red-500/20 bg-red-950/30">
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleCreateProductionWallet}
          disabled={isCreating || !password || !confirmPassword}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Creating Secure Wallet...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              Create Production Wallet
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-green-300/60">
            Your password encrypts your private keys and cannot be recovered. Store it safely.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}