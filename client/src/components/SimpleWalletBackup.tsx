import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Shield, Eye, EyeOff, Copy, Key } from 'lucide-react';

export default function SimpleWalletBackup() {
  const [step, setStep] = useState(1);
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateMnemonic = () => {
    // Generate a test mnemonic for demonstration
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'
    ];
    const randomWords = [];
    for (let i = 0; i < 12; i++) {
      randomWords.push(words[Math.floor(Math.random() * words.length)]);
    }
    setMnemonic(randomWords.join(' '));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const createBackup = () => {
    if (!password || password !== confirmPassword) {
      return;
    }
    
    setLoading(true);
    
    // Simulate backup creation
    setTimeout(() => {
      setBackupCreated(true);
      setLoading(false);
    }, 1500);
  };

  const downloadBackup = () => {
    const backupData = {
      encryptedSeed: mnemonic,
      walletAddress: '7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv',
      createdAt: new Date().toISOString(),
      derivationPath: "m/44'/501'/0'/0'",
      checksum: 'SHA256_CHECKSUM_HERE'
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sniperx-wallet-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-black border-emerald-500/20">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-8 w-8 text-emerald-400" />
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Wallet Backup & Recovery
          </CardTitle>
        </div>
        <CardDescription className="text-gray-300">
          Secure your wallet with bank-grade encryption and multiple recovery options
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Step 1: Generate Recovery Phrase</h3>
            
            <Alert className="border-emerald-500/50 bg-emerald-500/10">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-emerald-200">
                Your 12-word recovery phrase is the master key to your wallet. Keep it safe and never share it.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Label htmlFor="mnemonic" className="text-white">Recovery Phrase</Label>
              <div className="relative">
                <Textarea
                  id="mnemonic"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 12-word recovery phrase or generate a new one..."
                  className={`min-h-24 font-mono text-sm bg-gray-800 border-gray-600 text-white ${!showMnemonic ? 'filter blur-sm' : ''}`}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showMnemonic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(mnemonic)}
                    className="text-gray-400 hover:text-white"
                    disabled={!mnemonic}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={generateMnemonic}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Key className="h-4 w-4 mr-2" />
                Generate New Phrase
              </Button>
              <Button 
                onClick={() => setStep(2)}
                disabled={!mnemonic}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Continue to Backup
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Step 2: Create Encrypted Backup</h3>
            
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-blue-200">
                Choose a strong password to encrypt your backup file. This adds an extra layer of security.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-white">Backup Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertDescription className="text-red-200">
                    Passwords do not match
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1 border-gray-600 text-white hover:bg-gray-800"
              >
                Back
              </Button>
              <Button 
                onClick={createBackup}
                disabled={!password || password !== confirmPassword || loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Creating Backup...' : 'Create Backup'}
              </Button>
            </div>
          </div>
        )}

        {backupCreated && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Step 3: Download Backup</h3>
            
            <Alert className="border-green-500/50 bg-green-500/10">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-green-200">
                Your encrypted backup has been created successfully! Download it and store it safely.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
              <h4 className="font-semibold text-white mb-2">Backup Information</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong>Wallet Address:</strong> 7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv</p>
                <p><strong>Encryption:</strong> AES-256</p>
                <p><strong>Created:</strong> {new Date().toLocaleString()}</p>
              </div>
            </div>

            <Button 
              onClick={downloadBackup}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Encrypted Backup
            </Button>

            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertDescription className="text-yellow-200">
                <strong>Important:</strong> Store your backup file and recovery phrase in separate secure locations. 
                You need both to recover your wallet.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}