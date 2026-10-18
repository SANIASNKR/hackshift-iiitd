import React from 'react';
import { Wifi, WifiOff, RefreshCw, Radio } from 'lucide-react';
import { useOfflineSync } from '../lib/useOfflineSync';

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = '',
  showDetails = false,
}) => {
  const { isOnline, queuedCount, isSyncing, syncNow, lastSyncedAt } = useOfflineSync();

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        !isOnline
          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          : queuedCount > 0
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
      } ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Offline ({queuedCount} queued)</span>
          </>
        ) : queuedCount > 0 ? (
          <>
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Syncing {queuedCount} items</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry Online</span>
          </>
        )}
      </div>

      {queuedCount > 0 && isOnline && (
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={isSyncing}
          className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
          title="Force telemetry sync"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      )}

      {showDetails && lastSyncedAt && (
        <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">
          Sync: {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
};
