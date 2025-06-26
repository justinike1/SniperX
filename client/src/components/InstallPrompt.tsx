import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installApp();
    if (!success) {
      setDismissed(true);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 bg-gradient-to-r from-emerald-900/95 to-emerald-800/95 border-emerald-600 backdrop-blur-sm mx-auto max-w-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-sm text-white">Install SniperX</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0 text-white hover:bg-emerald-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-emerald-200 text-xs">
          Get the full app experience with offline access and push notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          onClick={handleInstall}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-8"
        >
          <Download className="h-4 w-4 mr-2" />
          Add to Home Screen
        </Button>
      </CardContent>
    </Card>
  );
};