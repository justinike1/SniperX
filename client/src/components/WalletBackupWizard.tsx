import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Eye, EyeOff, Shield, AlertTriangle, CheckCircle, FileText, Key, Lock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface WalletBackupData {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
  address: string;
  timestamp: string;
}

interface BackupWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const WalletBackupWizard: React.FC<BackupWizardProps> = ({ onComplete, onCancel }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [backupData, setBackupData] = useState<WalletBackupData | null>(null);
  const [showPrivateData, setShowPrivateData] = useState(false);
  const [verificationWords, setVerificationWords] = useState<{index: number, word: string}[]>([]);
  const [userInputWords, setUserInputWords] = useState<string[]>([]);
  const [securityConfirmations, setSecurityConfirmations] = useState({
    understand: false,
    stored: false,
    responsible: false,
    noScreenshot: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 5;

  useEffect(() => {
    if (currentStep === 1) {
      generateBackupData();
    }
  }, []);

  const generateBackupData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/wallet/backup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to generate backup');
      
      const data = await response.json();
      if (data.success) {
        setBackupData(data.backup);
        // Select random words for verification
        const words = data.backup.mnemonic.split(' ');
        const randomIndices = [2, 5, 8].sort(() => Math.random() - 0.5);
        setVerificationWords(randomIndices.map(i => ({ index: i, word: words[i] })));
        setUserInputWords(new Array(3).fill(''));
      }
    } catch (error) {
      toast({
        title: "Backup Generation Failed",
        description: "Unable to generate wallet backup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please manually select and copy the text",
        variant: "destructive"
      });
    }
  };

  const downloadBackup = () => {
    if (!backupData) return;
    
    const backupContent = {
      mnemonic: backupData.mnemonic,
      address: backupData.address,
      timestamp: backupData.timestamp,
      warning: "KEEP THIS FILE SECURE - NEVER SHARE WITH ANYONE"
    };
    
    const blob = new Blob([JSON.stringify(backupContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sniperx-wallet-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Backup Downloaded",
      description: "Wallet backup file saved successfully"
    });
  };

  const handleVerificationInput = (index: number, value: string) => {
    const newInputs = [...userInputWords];
    newInputs[index] = value.toLowerCase().trim();
    setUserInputWords(newInputs);
  };

  const verifyBackup = () => {
    const isValid = verificationWords.every((wordObj, index) => 
      wordObj.word.toLowerCase() === userInputWords[index].toLowerCase()
    );
    
    if (isValid) {
      setCurrentStep(4);
      toast({
        title: "Verification Successful",
        description: "Your backup has been verified correctly"
      });
    } else {
      toast({
        title: "Verification Failed",
        description: "Please check your words and try again",
        variant: "destructive"
      });
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 2:
        return Object.values(securityConfirmations).every(Boolean);
      case 3:
        return userInputWords.every(word => word.length > 0);
      case 4:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Wallet Backup Overview</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your wallet backup contains sensitive information that allows complete access to your funds.
                We'll guide you through creating a secure backup step by step.
              </p>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Never share your backup with anyone. SniperX will never ask for your backup information.
              </AlertDescription>
            </Alert>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What you'll backup:</h4>
              <ul className="space-y-1 text-sm">
                <li>• 12-word recovery phrase (seed phrase)</li>
                <li>• Wallet address</li>
                <li>• Backup timestamp</li>
              </ul>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Key className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Your Recovery Phrase</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Write down these 12 words in order. This is your master key to your wallet.
              </p>
            </div>

            {backupData && (
              <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Recovery Phrase</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPrivateData(!showPrivateData)}
                      >
                        {showPrivateData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(backupData.mnemonic, 'Recovery phrase')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {backupData.mnemonic.split(' ').map((word, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border"
                      >
                        <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                        <span className="font-mono">
                          {showPrivateData ? word : '•••••'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <h4 className="font-semibold">Security Checklist</h4>
              {Object.entries({
                understand: "I understand this phrase gives full access to my wallet",
                stored: "I have written this phrase down in a secure location",
                responsible: "I am responsible for keeping this phrase safe",
                noScreenshot: "I will not take screenshots or store digitally"
              }).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={securityConfirmations[key as keyof typeof securityConfirmations]}
                    onCheckedChange={(checked) =>
                      setSecurityConfirmations(prev => ({ ...prev, [key]: checked as boolean }))
                    }
                  />
                  <Label htmlFor={key} className="text-sm">{label}</Label>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadBackup} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Backup
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Verify Your Backup</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Enter the requested words from your recovery phrase to verify you've stored it correctly.
              </p>
            </div>

            <div className="space-y-4">
              {verificationWords.map((wordObj, index) => (
                <div key={index}>
                  <Label htmlFor={`word-${index}`}>
                    Word #{wordObj.index + 1}
                  </Label>
                  <Input
                    id={`word-${index}`}
                    type="text"
                    placeholder="Enter the word"
                    value={userInputWords[index]}
                    onChange={(e) => handleVerificationInput(index, e.target.value)}
                    className="mt-1"
                  />
                </div>
              ))}
            </div>

            <Button onClick={verifyBackup} disabled={!canProceedToNext()} className="w-full">
              Verify Backup
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Lock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Backup Security Tips</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Follow these best practices to keep your wallet safe.
              </p>
            </div>

            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Storage Recommendations:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Write on paper and store in a fireproof safe</li>
                    <li>• Consider a safety deposit box for large amounts</li>
                    <li>• Make multiple copies in different secure locations</li>
                    <li>• Never store in cloud services or photos</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security Warnings:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Anyone with your phrase can access your funds</li>
                    <li>• SniperX cannot recover lost phrases</li>
                    <li>• Beware of phishing attempts asking for your phrase</li>
                    <li>• Test recovery with small amounts first</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Backup Complete!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your wallet has been successfully backed up. Keep your recovery phrase safe!
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What's Next?</h4>
              <ul className="space-y-1 text-sm">
                <li>• Your wallet is now secured with a backup</li>
                <li>• You can recover your wallet anytime with your 12-word phrase</li>
                <li>• Consider testing recovery on a separate device</li>
                <li>• Start trading with confidence knowing your funds are secure</li>
              </ul>
            </div>

            {backupData && (
              <Card className="bg-gray-50 dark:bg-gray-800">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Backup Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Wallet Address:</span>
                      <p className="font-mono break-all">{backupData.address}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Backup Created:</span>
                      <p>{new Date(backupData.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Wallet Backup Wizard
          </CardTitle>
          <span className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <Progress value={(currentStep / totalSteps) * 100} className="mt-2" />
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Generating secure backup...</p>
          </div>
        ) : (
          renderStepContent()
        )}
      </CardContent>

      <div className="flex justify-between p-6 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : () => setCurrentStep(currentStep - 1)}
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        <Button
          onClick={nextStep}
          disabled={!canProceedToNext() || isLoading}
        >
          {currentStep === totalSteps ? 'Complete' : 'Next'}
        </Button>
      </div>
    </Card>
  );
};