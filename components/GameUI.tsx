
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, Users, DollarSign, ShieldAlert, ShieldCheck, Skull, Package, Cpu, Crosshair, Anchor, Settings, CheckCircle } from 'lucide-react';
import { Resources, Choice, LogEntry, Item, ShipClass } from '../types';

// --- Resource Bar ---
export const ResourceDisplay: React.FC<{ resources: Resources; shipClass: ShipClass | null }> = ({ resources, shipClass }) => {
  const getHealthColor = (val: number) => val < 30 ? 'text-red-500 animate-pulse' : val < 60 ? 'text-yellow-400' : 'text-space-accent';

  return (
    <div className="glass-panel rounded-xl w-full mb-4 md:mb-6 shadow-lg shadow-space-accent/10 relative overflow-hidden">
      {/* Ship Identity Strip */}
      {shipClass && (
        <div className="bg-space-800/80 border-b border-white/10 px-3 py-1 md:px-4 md:py-2 flex justify-between items-center">
          <span className="text-[10px] md:text-xs font-display text-gray-400 tracking-[0.2em] uppercase truncate max-w-[200px]">Class: <span className="text-white">{shipClass.name}</span></span>
          <span className="text-[9px] md:text-[10px] text-space-secondary hidden sm:block">{shipClass.bonus}</span>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3 group relative">
          <Activity size={18} className={`transition-colors duration-300 ${getHealthColor(resources.hull)}`} />
          <div className="flex flex-col w-full">
            <span className="text-[8px] md:text-[10px] text-space-700 uppercase tracking-widest">Hull Integrity</span>
            <div className="w-full h-1.5 md:h-2 bg-space-900 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full transition-all duration-500 ${resources.hull < 30 ? 'bg-red-500' : 'bg-space-accent'}`} 
                  style={{ width: `${Math.min(100, resources.hull)}%` }}
                />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <Zap size={18} className="text-yellow-300 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-space-700 uppercase tracking-widest">Energy</span>
            <span className="font-display text-lg md:text-xl text-white">{resources.energy}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Users size={18} className="text-blue-400" />
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-space-700 uppercase tracking-widest">Crew</span>
            <span className="font-display text-lg md:text-xl text-white">{resources.crew}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <DollarSign size={18} className="text-green-400" />
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-space-700 uppercase tracking-widest">Credits</span>
            <span className="font-display text-lg md:text-xl text-white">{resources.credits}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Inventory Row ---
export const InventoryStrip: React.FC<{ items: Item[] }> = ({ items }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((item) => (
        <div key={item.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-1 bg-space-800/60 border border-space-accent/30 rounded text-xs text-space-accent whitespace-nowrap animate-in slide-in-from-bottom-2">
          <Package size={12} />
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  );
};

// --- Choice Button ---
interface ChoiceCardProps {
  choice: Choice;
  onClick: () => void;
  disabled: boolean;
}

export const ChoiceCard: React.FC<ChoiceCardProps> = ({ choice, onClick, disabled }) => {
  const borderColor = 
    choice.type === 'aggressive' ? 'border-red-500 hover:bg-red-950/40' :
    choice.type === 'scientific' ? 'border-blue-500 hover:bg-blue-950/40' :
    choice.type === 'diplomatic' ? 'border-green-500 hover:bg-green-950/40' :
    'border-yellow-500 hover:bg-yellow-950/40';

  const RiskIcon = choice.risk === 'high' || choice.risk === 'extreme' ? ShieldAlert : ShieldCheck;
  const riskColor = choice.risk === 'low' ? 'text-green-400' : choice.risk === 'medium' ? 'text-yellow-400' : 'text-red-500';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full text-left p-3 md:p-5 rounded-lg border-l-4 transition-all duration-200 group
        ${borderColor} bg-space-900/40 backdrop-blur-md
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:translate-x-1 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)] cursor-pointer active:scale-[0.99]'}
      `}
    >
      <div className="flex justify-between items-center mb-1 md:mb-2">
        <div className="flex items-center gap-2">
          {choice.type === 'aggressive' && <Crosshair size={14} className="text-red-400" />}
          {choice.type === 'scientific' && <Cpu size={14} className="text-blue-400" />}
          {choice.type === 'diplomatic' && <Users size={14} className="text-green-400" />}
          {choice.type === 'evasive' && <Zap size={14} className="text-yellow-400" />}
          <span className="text-[10px] md:text-xs uppercase tracking-widest text-gray-400 font-bold">{choice.type}</span>
        </div>
        <div className={`flex items-center text-[10px] md:text-xs gap-1 font-mono ${riskColor}`}>
          <RiskIcon size={14} />
          <span className="uppercase">{choice.risk} Risk</span>
        </div>
      </div>
      <h3 className="font-sans text-sm md:text-lg text-gray-100 group-hover:text-white transition-colors leading-tight">{choice.text}</h3>
    </button>
  );
};

// --- Game Log ---
export const GameLog: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-32 md:h-48 w-full bg-black/30 border border-white/5 rounded-xl p-3 md:p-4 overflow-y-auto font-mono text-sm mt-4 md:mt-6 scrollbar-thin">
      <div className="space-y-2 md:space-y-3">
        {logs.length === 0 && <span className="text-gray-700 italic text-xs">System initialized... awaiting input.</span>}
        {logs.map((log, idx) => (
          <div key={idx} className={`
            ${log.type === 'danger' ? 'text-red-400 bg-red-900/10 border-l-red-500' : 
              log.type === 'success' ? 'text-green-400 border-l-green-500' : 
              log.type === 'item' ? 'text-purple-400 border-l-purple-500 bg-purple-900/10' :
              log.type === 'warning' ? 'text-yellow-400 border-l-yellow-500' :
              'text-space-700 border-l-space-700'}
            border-l-2 pl-2 md:pl-3 py-1 text-[10px] md:text-sm transition-all animate-in fade-in
          `}>
            <span className="opacity-30 mr-2 md:mr-3 hidden sm:inline">[{log.turn < 10 ? `0${log.turn}` : log.turn}]</span>
            {log.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

// --- Interactive Loading State (System Calibration) ---
export const SystemCalibration: React.FC<{ onSuccess: (bonus: number) => void; isReady: boolean }> = ({ onSuccess, isReady }) => {
    const [barPosition, setBarPosition] = useState(0);
    const [direction, setDirection] = useState(1);
    const [targetZone, setTargetZone] = useState({ start: 35, width: 30 }); // Easier start
    const [calibrated, setCalibrated] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [bonus, setBonus] = useState(0);
    const reqRef = useRef<number>(0);

    // Spacebar Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                performAction();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [calibrated, barPosition, targetZone, isReady, attempts]); // Deps for closure

    // Loop
    useEffect(() => {
        if (calibrated) return;
        
        const animate = () => {
            setBarPosition(prev => {
                // Speed 1.5 instead of 2
                let next = prev + (1.5 * direction);
                if (next > 100 || next < 0) {
                    setDirection(d => d * -1);
                    next = Math.min(100, Math.max(0, next));
                }
                return next;
            });
            reqRef.current = requestAnimationFrame(animate);
        };
        reqRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(reqRef.current);
    }, [calibrated, direction]);

    const performAction = () => {
        if (calibrated) {
            if (isReady) onSuccess(bonus);
            return;
        }

        if (barPosition >= targetZone.start && barPosition <= targetZone.start + targetZone.width) {
            // Success
            setCalibrated(true);
            setBonus(5);
        } else {
            // Fail - retry logic
            setAttempts(p => p + 1);
            // Gets harder but resets position randomly
            setTargetZone({ start: Math.random() * 80, width: Math.max(10, 30 - (attempts * 5)) }); 
            if (attempts > 2) {
                // Auto-fail after too many tries but continue game
                setCalibrated(true);
                setBonus(0);
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 w-full cursor-pointer min-h-[250px]" onClick={performAction}>
            <h3 className="font-display text-space-accent tracking-[0.2em] text-xs md:text-sm animate-pulse mb-4 text-center">
                {calibrated ? (isReady ? "SYSTEM OPTIMIZED - PRESS SPACE" : "CALIBRATION COMPLETE... STAND BY") : "MANUAL CALIBRATION REQUIRED"}
            </h3>

            {/* The Bar Game */}
            <div className="relative w-full max-w-md h-8 md:h-12 bg-space-900 border border-space-secondary/30 rounded overflow-hidden touch-none">
                 {/* Target Zone */}
                 <div 
                    className={`absolute top-0 bottom-0 bg-space-accent/20 border-l border-r border-space-accent/50 transition-all duration-300`}
                    style={{ left: `${targetZone.start}%`, width: `${targetZone.width}%` }}
                 ></div>

                 {/* Moving Indicator */}
                 <div 
                    className={`absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] transition-none`}
                    style={{ left: `${barPosition}%` }}
                 ></div>
            </div>
            
            <div className="text-center text-[10px] md:text-xs text-gray-500 mt-4 font-mono">
                {calibrated ? (
                    <div className="flex items-center gap-2 text-green-400 justify-center">
                        <CheckCircle size={14} />
                        ENERGY OUTPUT OPTIMIZED (+{bonus})
                    </div>
                ) : (
                    "PRESS [SPACE] OR TAP IN TARGET ZONE"
                )}
            </div>

            {!isReady && calibrated && (
                <div className="flex items-center gap-2 text-xs text-space-secondary animate-pulse mt-8">
                    <Settings className="animate-spin" size={12} />
                    GENERATING QUANTUM EVENT...
                </div>
            )}
        </div>
    );
};


// --- Ship Selection Card ---
export const ShipSelectCard: React.FC<{ ship: ShipClass; onSelect: () => void }> = ({ ship, onSelect }) => (
  <button 
    onClick={onSelect}
    className="flex flex-col items-start p-6 glass-panel rounded-xl hover:bg-space-800 hover:border-space-accent transition-all hover:-translate-y-1 group w-full text-left"
  >
    <div className="flex justify-between w-full mb-2">
      <h3 className="font-display text-xl text-white group-hover:text-space-accent">{ship.name}</h3>
      <Anchor size={20} className="text-gray-500 group-hover:text-space-accent" />
    </div>
    <p className="text-sm text-gray-400 mb-4 h-10 line-clamp-2">{ship.description}</p>
    <div className="w-full border-t border-white/10 pt-3 mt-auto">
      <span className="text-xs text-space-secondary uppercase tracking-wider font-bold">Bonus Effect</span>
      <p className="text-sm text-gray-300">{ship.bonus}</p>
    </div>
  </button>
);

// --- End Screen ---
export const EndScreen: React.FC<{ victory: boolean; onRestart: () => void; stats: Resources; turnCount?: number }> = ({ victory, onRestart, stats, turnCount }) => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 text-center animate-in fade-in duration-1000 overflow-y-auto">
    <div className="relative mb-6">
      <div className={`absolute inset-0 blur-2xl opacity-50 ${victory ? 'bg-green-500' : 'bg-red-600'}`}></div>
      {victory ? (
        <ShieldCheck size={80} className="relative text-green-400" />
      ) : (
        <Skull size={80} className="relative text-red-500" />
      )}
    </div>
    
    <h1 className={`font-display text-4xl md:text-6xl mb-2 ${victory ? 'text-white drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]'}`}>
      {victory ? 'MISSION COMPLETE' : 'CRITICAL FAILURE'}
    </h1>
    
    <div className="w-full max-w-md bg-white/5 rounded-lg p-4 md:p-6 mb-6 border border-white/10">
      <h3 className="text-gray-400 uppercase tracking-widest text-xs mb-4 border-b border-white/10 pb-2">Final Voyage Report</h3>
      <div className="grid grid-cols-2 gap-3 text-sm font-mono">
        <div className="flex justify-between col-span-2 bg-white/5 p-2 rounded">
             <span>SECTORS CLEARED:</span> 
             <span className="text-space-accent font-bold text-lg">{turnCount || 0}</span>
        </div>
        <div className="flex justify-between"><span>Credits:</span> <span className="text-yellow-400">{stats.credits}</span></div>
        <div className="flex justify-between"><span>Survivors:</span> <span className="text-blue-400">{stats.crew}</span></div>
        <div className="flex justify-between"><span>Hull:</span> <span className="text-red-400">{stats.hull}%</span></div>
        <div className="flex justify-between"><span>Energy:</span> <span className="text-yellow-200">{stats.energy}%</span></div>
      </div>
    </div>

    <button 
      onClick={onRestart}
      className="px-8 py-3 md:px-10 md:py-4 bg-space-accent text-space-900 font-bold font-display tracking-widest rounded hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(102,252,241,0.4)] text-sm md:text-base"
    >
      INITIATE NEW RUN
    </button>
  </div>
);
