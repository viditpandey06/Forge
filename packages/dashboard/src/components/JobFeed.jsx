import React from 'react';

const statusColors = {
  COMPLETED: 'text-emerald-400',
  FAILED: 'text-orange-400',
  DLQ: 'text-rose-400',
};

export function JobFeed({ events }) {
  if (!events || events.length === 0) {
    return <div className="text-gray-500 text-center py-8">Waiting for jobs...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-800">
      {events.map((evt, i) => (
        <div 
          key={`${evt.jobId}-${i}`} 
          className="bg-gray-950 p-3 rounded-md border border-gray-800 text-sm flex items-center justify-between shadow-sm animate-fade-in-down"
        >
          <div className="flex flex-col truncate w-3/5">
            <span className="font-mono text-gray-300 truncate">{evt.jobId}</span>
            <span className="text-gray-500 text-xs truncate">{evt.type}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`font-mono font-bold ${statusColors[evt.status] || 'text-gray-400'}`}>
              {evt.status}
            </span>
            {evt.execution_ms && (
              <span className="text-gray-500 font-mono text-xs">{evt.execution_ms}ms</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
