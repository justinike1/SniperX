import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const ProductionModeNotification = () => {
  return (
    <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-600 mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-white">Official SniperX Wallet</h3>
                <Badge className="bg-green-600 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
              </div>
              <p className="text-blue-200 text-sm">
                You're using the official production wallet with real blockchain data and authentic market connections.
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-300">Production Mode</div>
            <div className="text-xs text-blue-400">Real Money • Live Trading</div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-200 text-sm font-medium">Important Notice</span>
          </div>
          <p className="text-yellow-100 text-xs mt-1">
            All trades execute with real funds on the Solana blockchain. Only trade amounts you can afford to lose.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};