import { BotSettingsData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface QuickSettingsProps {
  settings: BotSettingsData;
  onUpdateSettings: (settings: Partial<BotSettingsData>) => void;
}

export const QuickSettings = ({ settings, onUpdateSettings }: QuickSettingsProps) => {
  return (
    <section className="px-4 pb-6">
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <h2 className="text-lg font-semibold mb-4">Quick Settings</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-Buy Amount</p>
              <p className="text-sm text-gray-400">Per token snipe</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={settings.autoBuyAmount}
                onChange={(e) => onUpdateSettings({ autoBuyAmount: parseFloat(e.target.value) })}
                className="bg-dark-bg border-dark-border w-20 text-center font-mono text-sm"
                step="0.1"
                min="0.1"
              />
              <span className="text-sm text-gray-400">SOL</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Take Profit Levels</p>
              <p className="text-sm text-gray-400">Auto-sell targets</p>
            </div>
            <div className="flex space-x-2">
              {settings.takeProfitLevels.map((level, idx) => (
                <Badge key={idx} className="bg-profit-green text-dark-bg px-2 py-1 text-xs font-bold">
                  {level}x
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Stop Loss</p>
              <p className="text-sm text-gray-400">Maximum loss threshold</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={settings.stopLossPercentage}
                onChange={(e) => onUpdateSettings({ stopLossPercentage: parseFloat(e.target.value) })}
                className="bg-dark-bg border-dark-border w-16 text-center font-mono text-sm"
                min="1"
                max="50"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
