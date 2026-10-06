import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';

interface MilestonePlaceholderProps {
  title: string;
  functionCode: string;
  milestone: 'M2 — Khách hàng (fe/m2-customer)' | 'M3 — Quản trị & Vận hành (fe/m3-backoffice)';
  description: string;
  backHref?: string;
  backLabel?: string;
}

export default function MilestonePlaceholder({
  title,
  functionCode,
  milestone,
  description,
  backHref = '/',
  backLabel = 'Quay lại',
}: MilestonePlaceholderProps) {
  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kế hoạch phát triển: {milestone}</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {title} ({functionCode})
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 max-w-md mx-auto">
          <p className="text-xs text-slate-400 mb-4">
            Khung nền tảng M1 đã sẵn sàng API Contract, Type definitions, CSRF wrapper và Mock layer. Chức năng chi tiết sẽ được hoàn thiện ở milestone tiếp theo.
          </p>
          <Link
            href={backHref}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
