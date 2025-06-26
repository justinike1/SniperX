import { CheckCircle, Zap, Shield, Rocket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ProductionModeNotification() {
  return (
    <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/20 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-green-400" />
            <CheckCircle className="h-4 w-4 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-green-400 font-semibold text-sm">Production Mode Active</h3>
            <p className="text-green-300/80 text-xs">
              Live trading with real blockchain data - No demo balances
            </p>
          </div>
          <div className="flex items-center gap-2 text-green-400">
            <Shield className="h-4 w-4" />
            <Zap className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}