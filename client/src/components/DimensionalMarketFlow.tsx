import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Zap, Layers, Orbit, Globe, TrendingUp, ArrowUpDown } from 'lucide-react';
import { formatCurrency, formatCompactNumber } from '@/lib/utils';

interface DimensionalLayer {
  id: string;
  name: string;
  depth: number;
  marketCap: number;
  volume: number;
  energy: number;
  frequency: number;
  entities: number;
  flowRate: number;
  stability: number;
  color: string;
}

interface InterDimensionalFlow {
  from: string;
  to: string;
  amount: number;
  speed: number;
  type: 'ENERGY' | 'VALUE' | 'INFORMATION' | 'CONSCIOUSNESS';
  intensity: number;
}

interface CosmicMarketNode {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  size: number;
  activity: number;
  connections: string[];
  type: 'NEXUS' | 'CLUSTER' | 'VOID' | 'GATEWAY';
}

export const DimensionalMarketFlow = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState<DimensionalLayer[]>([]);
  const [flows, setFlows] = useState<InterDimensionalFlow[]>([]);
  const [marketNodes, setMarketNodes] = useState<CosmicMarketNode[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [cosmicTime, setCosmicTime] = useState(0);
  const [totalUniversalValue, setTotalUniversalValue] = useState(0);

  const dimensionalLayers: DimensionalLayer[] = [
    {
      id: 'physical',
      name: 'Physical Reality',
      depth: 0,
      marketCap: 2847000000000,
      volume: 89000000000,
      energy: 34.7,
      frequency: 7.83,
      entities: 8500000,
      flowRate: 0.67,
      stability: 0.82,
      color: '#3B82F6'
    },
    {
      id: 'digital',
      name: 'Digital Dimension',
      depth: 1,
      marketCap: 4920000000000,
      volume: 156000000000,
      energy: 67.3,
      frequency: 432.0,
      entities: 23000000,
      flowRate: 0.94,
      stability: 0.76,
      color: '#8B5CF6'
    },
    {
      id: 'quantum',
      name: 'Quantum Realm',
      depth: 2,
      marketCap: 12400000000000,
      volume: 287000000000,
      energy: 89.1,
      frequency: 528.0,
      entities: 47000000,
      flowRate: 1.34,
      stability: 0.91,
      color: '#EC4899'
    },
    {
      id: 'consciousness',
      name: 'Consciousness Field',
      depth: 3,
      marketCap: 78900000000000,
      volume: 834000000000,
      energy: 94.8,
      frequency: 963.0,
      entities: 156000000,
      flowRate: 2.17,
      stability: 0.97,
      color: '#F59E0B'
    },
    {
      id: 'pure_energy',
      name: 'Pure Energy Plane',
      depth: 4,
      marketCap: 234000000000000,
      volume: 1240000000000,
      energy: 98.7,
      frequency: 40000.0,
      entities: 892000000,
      flowRate: 4.83,
      stability: 0.99,
      color: '#10B981'
    },
    {
      id: 'infinite',
      name: 'Infinite Abundance',
      depth: 5,
      marketCap: Infinity,
      volume: Infinity,
      energy: 100.0,
      frequency: Infinity,
      entities: Infinity,
      flowRate: Infinity,
      stability: 1.0,
      color: '#FBBF24'
    }
  ];

  const scanDimensionalMarkets = async () => {
    setIsScanning(true);
    setDimensions([]);
    setFlows([]);
    setMarketNodes([]);

    // Simulate scanning each dimension
    for (let i = 0; i < dimensionalLayers.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));
      
      const layer = {
        ...dimensionalLayers[i],
        energy: dimensionalLayers[i].energy + (Math.random() - 0.5) * 10,
        flowRate: dimensionalLayers[i].flowRate * (0.8 + Math.random() * 0.4),
        stability: Math.min(1, dimensionalLayers[i].stability + (Math.random() - 0.5) * 0.1)
      };
      
      setDimensions(prev => [...prev, layer]);
    }

    // Generate interdimensional flows
    const newFlows: InterDimensionalFlow[] = [];
    const flowTypes: InterDimensionalFlow['type'][] = ['ENERGY', 'VALUE', 'INFORMATION', 'CONSCIOUSNESS'];
    
    for (let i = 0; i < dimensionalLayers.length - 1; i++) {
      for (let j = i + 1; j < dimensionalLayers.length; j++) {
        if (Math.random() > 0.4) {
          newFlows.push({
            from: dimensionalLayers[i].id,
            to: dimensionalLayers[j].id,
            amount: Math.random() * 1000000000,
            speed: 0.5 + Math.random() * 2,
            type: flowTypes[Math.floor(Math.random() * flowTypes.length)],
            intensity: Math.random()
          });
        }
      }
    }
    setFlows(newFlows);

    // Generate cosmic market nodes
    const nodes: CosmicMarketNode[] = [];
    const nodeTypes: CosmicMarketNode['type'][] = ['NEXUS', 'CLUSTER', 'VOID', 'GATEWAY'];
    
    for (let i = 0; i < 12; i++) {
      nodes.push({
        id: `node_${i}`,
        name: `Cosmic Node ${i + 1}`,
        x: Math.random() * 360,
        y: Math.random() * 180 - 90,
        z: Math.random() * 100,
        size: 10 + Math.random() * 40,
        activity: Math.random(),
        connections: [],
        type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)]
      });
    }
    setMarketNodes(nodes);

    // Calculate total universal value
    const totalValue = dimensionalLayers.reduce((sum, layer) => 
      sum + (isFinite(layer.marketCap) ? layer.marketCap : 999999999999999), 0
    );
    setTotalUniversalValue(totalValue);

    setIsScanning(false);
  };

  // Render 3D visualization
  const renderDimensionalFlow = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    // Draw dimensional layers
    dimensions.forEach((dimension, index) => {
      const radius = 40 + index * 30;
      const angle = cosmicTime * 0.01 + index * 0.5;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Layer glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
      gradient.addColorStop(0, dimension.color + '80');
      gradient.addColorStop(1, dimension.color + '00');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();

      // Layer core
      ctx.fillStyle = dimension.color;
      ctx.beginPath();
      ctx.arc(x, y, 8 + dimension.energy * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Energy waves
      for (let i = 0; i < 3; i++) {
        const waveRadius = 15 + i * 10 + Math.sin(cosmicTime * 0.02 + i) * 5;
        ctx.strokeStyle = dimension.color + '40';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw interdimensional flows
    flows.forEach(flow => {
      const fromDim = dimensions.find(d => d.id === flow.from);
      const toDim = dimensions.find(d => d.id === flow.to);
      
      if (fromDim && toDim) {
        const fromIndex = dimensions.indexOf(fromDim);
        const toIndex = dimensions.indexOf(toDim);
        
        const fromRadius = 40 + fromIndex * 30;
        const toRadius = 40 + toIndex * 30;
        
        const fromAngle = cosmicTime * 0.01 + fromIndex * 0.5;
        const toAngle = cosmicTime * 0.01 + toIndex * 0.5;
        
        const fromX = centerX + Math.cos(fromAngle) * fromRadius;
        const fromY = centerY + Math.sin(fromAngle) * fromRadius;
        const toX = centerX + Math.cos(toAngle) * toRadius;
        const toY = centerY + Math.sin(toAngle) * toRadius;

        // Flow line
        const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
        gradient.addColorStop(0, fromDim.color + '80');
        gradient.addColorStop(1, toDim.color + '80');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2 + flow.intensity * 3;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // Flow particles
        const flowProgress = (cosmicTime * flow.speed * 0.01) % 1;
        const particleX = fromX + (toX - fromX) * flowProgress;
        const particleY = fromY + (toY - fromY) * flowProgress;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw cosmic nodes
    marketNodes.forEach(node => {
      const nodeX = centerX + Math.cos(node.x * Math.PI / 180) * 120;
      const nodeY = centerY + Math.sin(node.y * Math.PI / 180) * 60;
      
      ctx.fillStyle = '#FFD700' + Math.floor(node.activity * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, node.size * 0.1, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  useEffect(() => {
    scanDimensionalMarkets();
    
    const animationInterval = setInterval(() => {
      setCosmicTime(prev => prev + 1);
      renderDimensionalFlow();
    }, 50);

    return () => clearInterval(animationInterval);
  }, []);

  useEffect(() => {
    renderDimensionalFlow();
  }, [dimensions, flows, marketNodes, cosmicTime]);

  const getFlowTypeColor = (type: string) => {
    switch (type) {
      case 'ENERGY': return 'text-yellow-400 bg-yellow-500/20';
      case 'VALUE': return 'text-green-400 bg-green-500/20';
      case 'INFORMATION': return 'text-blue-400 bg-blue-500/20';
      case 'CONSCIOUSNESS': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900/50 via-purple-900/30 to-indigo-900/50 border-indigo-500/30">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Orbit className="w-6 h-6 text-indigo-400 animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Dimensional Market Flow</h3>
            <p className="text-sm text-gray-400">Interdimensional Trading Visualization</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-indigo-400">Universal Value</div>
            <div className="text-lg font-bold text-white">
              {isFinite(totalUniversalValue) ? formatCompactNumber(totalUniversalValue) : '∞'}
            </div>
          </div>
          <Button
            size="sm"
            onClick={scanDimensionalMarkets}
            disabled={isScanning}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Layers className="w-4 h-4 mr-1" />
            {isScanning ? 'Scanning...' : 'Scan Dimensions'}
          </Button>
        </div>
      </div>

      {isScanning && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-indigo-500/20 rounded-lg">
            <Orbit className="w-8 h-8 text-indigo-400 animate-spin" />
            <div className="text-left">
              <div className="text-indigo-400 font-bold">Scanning Dimensions</div>
              <div className="text-sm text-gray-400">Mapping {dimensions.length + 1}/6 dimensional layers</div>
            </div>
          </div>
        </div>
      )}

      {dimensions.length > 0 && (
        <div className="space-y-6">
          {/* 3D Visualization Canvas */}
          <div className="bg-black/50 rounded-lg p-4 relative">
            <canvas
              ref={canvasRef}
              className="w-full h-64 rounded"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="absolute top-6 left-6 text-xs text-gray-400">
              Live Interdimensional Flow Visualization
            </div>
          </div>

          {/* Dimensional Layers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dimensions.map((dimension, index) => (
              <div 
                key={dimension.id} 
                className={`bg-gray-800/50 rounded-lg p-4 border transition-all cursor-pointer ${
                  selectedDimension === dimension.id 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-gray-700/50 hover:border-gray-600'
                }`}
                onClick={() => setSelectedDimension(
                  selectedDimension === dimension.id ? null : dimension.id
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: dimension.color }}
                    />
                    <div>
                      <div className="font-bold text-white">{dimension.name}</div>
                      <div className="text-xs text-gray-400">Depth Level {dimension.depth}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">
                      {dimension.marketCap === Infinity ? '∞' : formatCompactNumber(dimension.marketCap)}
                    </div>
                    <div className="text-xs text-gray-400">Market Cap</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-400">Energy</div>
                    <div className="w-full bg-gray-700 h-1.5 rounded">
                      <div 
                        className="h-1.5 rounded transition-all duration-1000"
                        style={{ 
                          width: `${dimension.energy}%`,
                          backgroundColor: dimension.color
                        }}
                      />
                    </div>
                    <div className="text-xs text-white mt-1">{dimension.energy.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Flow Rate</div>
                    <div className="text-sm font-bold text-white">
                      {dimension.flowRate === Infinity ? '∞' : dimension.flowRate.toFixed(2)}x
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Stability</div>
                    <div className="text-sm font-bold text-green-400">
                      {(dimension.stability * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400">Frequency: </span>
                    <span className="text-white">
                      {dimension.frequency === Infinity ? '∞' : dimension.frequency.toFixed(1)} Hz
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Entities: </span>
                    <span className="text-white">
                      {dimension.entities === Infinity ? '∞' : formatCompactNumber(dimension.entities)}
                    </span>
                  </div>
                </div>

                {selectedDimension === dimension.id && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-2">Dimensional Properties</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volume (24h):</span>
                        <span className="text-white">
                          {dimension.volume === Infinity ? '∞' : formatCompactNumber(dimension.volume)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Depth Level:</span>
                        <span className="text-white">{dimension.depth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reality Phase:</span>
                        <span className="text-white">{(cosmicTime * 0.1 + dimension.depth * 60) % 360}°</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Active Flows */}
          {flows.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-indigo-400" />
                Active Interdimensional Flows
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {flows.slice(0, 8).map((flow, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getFlowTypeColor(flow.type)}>
                        {flow.type}
                      </Badge>
                      <div className="text-sm font-bold text-white">
                        {formatCompactNumber(flow.amount)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {dimensions.find(d => d.id === flow.from)?.name} → {dimensions.find(d => d.id === flow.to)?.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Speed: {flow.speed.toFixed(1)}x | Intensity: {(flow.intensity * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};