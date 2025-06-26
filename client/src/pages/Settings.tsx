import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BotSettingsData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { Save, Smartphone, Shield, Zap, DollarSign, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SettingsProps {
  onLogout: () => void;
}

export default function Settings({ onLogout }: SettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery<BotSettingsData>({
    queryKey: ['/api/bot/settings'],
  });

  const [localSettings, setLocalSettings] = useState<BotSettingsData | null>(null);

  // Initialize local settings when data is loaded
  useState(() => {
    if (settings && !localSettings) {
      setLocalSettings(settings);
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<BotSettingsData>) =>
      apiRequest('PATCH', '/api/bot/settings', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your bot settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    if (localSettings) {
      updateSettingsMutation.mutate(localSettings);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      toast({
        title: "Logged out successfully",
        description: "You have been securely logged out of SniperX.",
      });
      
      onLogout();
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLocal = (updates: Partial<BotSettingsData>) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, ...updates });
    }
  };

  const addTakeProfitLevel = () => {
    if (localSettings && localSettings.takeProfitLevels.length < 5) {
      const newLevel = Math.max(...localSettings.takeProfitLevels) + 1;
      handleUpdateLocal({
        takeProfitLevels: [...localSettings.takeProfitLevels, newLevel]
      });
    }
  };

  const removeTakeProfitLevel = (index: number) => {
    if (localSettings && localSettings.takeProfitLevels.length > 1) {
      const newLevels = localSettings.takeProfitLevels.filter((_, i) => i !== index);
      handleUpdateLocal({ takeProfitLevels: newLevels });
    }
  };

  const updateTakeProfitLevel = (index: number, value: number) => {
    if (localSettings) {
      const newLevels = [...localSettings.takeProfitLevels];
      newLevels[index] = value;
      handleUpdateLocal({ takeProfitLevels: newLevels });
    }
  };

  if (isLoading || !localSettings) {
    return (
      <div className="px-4 py-6">
        <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
          <div className="animate-pulse space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-dark-border rounded w-32"></div>
                <div className="h-10 bg-dark-border rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Bot Control */}
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-accent-purple" />
          <h2 className="text-lg font-semibold">Bot Control</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bot Status</p>
              <p className="text-sm text-gray-400">Enable or disable automated trading</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={localSettings.isActive}
                onCheckedChange={(checked) => handleUpdateLocal({ isActive: checked })}
              />
              <Badge className={localSettings.isActive ? 'bg-profit-green text-dark-bg' : 'bg-gray-600 text-white'}>
                {localSettings.isActive ? 'ACTIVE' : 'PAUSED'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Settings */}
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="w-5 h-5 text-profit-green" />
          <h2 className="text-lg font-semibold">Trading Settings</h2>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-Buy Amount</p>
              <p className="text-sm text-gray-400">SOL amount per token snipe</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={localSettings.autoBuyAmount}
                onChange={(e) => handleUpdateLocal({ autoBuyAmount: parseFloat(e.target.value) || 0.1 })}
                className="bg-dark-bg border-dark-border w-24 text-center font-mono"
                step="0.1"
                min="0.1"
                max="100"
              />
              <span className="text-sm text-gray-400">SOL</span>
            </div>
          </div>
          
          <Separator className="bg-dark-border" />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium">Take Profit Levels</p>
                <p className="text-sm text-gray-400">Multipliers for automatic selling</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addTakeProfitLevel}
                disabled={localSettings.takeProfitLevels.length >= 5}
                className="bg-dark-bg border-dark-border"
              >
                Add Level
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {localSettings.takeProfitLevels.map((level, index) => (
                <div key={index} className="flex items-center space-x-1 bg-dark-bg rounded-lg p-2">
                  <Input
                    type="number"
                    value={level}
                    onChange={(e) => updateTakeProfitLevel(index, parseFloat(e.target.value) || 1)}
                    className="w-16 h-8 text-center font-mono text-sm bg-transparent border-dark-border"
                    min="1"
                    max="100"
                  />
                  <span className="text-xs text-gray-400">x</span>
                  {localSettings.takeProfitLevels.length > 1 && (
                    <button
                      onClick={() => removeTakeProfitLevel(index)}
                      className="text-loss-red hover:text-red-400 text-xs ml-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <Separator className="bg-dark-border" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Stop Loss</p>
              <p className="text-sm text-gray-400">Maximum loss percentage before auto-sell</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={localSettings.stopLossPercentage}
                onChange={(e) => handleUpdateLocal({ stopLossPercentage: parseFloat(e.target.value) || 5 })}
                className="bg-dark-bg border-dark-border w-20 text-center font-mono"
                min="1"
                max="50"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Max Slippage</p>
              <p className="text-sm text-gray-400">Maximum acceptable slippage for trades</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={localSettings.maxSlippage}
                onChange={(e) => handleUpdateLocal({ maxSlippage: parseFloat(e.target.value) || 1 })}
                className="bg-dark-bg border-dark-border w-20 text-center font-mono"
                min="0.1"
                max="20"
                step="0.1"
              />
              <span className="text-sm text-gray-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-warning-orange" />
          <h2 className="text-lg font-semibold">Risk Management</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Honeypot Filter</p>
              <p className="text-sm text-gray-400">Block potentially malicious tokens</p>
            </div>
            <Switch
              checked={localSettings.enableHoneypotFilter}
              onCheckedChange={(checked) => handleUpdateLocal({ enableHoneypotFilter: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">LP Lock Filter</p>
              <p className="text-sm text-gray-400">Only trade tokens with locked liquidity</p>
            </div>
            <Switch
              checked={localSettings.enableLpLockFilter}
              onCheckedChange={(checked) => handleUpdateLocal({ enableLpLockFilter: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Renounce Filter</p>
              <p className="text-sm text-gray-400">Only trade tokens with renounced ownership</p>
            </div>
            <Switch
              checked={localSettings.enableRenounceFilter}
              onCheckedChange={(checked) => handleUpdateLocal({ enableRenounceFilter: checked })}
            />
          </div>
          
          <Separator className="bg-dark-border" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Minimum Liquidity</p>
              <p className="text-sm text-gray-400">Minimum USD liquidity required</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">$</span>
              <Input
                type="number"
                value={localSettings.minLiquidity}
                onChange={(e) => handleUpdateLocal({ minLiquidity: parseFloat(e.target.value) || 1000 })}
                className="bg-dark-bg border-dark-border w-24 text-center font-mono"
                min="100"
                step="100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center space-x-2 mb-4">
          <Smartphone className="w-5 h-5 text-accent-purple" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-gray-400">Receive alerts for trades and important events</p>
            </div>
            <Switch
              checked={localSettings.notificationsEnabled}
              onCheckedChange={(checked) => handleUpdateLocal({ notificationsEnabled: checked })}
            />
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-dark-surface rounded-xl p-6 border border-dark-border">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-accent-purple" />
          <h2 className="text-lg font-semibold">Account</h2>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">Sign out of SniperX</p>
            <p className="text-sm text-gray-400">Securely logout of your account</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          className="bg-accent-purple hover:bg-indigo-600 text-white px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
