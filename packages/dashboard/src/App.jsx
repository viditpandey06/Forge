import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { QueueDepthCard } from './components/QueueDepthCard';
import { LatencyCard } from './components/LatencyCard';
import { ThroughputChart } from './components/ThroughputChart';
import { JobFeed } from './components/JobFeed';
import { Activity, Zap } from 'lucide-react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const socket = io(API_URL);

function Preloader() {
  const messages = [
    "Connecting to Forge API...",
    "Waking up Render backend (this takes ~50s on free tiers)...",
    "Heating the queue engine...",
    "Setting up the server...",
    "Connecting to worker pool...",
    "Establishing Redis streams..."
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-gray-950 text-white space-y-6">
      <div className="flex items-center text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        <Activity className="animate-spin text-blue-500 mr-3 w-10 h-10" />
        Forge
      </div>
      <p className="text-emerald-400 font-mono tracking-widest text-sm animate-pulse">{messages[msgIndex]}</p>
      <p className="text-xs text-gray-600 max-w-sm text-center">
        Note: The backend is hosted on Render's free tier, which sleeps after 15 minutes of inactivity. Please allow up to a minute for the initial cold start!
      </p>
    </div>
  );
}

function App() {
  const [metrics, setMetrics] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulateLoad = async () => {
    setIsSimulating(true);
    try {
      await fetch(`${API_URL}/jobs/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1000 })
      });
    } catch (err) {
      console.error('Failed to simulate load:', err);
    } finally {
      setIsSimulating(false);
    }
  };

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
    return <Preloader />;
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
          <button
            onClick={handleSimulateLoad}
            disabled={isSimulating}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium shadow border transition-colors ${
              isSimulating 
                ? 'bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
            }`}
          >
            {isSimulating ? <Activity className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>{isSimulating ? 'Simulating...' : 'Simulate Load'}</span>
          </button>
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
