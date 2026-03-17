import React from 'react';

export function LatencyCard({ latency }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg flex flex-col justify-between">
      <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Execution Latency (ms)</h3>
      <div className="flex flex-col space-y-4">
        <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800 flex justify-between items-center px-6">
          <span className="text-gray-500 font-mono">p50</span>
          <span className="text-2xl font-mono text-gray-200">{latency.p50}</span>
        </div>
        <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800 flex justify-between items-center px-6">
          <span className="text-gray-500 font-mono">p95</span>
          <span className="text-2xl font-mono text-orange-300">{latency.p95}</span>
        </div>
        <div className="bg-gray-950 rounded-lg p-3 text-center border border-gray-800 flex justify-between items-center px-6 border-b-2 border-b-rose-500/50">
          <span className="text-gray-500 font-mono">p99</span>
          <span className="text-2xl font-mono text-rose-400 font-bold">{latency.p99}</span>
        </div>
      </div>
    </div>
  );
}
