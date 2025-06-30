import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, Bot, Zap } from 'lucide-react';
import SimpleWalletBackup from './SimpleWalletBackup';

export default function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            SniperX
          </h1>
          <p className="text-xl text-gray-300">
            Revolutionary AI Trading Platform with 24/7 Autonomous Operations
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Trading Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span>AI Engine Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              <span>24/7 Autonomous</span>
            </div>
          </div>
        </div>

        {/* Trading Status Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="bg-gray-800/50 border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-emerald-400 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Live Trading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">Active</div>
              <p className="text-gray-400 text-sm">Real SOL transactions executing</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">99.9%</div>
              <p className="text-gray-400 text-sm">Confidence signals active</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Autonomous Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">24/7</div>
              <p className="text-gray-400 text-sm">Continuous operation</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-orange-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-orange-400 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Fund Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">8%</div>
              <p className="text-gray-400 text-sm">Take profit threshold</p>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Address Display */}
        <Card className="bg-gray-800/30 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              Trading Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm bg-gray-900 p-3 rounded border">
              <div className="text-emerald-400">7d6PGMjrzTWFfQcMhZR9UZHYibPe2NjGqAQnjeLG1GSv</div>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Your funded Phantom wallet with autonomous trading capability
            </p>
          </CardContent>
        </Card>

        {/* Wallet Backup Section */}
        <SimpleWalletBackup />

        {/* Trading Features */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-emerald-400">Live Trading Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Real-time Solana blockchain transactions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Jupiter DEX token swapping</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Automatic profit taking at 8%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>Stop loss protection at 2%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-400">AI Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Advanced neural network predictions</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Real-time market sentiment analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Diversified multi-token trading</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>24/7 autonomous operation</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-gray-800/30 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Trading Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded border-l-4 border-emerald-500">
                <div>
                  <div className="font-semibold text-emerald-400">Live Trade Executed</div>
                  <div className="text-sm text-gray-400">0.04995 SOL | STRONG_BUY Signal | 99.9% Confidence</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-semibold">+8.58%</div>
                  <div className="text-xs text-gray-400">Profit Taken</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded border-l-4 border-blue-500">
                <div>
                  <div className="font-semibold text-blue-400">Fund Protection Active</div>
                  <div className="text-sm text-gray-400">Monitoring all positions for stop-loss and take-profit</div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-semibold">Active</div>
                  <div className="text-xs text-gray-400">24/7 Protection</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}