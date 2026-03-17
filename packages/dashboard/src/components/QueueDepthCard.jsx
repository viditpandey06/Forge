import React from 'react';

export function QueueDepthCard({ depth }) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg flex flex-col justify-between">
      <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Queue Depth</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-emerald-400 font-medium tracking-wide">HIGH</span>
          <span className="text-2xl font-mono text-emerald-300">{depth.high}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-blue-400 font-medium tracking-wide">DEFAULT</span>
          <span className="text-2xl font-mono text-blue-300">{depth.default}</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-800">
          <span className="text-rose-400 font-medium tracking-wide">DLQ</span>
          <span className="text-2xl font-mono text-rose-300">{depth.dlq}</span>
        </div>
      </div>
    </div>
  );
}
