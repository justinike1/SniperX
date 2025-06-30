import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Download, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Key,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BackupData {
  encryptedSeed: string;
  walletAddress: string;
  createdAt: string;
  derivationPath: string;
  checksum: string;
}

export default function WalletBackupWizard() {
  const [activeTab, setActiveTab] = useState('backup');
  const [currentStep, setCurrentStep] = useState(1);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  // Backup form state
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  
  // Recovery form state
  const [recoveryMnemonic, setRecoveryMnemonic] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryFile, setRecoveryFile] = useState<string>('');
  const [recoveredAddress, setRecoveredAddress] = useState('');

  const { toast } = useToast();

  // Generate new mnemonic phrase
  const generateMnemonic = useMutation({
    mutationFn: () => apiRequest('GET', '/api/wallet/generate-recovery-phrase'),
    onSuccess: (data) => {
      setMnemonic(data.mnemonic);
      toast({
        title: "Recovery Phrase Generated",
        description: "New 12-word recovery phrase created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create backup
  const createBackup = useMutation({
    mutationFn: (data: { mnemonic: string; password: string }) => 
      apiRequest('POST', '/api/wallet/backup/create', data),
    onSuccess: (data) => {
      setBackupData(data.backup);
      setCurrentStep(3);
      toast({
        title: "Backup Created",
        description: "Your wallet backup has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Download backup file
  const downloadBackup = useMutation({
    mutationFn: (data: { mnemonic: string; password: string }) => 
      apiRequest('POST', '/api/wallet/backup/download', data),
    onSuccess: (data, variables) => {
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sniperx-wallet-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Backup Downloaded",
        description: "Backup file saved to your downloads folder",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Recover from mnemonic
  const recoverFromMnemonic = useMutation({
    mutationFn: (data: { mnemonic: string }) => 
      apiRequest('POST', '/api/wallet/recovery/from-mnemonic', data),
    onSuccess: (data) => {
      setRecoveredAddress(data.walletAddress);
      toast({
        title: "Wallet Recovered",
        description: "Your wallet has been successfully recovered from mnemonic",
      });
    },
    onError: (error) => {
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Recover from backup file
  const recoverFromBackup = useMutation({
    mutationFn: (data: { backupData: any; password: string }) => 
      apiRequest('POST', '/api/wallet/recovery/from-backup', data),
    onSuccess: (data) => {
      setRecoveredAddress(data.walletAddress);
      toast({
        title: "Wallet Recovered",
        description: "Your wallet has been successfully recovered from backup file",
      });
    },
    onError: (error) => {
      toast({
        title: "Recovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          JSON.parse(content); // Validate JSON
          setRecoveryFile(content);
          toast({
            title: "File Loaded",
            description: "Backup file loaded successfully",
          });
        } catch (error) {
          toast({
            title: "Invalid File",
            description: "Please select a valid SniperX backup file",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const copyToClipboard = async (text: string, type: 'mnemonic' | 'address') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'mnemonic') {
        setCopiedMnemonic(true);
        setTimeout(() => setCopiedMnemonic(false), 2000);
      } else {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      }
      toast({
        title: "Copied",
        description: `${type === 'mnemonic' ? 'Recovery phrase' : 'Address'} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCreateBackup = () => {
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    createBackup.mutate({ mnemonic, password });
  };

  const handleDownloadBackup = () => {
    downloadBackup.mutate({ mnemonic, password });
  };

  const handleRecoverFromMnemonic = () => {
    if (!recoveryMnemonic.trim()) {
      toast({
        title: "Missing Recovery Phrase",
        description: "Please enter your 12-word recovery phrase",
        variant: "destructive",
      });
      return;
    }
    recoverFromMnemonic.mutate({ mnemonic: recoveryMnemonic.trim() });
  };

  const handleRecoverFromFile = () => {
    if (!recoveryFile || !recoveryPassword) {
      toast({
        title: "Missing Information",
        description: "Please upload a backup file and enter the password",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const backupData = JSON.parse(recoveryFile);
      recoverFromBackup.mutate({ backupData, password: recoveryPassword });
    } catch (error) {
      toast({
        title: "Invalid Backup",
        description: "Backup file format is invalid",
        variant: "destructive",
      });
    }
  };

  const renderBackupStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Step 1: Recovery Phrase</h3>
              <p className="text-gray-400">Generate or enter your 12-word recovery phrase</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Recovery Phrase (12 words)</Label>
                <Button
                  onClick={() => generateMnemonic.mutate()}
                  disabled={generateMnemonic.isPending}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>
              
              <div className="relative">
                <Textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your 12-word recovery phrase or generate a new one..."
                  className={`min-h-24 font-mono text-sm ${!showMnemonic ? 'text-security-disc' : ''}`}
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    variant="ghost"
                    size="sm"
                  >
                    {showMnemonic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {mnemonic && (
                    <Button
                      onClick={() => copyToClipboard(mnemonic, 'mnemonic')}
                      variant="ghost"
                      size="sm"
                    >
                      {copiedMnemonic ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This recovery phrase is the only way to restore your wallet. 
                  Store it securely offline and never share it with anyone.
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!mnemonic.trim()}
                className="w-full"
              >
                Continue to Password Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Step 2: Backup Password</h3>
              <p className="text-gray-400">Create a strong password to encrypt your backup</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Backup Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password (min 8 characters)"
                    className="pr-10"
                  />
                  <Button
                    onClick={() => setShowPassword(!showPassword)}
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                />
              </div>
              
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Your backup will be encrypted with AES-256 encryption. 
                  Remember this password - it cannot be recovered if lost.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleCreateBackup}
                  disabled={createBackup.isPending || !password || password !== confirmPassword}
                  className="flex-1"
                >
                  {createBackup.isPending ? "Creating..." : "Create Backup"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Step 3: Backup Complete</h3>
              <p className="text-gray-400">Your wallet backup has been created successfully</p>
            </div>
            
            {backupData && (
              <div className="space-y-4">
                <Card className="border-green-500/20 bg-green-900/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-5 w-5 text-green-400" />
                      <span className="font-medium text-green-300">Backup Created Successfully</span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wallet Address:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-xs">
                            {backupData.walletAddress.slice(0, 8)}...{backupData.walletAddress.slice(-8)}
                          </span>
                          <Button
                            onClick={() => copyToClipboard(backupData.walletAddress, 'address')}
                            variant="ghost"
                            size="sm"
                          >
                            {copiedAddress ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created:</span>
                        <span className="text-white">{new Date(backupData.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Encryption:</span>
                        <span className="text-green-300">AES-256</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Button
                  onClick={handleDownloadBackup}
                  disabled={downloadBackup.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadBackup.isPending ? "Preparing Download..." : "Download Backup File"}
                </Button>
                
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Next Steps:</strong> Save the downloaded backup file in a secure location. 
                    You can use this file along with your password to recover your wallet.
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={() => {
                    setCurrentStep(1);
                    setMnemonic('');
                    setPassword('');
                    setConfirmPassword('');
                    setBackupData(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Create Another Backup
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-300 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Wallet Backup & Recovery Wizard
          </CardTitle>
          <CardDescription>
            Secure your wallet with encrypted backups and recovery options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="backup" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Create Backup
              </TabsTrigger>
              <TabsTrigger value="recovery" className="flex items-center gap-2">
                <Unlock className="h-4 w-4" />
                Recover Wallet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="backup" className="space-y-6 mt-6">
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center gap-4">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${currentStep >= step 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-700 text-gray-400'
                        }
                      `}>
                        {currentStep > step ? <Check className="h-4 w-4" /> : step}
                      </div>
                      {step < 3 && (
                        <div className={`
                          w-12 h-1 mx-2
                          ${currentStep > step ? 'bg-purple-600' : 'bg-gray-700'}
                        `} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {renderBackupStep()}
            </TabsContent>

            <TabsContent value="recovery" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">Recover Your Wallet</h3>
                  <p className="text-gray-400">Choose your recovery method</p>
                </div>

                <Tabs defaultValue="mnemonic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mnemonic">Recovery Phrase</TabsTrigger>
                    <TabsTrigger value="file">Backup File</TabsTrigger>
                  </TabsList>

                  <TabsContent value="mnemonic" className="space-y-4">
                    <div className="space-y-2">
                      <Label>12-Word Recovery Phrase</Label>
                      <Textarea
                        value={recoveryMnemonic}
                        onChange={(e) => setRecoveryMnemonic(e.target.value)}
                        placeholder="Enter your 12-word recovery phrase separated by spaces..."
                        className="min-h-24 font-mono text-sm"
                      />
                    </div>
                    
                    <Button
                      onClick={handleRecoverFromMnemonic}
                      disabled={recoverFromMnemonic.isPending || !recoveryMnemonic.trim()}
                      className="w-full"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {recoverFromMnemonic.isPending ? "Recovering..." : "Recover Wallet"}
                    </Button>
                  </TabsContent>

                  <TabsContent value="file" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Backup File</Label>
                      <Input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Backup Password</Label>
                      <Input
                        type="password"
                        value={recoveryPassword}
                        onChange={(e) => setRecoveryPassword(e.target.value)}
                        placeholder="Enter the password used to create this backup"
                      />
                    </div>
                    
                    <Button
                      onClick={handleRecoverFromFile}
                      disabled={recoverFromBackup.isPending || !recoveryFile || !recoveryPassword}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {recoverFromBackup.isPending ? "Recovering..." : "Recover from File"}
                    </Button>
                  </TabsContent>
                </Tabs>

                {recoveredAddress && (
                  <Card className="border-green-500/20 bg-green-900/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="h-5 w-5 text-green-400" />
                        <span className="font-medium text-green-300">Wallet Recovered Successfully</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Address:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono text-sm">
                            {recoveredAddress.slice(0, 8)}...{recoveredAddress.slice(-8)}
                          </span>
                          <Button
                            onClick={() => copyToClipboard(recoveredAddress, 'address')}
                            variant="ghost"
                            size="sm"
                          >
                            {copiedAddress ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}