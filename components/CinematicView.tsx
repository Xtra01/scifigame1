
import React, { useEffect, useRef, useState } from 'react';
import { CombatDetails } from '../types';
import { Target, AlertTriangle, Shield, Cpu, Wifi, Lock, Activity, Radar } from 'lucide-react';

// --- Decryption Text Component ---
const DecryptText: React.FC<{ text: string; reveal: boolean; className?: string }> = ({ text, reveal, className }) => {
  const [display, setDisplay] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';

  useEffect(() => {
    let iter = 0;
    if (!reveal) {
        setDisplay('');
        return;
    }
    const interval = setInterval(() => {
      setDisplay(text.split('').map((char, index) => {
        if (index < iter) return char;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(''));
      
      if (iter >= text.length) clearInterval(interval);
      iter += 1/3; // Speed of reveal
    }, 30);
    return () => clearInterval(interval);
  }, [text, reveal]);

  return <span className={`font-mono ${className}`}>{display}</span>;
};

export const CinematicView: React.FC<{ details: CombatDetails; onComplete: () => void }> = ({ details, onComplete }) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0); // 0: Init, 1: Scan, 2: Analyze, 3: Locked
  const [logs, setLogs] = useState<string[]>([]);

  // Determine Theme Color based on threat
  const getThemeColor = () => {
      switch(details.threatLevel) {
          case 'CRITICAL': return '#EF4444'; // Red
          case 'EXTREME': return '#9333EA'; // Purple
          case 'MODERATE': return '#F59E0B'; // Orange
          default: return '#66FCF1'; // Cyan
      }
  };
  const themeColor = getThemeColor();

  // Sequence Controller
  useEffect(() => {
    const timeouts = [
      setTimeout(() => { setPhase(1); addLog('LIDAR SYSTEM: INITIALIZED'); }, 500),
      setTimeout(() => { setPhase(2); addLog('ACOUSTIC SIGNATURE DETECTED'); }, 2000),
      setTimeout(() => { addLog(`THREAT LEVEL: ${details.threatLevel}`); }, 3000),
      setTimeout(() => { setPhase(3); addLog('FIRING SOLUTION COMPUTED'); }, 5000),
      setTimeout(onComplete, 7000)
    ];
    return () => timeouts.forEach(clearTimeout);
  }, [onComplete, details.threatLevel]);

  // Log System
  const addLog = (msg: string) => {
      setLogs(prev => [`> ${msg}`, ...prev.slice(0, 6)]);
  };

  // Radar Resize
  useEffect(() => {
      const resizeCanvas = () => {
          if (canvasContainerRef.current && canvasRef.current) {
              canvasRef.current.width = canvasContainerRef.current.clientWidth;
              canvasRef.current.height = canvasContainerRef.current.clientHeight;
          }
      };
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();
      return () => window.removeEventListener('resize', resizeCanvas);
  }, []);


  // Radar / LIDAR Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let animationId: number;
    // Get dimensions from canvas attr, which are set by resize listener
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 20;

    // Blips (Random noise that resolves to one target)
    const blips = Array.from({length: 5}).map(() => ({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * maxRadius,
        strength: 0
    }));
    
    // The main target position
    const targetBlip = { angle: Math.PI * 1.5, dist: maxRadius * 0.6, strength: 0 };

    const render = () => {
      ctx.clearRect(0,0,width,height);
      // Fade out
      ctx.fillStyle = 'rgba(0, 0, 5, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Concentric circles
      for (let r = 0; r < maxRadius; r += 50) {
          ctx.arc(centerX, centerY, r, 0, Math.PI*2);
      }
      // Crosshairs
      ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
      ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
      ctx.stroke();

      // Radar Sweep Arm
      const angle = frame * 0.05;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
      
      const gradient = ctx.createLinearGradient(centerX, centerY, centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, themeColor);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Blips logic
      const drawBlip = (b: {angle: number, dist: number, strength: number}, isTarget: boolean) => {
          // Check if arm passed this blip recently
          const angleDiff = Math.abs(angle % (Math.PI*2) - b.angle);
          if (angleDiff < 0.1) {
              b.strength = 1;
          }

          if (b.strength > 0.01) {
              const bx = centerX + Math.cos(b.angle) * b.dist;
              const by = centerY + Math.sin(b.angle) * b.dist;
              
              ctx.beginPath();
              ctx.arc(bx, by, isTarget ? 8 : 4, 0, Math.PI*2);
              ctx.fillStyle = isTarget ? themeColor : `rgba(255, 255, 255, ${b.strength * 0.5})`;
              ctx.fill();
              
              // Echo rings for target
              if (isTarget && phase >= 2) {
                  ctx.strokeStyle = themeColor;
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.arc(bx, by, 15 + (1-b.strength)*20, 0, Math.PI*2);
                  ctx.stroke();
              }

              b.strength *= 0.95; // Decay
          }
      };

      if (phase < 2) {
          // Show random noise blips
          blips.forEach(b => drawBlip(b, false));
      } else {
          // Show main target
          drawBlip(targetBlip, true);
      }

      // Noise / Static Overlay
      for(let i=0; i<20; i++) {
          const nx = Math.random() * width;
          const ny = Math.random() * height;
          ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.1})`;
          ctx.fillRect(nx, ny, 2, 2);
      }

      frame++;
      animationId = requestAnimationFrame(render);
    };
    
    render();
    return () => cancelAnimationFrame(animationId);
  }, [phase, details, themeColor]);

  return (
    <div className="absolute inset-0 z-50 bg-black flex items-center justify-center overflow-hidden font-display text-white select-none">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#000_100%)] z-10"></div>

      {/* Main Container */}
      <div className="relative w-full max-w-6xl h-full md:h-[85vh] grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-2 md:p-4 z-20 overflow-y-auto md:overflow-hidden">
        
        {/* Left Column: Telemetry (Hidden on very small screens) */}
        <div className="hidden md:flex md:col-span-3 flex-col gap-4 order-2 md:order-1">
            <div className="glass-panel p-4 border-l-2 border-gray-700 flex flex-col gap-2 h-full justify-end">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Activity size={10} /> Sensor Array
                </div>
                
                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">AZIMUTH</span>
                    <span className="text-space-accent">{(Math.random()*360).toFixed(1)}°</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">ELEVATION</span>
                    <span className="text-space-accent">{(Math.random()*180 - 90).toFixed(1)}°</span>
                </div>
            </div>
        </div>

        {/* Center Column: Radar View */}
        <div className="col-span-1 md:col-span-6 relative order-1 md:order-2 flex flex-col min-h-[300px]">
            
            {/* Top Bracket */}
            <div className="flex justify-between items-end mb-2">
                <div className="flex gap-2 items-center">
                   <Radar size={16} className={`animate-spin ${phase >= 3 ? 'text-red-500' : 'text-space-accent'}`} style={{ animationDuration: '3s' }} />
                   <span className="text-[10px] md:text-xs tracking-[0.3em] text-white/80">LIDAR.ACTIVE</span>
                </div>
                <div className="text-[8px] md:text-[10px] font-mono text-gray-600">SCAN_MODE: LONG_RANGE</div>
            </div>

            <div ref={canvasContainerRef} className="relative flex-grow border border-white/10 bg-black rounded-xl overflow-hidden shadow-2xl shadow-black/80 aspect-square md:aspect-auto">
                {/* Canvas */}
                <canvas ref={canvasRef} className="w-full h-full object-cover opacity-90" />
                
                {/* Center Reticle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-32 h-32 md:w-64 md:h-64 border border-white/5 rounded-full"></div>
                    <div className="w-16 h-16 md:w-32 md:h-32 border border-white/10 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                {/* Overlay Text Info */}
                {phase >= 2 && (
                     <div className="absolute bottom-4 right-4 md:bottom-10 md:right-10 text-right pointer-events-none">
                        <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest mb-1">Target Identified</div>
                        <div className="text-lg md:text-xl font-bold tracking-wider text-white" style={{ color: themeColor }}>
                            <DecryptText text={details.enemyName} reveal={true} />
                        </div>
                         <div className="text-[10px] md:text-xs font-mono text-gray-500 mt-1">
                             <DecryptText text={details.enemyClass} reveal={true} />
                         </div>
                    </div>
                )}

                {/* Locked Warning */}
                {phase >= 3 && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-2 py-1 md:px-3 text-[10px] md:text-xs font-bold tracking-[0.2em] border border-red-500 animate-pulse rounded whitespace-nowrap">
                        FIRING LOCK ESTABLISHED
                    </div>
                )}
            </div>
        </div>

        {/* Right Column: Analysis & Logs */}
        <div className="col-span-1 md:col-span-3 flex flex-col gap-2 md:gap-4 order-3">
             {/* Analysis Block */}
             <div className={`p-3 md:p-4 border border-white/10 bg-space-900/50 rounded transition-all duration-500 ${phase >= 2 ? 'opacity-100' : 'opacity-20 blur-sm'}`}>
                <div className="flex justify-between items-center mb-2 md:mb-4">
                    <h3 className="text-[10px] text-gray-400 uppercase tracking-wider">Tactical Analysis</h3>
                    <Lock size={12} className={phase >= 3 ? 'text-red-500' : 'text-gray-600'} />
                </div>
                
                <div className="space-y-2 md:space-y-4">
                    <div>
                         <div className="text-[8px] md:text-[10px] text-gray-600 mb-1">THREAT ASSESSMENT</div>
                         <div className={`text-sm md:text-lg font-bold ${details.threatLevel === 'CRITICAL' || details.threatLevel === 'EXTREME' ? 'text-red-500' : 'text-yellow-400'}`}>
                             {details.threatLevel}
                         </div>
                    </div>
                    <div>
                         <div className="text-[8px] md:text-[10px] text-gray-600 mb-1">VULNERABILITY</div>
                         <div className="text-xs md:text-sm text-space-secondary font-mono">
                             <DecryptText text={details.weakness} reveal={phase >= 2} />
                         </div>
                    </div>
                </div>
             </div>

             {/* Console Logs */}
             <div className="flex-grow bg-black/60 border border-white/5 p-3 md:p-4 font-mono text-[10px] overflow-hidden flex flex-col justify-end rounded h-32 md:h-auto">
                 <div className="text-gray-600 border-b border-gray-800 pb-1 mb-2">COMM_LOG_01</div>
                 <div className="flex flex-col gap-1">
                     {logs.map((log, i) => (
                         <div key={i} className="text-space-secondary/80 opacity-80">
                             {log}
                         </div>
                     ))}
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};
