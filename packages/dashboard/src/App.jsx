import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { QueueDepthCard } from './components/QueueDepthCard';
import { LatencyCard } from './components/LatencyCard';
import { ThroughputChart } from './components/ThroughputChart';
import { JobFeed } from './components/JobFeed';
import { Activity } from 'lucide-react';
import './App.css';

const socket = io('http://localhost:3000');

function App() {
  const [metrics, setMetrics] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleMetrics = (data) => setMetrics(data);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('metrics:update', handleMetrics);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('metrics:update', handleMetrics);
    };
  }, []);

  if (!metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <Activity className="animate-spin text-blue-500 mr-3" />
        Connecting to Forge...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Forge Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Real-time distributed task queue observability</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-900 px-4 py-2 rounded-full shadow-inner border border-gray-800">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className={`text-sm font-medium ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isConnected ? 'Live' : 'Reconnecting'}
            </span>
          </div>
          <div className="bg-gray-900 px-4 py-2 rounded-full text-sm shadow-inner border border-gray-800">
            Worker Utilisation: <span className="font-mono text-blue-400">{metrics.workerUtilisation}%</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <QueueDepthCard depth={metrics.queueDepth} />
        <LatencyCard latency={metrics.latency} />
        
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Overall Health</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800 shadow-inner">
              <span className="block text-xs text-gray-500 mb-1">Total Completed</span>
              <span className="text-xl font-mono text-emerald-400">{metrics.totalCompleted.toLocaleString()}</span>
            </div>
            <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800 shadow-inner">
              <span className="block text-xs text-gray-500 mb-1">Failure Rate</span>
              <span className="text-xl font-mono text-rose-400">{metrics.failureRate}%</span>
            </div>
            <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800 shadow-inner col-span-2">
              <span className="block text-xs text-gray-500 mb-1">Throughput (last 60s)</span>
              <span className="text-3xl font-mono text-blue-400">{metrics.throughput} <span className="text-sm text-gray-500">jobs/sec</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Throughput (jobs/sec)</h3>
          <ThroughputChart series={metrics.throughputSeries} />
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg flex flex-col h-[400px]">
          <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Recent Activity Feed</h3>
          <JobFeed events={metrics.recentEvents} />
        </div>
      </div>
    </div>
  );
}

export default App;
