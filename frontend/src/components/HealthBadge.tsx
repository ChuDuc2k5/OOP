'use client';

import React, { useEffect, useState } from 'react';
import { healthApi, isMockMode } from '@/lib/api';
import { HealthCheck } from '@/lib/types';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function HealthBadge() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mockActive = isMockMode();

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await healthApi.check();
      setHealth(res);
    } catch (err) {
      setError('Không kết nối được backend (/api/health)');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs text-xs flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center space-x-2">
        <Activity className="w-4 h-4 text-emerald-600" />
        <span className="font-semibold text-slate-700">Trạng thái API:</span>

        {loading ? (
          <span className="text-slate-400 flex items-center space-x-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Đang kiểm tra...</span>
          </span>
        ) : error ? (
          <span className="text-rose-600 font-medium flex items-center space-x-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </span>
        ) : (
          <span className="text-emerald-700 font-medium flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {health?.service ? `${health.service}: ${health.status}` : health?.status || 'OK'}
            </span>
          </span>
        )}

        {mockActive && (
          <span className="bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full text-[11px] border border-indigo-200">
            MOCK MODE
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {health?.timestamp && (
          <span className="text-slate-400 hidden sm:inline">
            Cập nhật: {new Date(health.timestamp).toLocaleTimeString('vi-VN')}
          </span>
        )}
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline inline-flex items-center space-x-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Kiểm tra lại</span>
        </button>
      </div>
    </div>
  );
}
