import { Loader2 } from 'lucide-react';

export const PageLoader = ({ message = 'Loading CivicPulse...' }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-400 tracking-wide">{message}</p>
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 bg-slate-800 rounded"></div>
        <div className="h-5 w-16 bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-6 w-3/4 bg-slate-800 rounded"></div>
      <div className="h-4 w-full bg-slate-800/70 rounded"></div>
      <div className="h-4 w-2/3 bg-slate-800/70 rounded"></div>
      <div className="pt-2 flex items-center justify-between border-t border-slate-800">
        <div className="h-4 w-28 bg-slate-800 rounded"></div>
        <div className="h-4 w-20 bg-slate-800 rounded"></div>
      </div>
    </div>
  );
};

export default PageLoader;
