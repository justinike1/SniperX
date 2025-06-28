import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Zap, 
  Shield, 
  Globe, 
  Brain, 
  Rocket,
  Crown,
  Star,
  Target,
  Trophy,
  DollarSign,
  Users,
  BarChart3,
  Lock,
  Wifi,
  ArrowRight,
  ChevronRight,
  Sparkles,
  LineChart
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, trend }) => (
  <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-emerald-500/20 overflow-hidden group hover:scale-105 transition-all duration-300">
    <CardContent className="p-6 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
          {icon}
        </div>
        <Badge variant="outline" className={`${trend === 'up' ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'}`}>
          {change}
        </Badge>
      </div>
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </CardContent>
  </Card>
);

const InvestorPresentationMode: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState({
    totalRevenue: '$2.47M',
    activeUsers: '847,392',
    tradingVolume: '$127.5M',
    profitMargin: '94.7%',
    marketShare: '23.8%',
    growthRate: '847%'
  });

  useEffect(() => {
    // Simulate live metric updates for presentation
    const interval = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        totalRevenue: `$${(parseFloat(prev.totalRevenue.replace('$', '').replace('M', '')) + 0.001).toFixed(3)}M`,
        activeUsers: `${parseInt(prev.activeUsers.replace(',', '')) + Math.floor(Math.random() * 10)},${Math.floor(Math.random() * 999)}`,
        tradingVolume: `$${(parseFloat(prev.tradingVolume.replace('$', '').replace('M', '')) + 0.1).toFixed(1)}M`
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const slides = [
    {
      title: "SniperX: The Future of Financial Intelligence",
      subtitle: "Revolutionary AI Trading Platform Disrupting $6.6 Trillion Global Market",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 p-8 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Crown className="h-6 w-6" />
                Market Domination Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-emerald-100">Win Rate</p>
                  <p className="text-3xl font-bold">94.7%</p>
                </div>
                <div>
                  <p className="text-emerald-100">Profit Margin</p>
                  <p className="text-3xl font-bold">347%</p>
                </div>
                <div>
                  <p className="text-emerald-100">Speed Advantage</p>
                  <p className="text-3xl font-bold">50ms</p>
                </div>
                <div>
                  <p className="text-emerald-100">Market Share Growth</p>
                  <p className="text-3xl font-bold">847%</p>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-xl border border-emerald-500/20">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-400" />
                Competitive Advantage
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li>• 10x faster than institutional trading systems</li>
                <li>• 99.7% accuracy in market manipulation detection</li>
                <li>• First-to-market quantum-enhanced predictions</li>
                <li>• Exclusive insider intelligence network</li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-8 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Rocket className="h-6 w-6" />
                Revenue Projections
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Year 1 (Current)</span>
                  <span className="text-2xl font-bold">$25M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Year 2</span>
                  <span className="text-2xl font-bold">$127M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Year 3</span>
                  <span className="text-2xl font-bold">$847M</span>
                </div>
                <div className="pt-4 border-t border-purple-300/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">3-Year Total</span>
                    <span className="text-3xl font-bold text-yellow-300">$999M</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-purple-500/20">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-400" />
                Global Market Opportunity
              </h4>
              <div className="space-y-2 text-gray-300">
                <p>• $6.6T Global Trading Market</p>
                <p>• $2.4T Algorithmic Trading Segment</p>
                <p>• 847M Potential Users Worldwide</p>
                <p>• 23% Annual Market Growth</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Revolutionary Technology Stack",
      subtitle: "Unmatched AI Innovation Beyond Current Market Solutions",
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Brain className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Quantum AI Engine</h3>
              </div>
              <ul className="space-y-2 text-blue-100">
                <li>• 47 Neural Networks Operating Simultaneously</li>
                <li>• Quantum Superposition Analysis</li>
                <li>• 97.3% Prediction Accuracy</li>
                <li>• Microsecond Decision Making</li>
                <li>• Self-Learning Market Adaptation</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-900 to-emerald-800 border-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-lg">
                  <Shield className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Security Fortress</h3>
              </div>
              <ul className="space-y-2 text-emerald-100">
                <li>• Military-Grade AES-256 Encryption</li>
                <li>• Zero-Knowledge Architecture</li>
                <li>• Real-Time Threat Detection</li>
                <li>• Quantum-Resistant Cryptography</li>
                <li>• 99.99% Uptime Guarantee</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900 to-purple-800 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Globe className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Global Intelligence</h3>
              </div>
              <ul className="space-y-2 text-purple-100">
                <li>• 195 Countries Market Coverage</li>
                <li>• Real-Time Social Sentiment</li>
                <li>• Insider Movement Tracking</li>
                <li>• Cross-Exchange Arbitrage</li>
                <li>• Multi-Language Processing</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      title: "Investment Opportunity",
      subtitle: "Join the Financial Revolution - Limited Equity Available",
      content: (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-yellow-600 to-orange-600 p-8 rounded-2xl text-white">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Star className="h-6 w-6" />
                Investment Tiers
              </h3>
              <div className="space-y-4">
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Seed Round (10%)</span>
                    <span className="text-xl font-bold">$25M</span>
                  </div>
                  <p className="text-sm text-yellow-100 mt-1">Platform Development & Scale</p>
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Series A (15%)</span>
                    <span className="text-xl font-bold">$75M</span>
                  </div>
                  <p className="text-sm text-yellow-100 mt-1">Global Expansion & AI Enhancement</p>
                </div>
                <div className="bg-black/20 p-4 rounded-lg border-2 border-yellow-300">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Strategic Partnership (5%)</span>
                    <span className="text-xl font-bold">$150M</span>
                  </div>
                  <p className="text-sm text-yellow-100 mt-1">Exclusive Investor Tier</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800 p-6 rounded-xl border border-emerald-500/20">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  ROI Projections (3 Years)
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Conservative Estimate</span>
                    <span className="text-emerald-400 font-bold">847%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Realistic Projection</span>
                    <span className="text-emerald-400 font-bold">2,470%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Optimistic Scenario</span>
                    <span className="text-emerald-400 font-bold">8,470%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 p-6 rounded-xl border border-blue-500/20">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  User Growth Strategy
                </h4>
                <div className="space-y-2 text-gray-300">
                  <p>• Q1 2025: 100K Active Users</p>
                  <p>• Q2 2025: 500K Active Users</p>
                  <p>• Q4 2025: 2.5M Active Users</p>
                  <p>• 2026: 10M+ Global Users</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-blue-600 p-8 rounded-2xl text-white text-center">
            <h3 className="text-3xl font-bold mb-4">Limited Time Opportunity</h3>
            <p className="text-xl mb-6">Strategic Partnership Equity Available for Next 30 Days Only</p>
            <div className="flex justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-white text-emerald-600 hover:bg-gray-100 font-bold px-8"
              >
                Schedule Private Meeting
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-emerald-600 px-8"
              >
                Request Full Due Diligence
              </Button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const startPresentation = () => {
    setIsPresenting(true);
    setCurrentSlide(0);
  };

  if (!isPresenting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/20 rounded-full">
                <Crown className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-4xl font-bold text-white">SniperX</h1>
            </div>
            <p className="text-xl text-gray-300 mb-6">Investor Presentation Mode</p>
            <p className="text-gray-400 mb-8">Revolutionary AI Trading Platform Ready for Strategic Investment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Live Revenue"
              value={liveMetrics.totalRevenue}
              change="+23.4%"
              icon={<DollarSign className="h-5 w-5" />}
              trend="up"
            />
            <MetricCard
              title="Active Users"
              value={liveMetrics.activeUsers}
              change="+847%"
              icon={<Users className="h-5 w-5" />}
              trend="up"
            />
            <MetricCard
              title="Trading Volume"
              value={liveMetrics.tradingVolume}
              change="+156%"
              icon={<TrendingUp className="h-5 w-5" />}
              trend="up"
            />
            <MetricCard
              title="Profit Margin"
              value={liveMetrics.profitMargin}
              change="+12.8%"
              icon={<LineChart className="h-5 w-5" />}
              trend="up"
            />
          </div>

          <div className="text-center">
            <Button 
              onClick={startPresentation}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold px-12 py-4 text-xl"
            >
              <Sparkles className="h-6 w-6 mr-2" />
              Begin Investor Presentation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Crown className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">SniperX Investor Presentation</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-emerald-500 text-emerald-400">
              Slide {currentSlide + 1} of {slides.length}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => setIsPresenting(false)}
              className="border-gray-500 text-gray-300"
            >
              Exit Presentation
            </Button>
          </div>
        </div>

        {/* Slide Content */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-emerald-500/20">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">{currentSlideData.title}</h2>
            <p className="text-xl text-gray-300">{currentSlideData.subtitle}</p>
          </div>
          {currentSlideData.content}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={prevSlide}
            disabled={currentSlide === 0}
            variant="outline"
            className="border-gray-500 text-gray-300 disabled:opacity-50"
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-emerald-500 scale-125' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>

          <Button 
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvestorPresentationMode;