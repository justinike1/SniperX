import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, RefreshCw, Shield, AlertTriangle, CheckCircle, Key, Lock, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface RecoveryWizardProps {
  onComplete: (walletData: any) => void;
  onCancel: () => void;
}

export const WalletRecoveryWizard: React.FC<RecoveryWizardProps> = ({ onComplete, onCancel }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [recoveryMethod, setRecoveryMethod] = useState<'phrase' | 'file' | null>(null);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [phraseWords, setPhraseWords] = useState<string[]>(new Array(12).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [recoveredWallet, setRecoveredWallet] = useState<any>(null);
  const [backupFile, setBackupFile] = useState<File | null>(null);

  const totalSteps = 4;

  const handlePhraseWordChange = (index: number, value: string) => {
    const newWords = [...phraseWords];
    newWords[index] = value.toLowerCase().trim();
    setPhraseWords(newWords);
    setRecoveryPhrase(newWords.join(' ').trim());
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setBackupFile(file);
        toast({
          title: "File Selected",
          description: `Selected backup file: ${file.name}`
        });
      } else {
        toast({
          title: "Invalid File",
          description: "Please select a valid JSON backup file",
          variant: "destructive"
        });
      }
    }
  };

  const validateRecoveryPhrase = (phrase: string): boolean => {
    const words = phrase.trim().split(/\s+/);
    return words.length === 12 && words.every(word => word.length > 0);
  };

  const recoverFromPhrase = async () => {
    try {
      setIsLoading(true);
      
      if (!validateRecoveryPhrase(recoveryPhrase)) {
        throw new Error('Invalid recovery phrase. Please ensure you have 12 words.');
      }

      const response = await fetch('/api/wallet/recover/phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mnemonic: recoveryPhrase })
      });

      if (!response.ok) throw new Error('Failed to recover wallet');

      const data = await response.json();
      if (data.success) {
        setRecoveredWallet(data.wallet);
        setCurrentStep(3);
        toast({
          title: "Recovery Successful",
          description: "Your wallet has been recovered from the recovery phrase"
        });
      }
    } catch (error) {
      toast({
        title: "Recovery Failed",
        description: (error as Error).message || "Unable to recover wallet. Please check your recovery phrase.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recoverFromFile = async () => {
    try {
      setIsLoading(true);
      
      if (!backupFile) {
        throw new Error('Please select a backup file');
      }

      const fileContent = await backupFile.text();
      const backupData = JSON.parse(fileContent);

      if (!backupData.mnemonic) {
        throw new Error('Invalid backup file format');
      }

      const response = await fetch('/api/wallet/recover/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData)
      });

      if (!response.ok) throw new Error('Failed to recover wallet');

      const data = await response.json();
      if (data.success) {
        setRecoveredWallet(data.wallet);
        setCurrentStep(3);
        toast({
          title: "Recovery Successful",
          description: "Your wallet has been recovered from the backup file"
        });
      }
    } catch (error) {
      toast({
        title: "Recovery Failed",
        description: (error as Error).message || "Unable to recover wallet from backup file.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeRecovery = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/wallet/recover/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletData: recoveredWallet })
      });

      if (!response.ok) throw new Error('Failed to finalize recovery');

      const data = await response.json();
      if (data.success) {
        onComplete(recoveredWallet);
        toast({
          title: "Wallet Restored",
          description: "Your wallet has been successfully restored and is ready to use"
        });
      }
    } catch (error) {
      toast({
        title: "Finalization Failed",
        description: "Unable to finalize wallet recovery. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return recoveryMethod !== null;
      case 2:
        if (recoveryMethod === 'phrase') {
          return validateRecoveryPhrase(recoveryPhrase);
        } else if (recoveryMethod === 'file') {
          return backupFile !== null;
        }
        return false;
      case 3:
        return recoveredWallet !== null;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep === 2) {
      if (recoveryMethod === 'phrase') {
        recoverFromPhrase();
      } else if (recoveryMethod === 'file') {
        recoverFromFile();
      }
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      finalizeRecovery();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <RefreshCw className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Wallet Recovery</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Choose how you'd like to recover your wallet. Both methods are secure and will restore full access to your funds.
              </p>
            </div>

            <div className="space-y-4">
              <Card 
                className={`cursor-pointer transition-all ${
                  recoveryMethod === 'phrase' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-400'
                }`}
                onClick={() => setRecoveryMethod('phrase')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Key className="h-8 w-8 text-blue-500" />
                    <div>
                      <h4 className="font-semibold">Recovery Phrase</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Enter your 12-word recovery phrase (seed phrase)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${
                  recoveryMethod === 'file' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-400'
                }`}
                onClick={() => setRecoveryMethod('file')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Upload className="h-8 w-8 text-green-500" />
                    <div>
                      <h4 className="font-semibold">Backup File</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Upload your downloaded wallet backup JSON file
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> Your recovery information is processed locally and never stored on our servers.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 2:
        if (recoveryMethod === 'phrase') {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <Key className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Enter Recovery Phrase</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Enter your 12-word recovery phrase in the correct order.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="phrase-textarea">Recovery Phrase (12 words)</Label>
                  <Textarea
                    id="phrase-textarea"
                    placeholder="Enter your 12-word recovery phrase separated by spaces..."
                    value={recoveryPhrase}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase();
                      setRecoveryPhrase(value);
                      const words = value.split(/\s+/).slice(0, 12);
                      const paddedWords = [...words, ...new Array(12 - words.length).fill('')];
                      setPhraseWords(paddedWords);
                    }}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {phraseWords.map((word, index) => (
                    <div key={index}>
                      <Label htmlFor={`word-${index}`} className="text-xs">
                        Word {index + 1}
                      </Label>
                      <Input
                        id={`word-${index}`}
                        type="text"
                        placeholder={`Word ${index + 1}`}
                        value={word}
                        onChange={(e) => handlePhraseWordChange(index, e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Make sure all 12 words are spelled correctly and in the right order. Check for any extra spaces or typos.
                </AlertDescription>
              </Alert>
            </div>
          );
        } else if (recoveryMethod === 'file') {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <Upload className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Upload Backup File</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Select your wallet backup JSON file that you downloaded during the backup process.
                </p>
              </div>

              <div className="border-dashed border-2 border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="backup-file"
                />
                <label htmlFor="backup-file" className="cursor-pointer">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {backupFile ? backupFile.name : 'Choose backup file'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Click to select your JSON backup file
                  </p>
                </label>
              </div>

              {backupFile && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    File selected: {backupFile.name} ({(backupFile.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        }
        return null;

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Recovery Successful!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your wallet has been successfully recovered. Review the details below.
              </p>
            </div>

            {recoveredWallet && (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4">Recovered Wallet Details</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Wallet Address</Label>
                      <p className="font-mono text-sm break-all bg-white dark:bg-gray-800 p-2 rounded border">
                        {recoveredWallet.address}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Public Key</Label>
                      <p className="font-mono text-sm break-all bg-white dark:bg-gray-800 p-2 rounded border">
                        {recoveredWallet.publicKey}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Current Balance</Label>
                      <p className="text-lg font-semibold">
                        {recoveredWallet.balance || 0} SOL
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Click "Continue" to finalize the recovery and start using your restored wallet.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Lock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Wallet Recovery Complete</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your wallet has been fully restored and is ready for trading.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What's Next?</h4>
              <ul className="space-y-1 text-sm">
                <li>• Your wallet is now active and ready for transactions</li>
                <li>• All your previous funds and history are restored</li>
                <li>• You can start trading immediately</li>
                <li>• Consider creating a new backup for extra security</li>
              </ul>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Recovery Complete:</strong> Your wallet has been successfully restored. 
                Welcome back to SniperX!
              </AlertDescription>
            </Alert>
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
            <RefreshCw className="h-5 w-5" />
            Wallet Recovery Wizard
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
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {currentStep === 2 ? 'Recovering wallet...' : 'Processing...'}
            </p>
          </div>
        ) : (
          renderStepContent()
        )}
      </CardContent>

      <div className="flex justify-between p-6 border-t">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : () => setCurrentStep(currentStep - 1)}
          disabled={isLoading}
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        <Button
          onClick={nextStep}
          disabled={!canProceedToNext() || isLoading}
        >
          {currentStep === 4 ? 'Finish' : currentStep === 2 ? 'Recover' : 'Continue'}
        </Button>
      </div>
    </Card>
  );
};