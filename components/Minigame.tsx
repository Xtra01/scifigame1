
import React, { useEffect, useRef, useState } from 'react';
import { MinigameConfig, MinigameResult } from '../types';
import { Target, AlertTriangle, Wifi, Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, Zap, Keyboard } from 'lucide-react';

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  active: boolean;
  type: 'player' | 'enemy' | 'debris' | 'bullet';
  color: string;
}

export const Minigame: React.FC<{ config: MinigameConfig; onComplete: (result: MinigameResult) => void }> = ({ config, onComplete }) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timer, setTimer] = useState(15); // Survival time
  const [hullDamage, setHullDamage] = useState(0);
  const [hackScore, setHackScore] = useState(0); // For hacking game
  const [readyPhase, setReadyPhase] = useState(true); // New: Controls Overlay Phase
  
  // Aesthetic Config
  const isCombat = config.type === 'combat';
  const isHacking = config.type === 'hacking';
  
  const primaryColor = isCombat ? 'text-red-500' : isHacking ? 'text-blue-400' : 'text-yellow-400';
  const borderColor = isCombat ? 'border-red-500/50' : isHacking ? 'border-blue-500/50' : 'border-yellow-400/50';
  const glowShadow = isCombat ? 'shadow-[0_0_30px_rgba(239,68,68,0.2)]' : isHacking ? 'shadow-[0_0_30px_rgba(96,165,250,0.2)]' : 'shadow-[0_0_30px_rgba(250,204,21,0.2)]';

  // Virtual Input State for Mobile
  const mobileKeys = useRef({ w: false, a: false, s: false, d: false, space: false });

  // Ready Phase Timer
  useEffect(() => {
      const t = setTimeout(() => setReadyPhase(false), 3500); // Slightly longer to read instructions
      return () => clearTimeout(t);
  }, []);

  // Game Loop Refs
  const gameState = useRef({
    player: { x: 300, y: 200, vx: 0, vy: 0, size: 15, active: true, type: 'player', color: isCombat ? '#EF4444' : '#FACC15' } as Entity,
    enemies: [] as Entity[],
    bullets: [] as Entity[],
    score: 0,
    damage: 0,
    running: true,
    lastShot: 0,
    // Hacking Specific State
    hackBarY: 200,
    hackTargetY: 100,
    hackDirection: 1,
    hackTargetHeight: 100, // Easier start (was 60)
    hackSuccesses: 0,
    hackSpeed: 2 // Variable speed
  });

  // Canvas Resize Logic
  useEffect(() => {
      const resizeCanvas = () => {
          if (canvasContainerRef.current && canvasRef.current) {
              const { clientWidth, clientHeight } = canvasContainerRef.current;
              canvasRef.current.width = clientWidth;
              canvasRef.current.height = clientHeight;
          }
      };
      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();
      return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    if (readyPhase) return; // Don't start loop until ready

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Logical Dimensions (Keep game logic consistent regardless of screen size)
    const LOGIC_W = 600;
    const LOGIC_H = 400;

    // Input Handling
    const keys = { w: false, a: false, s: false, d: false, space: false };
    
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = true;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
      if (e.key === ' ' || e.key === 'Enter') triggerAction();
    };

    const handleUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = false;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
      if (e.key === ' ' || e.key === 'Enter') keys.space = false;
    };

    const triggerAction = () => {
        keys.space = true;
        // Hacking Interaction
        if (isHacking && gameState.current.running) {
            const g = gameState.current;
            // Check collision between bar and target
            if (Math.abs(g.hackBarY - g.hackTargetY) < g.hackTargetHeight / 2) {
                g.hackSuccesses++;
                setHackScore(g.hackSuccesses);
                // Move target randomly
                g.hackTargetY = 60 + Math.random() * (LOGIC_H - 120);
                
                // Increase Difficulty Curve
                g.hackTargetHeight = Math.max(30, g.hackTargetHeight - 10); // Shrink target
                g.hackSpeed += 1; // Increase speed
                
                // Win Condition for Hacking
                if (g.hackSuccesses >= 3) {
                    finishGame(true);
                }
            } else {
                // Penalty
                g.damage += 15; // Less punishing than before
                setHullDamage(g.damage);
                // Reset speed slightly on fail to help player recover rhythm
                g.hackSpeed = Math.max(2, g.hackSpeed - 0.5);
            }
        }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);

    // Helper to finish game
    const finishGame = (success: boolean) => {
        if (!gameState.current.running) return;
        gameState.current.running = false;
        onComplete({
            success,
            hullDamageTaken: gameState.current.damage,
            score: gameState.current.score
        });
    };

    // Spawner (Combat/Dodge only)
    const spawnInterval = setInterval(() => {
      if (!gameState.current.running || isHacking) return;
      
      const size = isCombat ? 20 : 30;
      const baseSpeed = isCombat ? 2 : 1.5; // Debris moves slower
      const speed = baseSpeed + (config.difficulty * 0.3); 
      
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * LOGIC_W; y = -30; }
      if (side === 1) { x = LOGIC_W + 30; y = Math.random() * LOGIC_H; }
      if (side === 2) { x = Math.random() * LOGIC_W; y = LOGIC_H + 30; }
      if (side === 3) { x = -30; y = Math.random() * LOGIC_H; }

      const angle = Math.atan2(gameState.current.player.y - y, gameState.current.player.x - x);
      
      gameState.current.enemies.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        active: true,
        type: isCombat ? 'enemy' : 'debris',
        color: isCombat ? '#EF4444' : '#6B7280' // Debris is gray
      });
    }, Math.max(isCombat ? 300 : 600, 1200 - (config.difficulty * 100))); // Dodge spawns slower

    // Timer Logic
    const timerInterval = setInterval(() => {
      if (!gameState.current.running) return;
      setTimer(prev => {
        if (prev <= 1) {
          finishGame(!isHacking); // Hacking fails on timeout, others survive
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // RENDER LOOP
    const render = (time: number) => {
      if (!gameState.current.running) return;
      
      // Determine Scale Factor
      const scaleX = canvas.width / LOGIC_W;
      const scaleY = canvas.height / LOGIC_H;

      // Clear with raw dimensions
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(11, 12, 16, 0.5)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save context and scale everything
      ctx.save();
      ctx.scale(scaleX, scaleY);
      
      // Grid (Logic coords)
      ctx.strokeStyle = isCombat ? 'rgba(239, 68, 68, 0.1)' : isHacking ? 'rgba(96, 165, 250, 0.1)' : 'rgba(250, 204, 21, 0.1)';
      ctx.lineWidth = 1;
      for(let i=0; i<LOGIC_W; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,LOGIC_H); ctx.stroke(); }
      for(let i=0; i<LOGIC_H; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(LOGIC_W,i); ctx.stroke(); }

      // --- HACKING MODE RENDER ---
      if (isHacking) {
          const g = gameState.current;
          
          // Update Bar
          g.hackBarY += g.hackSpeed * g.hackDirection;
          if (g.hackBarY > LOGIC_H - 10 || g.hackBarY < 10) g.hackDirection *= -1;

          // Draw Target Zone
          ctx.fillStyle = 'rgba(96, 165, 250, 0.2)';
          ctx.fillRect(0, g.hackTargetY - g.hackTargetHeight/2, LOGIC_W, g.hackTargetHeight);
          ctx.strokeStyle = '#60A5FA';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, g.hackTargetY - g.hackTargetHeight/2, LOGIC_W, g.hackTargetHeight);

          // Draw Moving Bar
          ctx.fillStyle = '#fff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
          ctx.fillRect(0, g.hackBarY - 3, LOGIC_W, 6);
          ctx.shadowBlur = 0;
          
          // Instructions
          ctx.fillStyle = '#60A5FA';
          ctx.font = '16px monospace';
          ctx.textAlign = 'center';
          ctx.fillText("PRESS [SPACE] TO LOCK FREQUENCY", LOGIC_W/2, LOGIC_H - 40);

      } else {
          // --- COMBAT/DODGE MODE RENDER ---
          
          // Update Player (Check both physical keys and mobile virtual keys)
          const p = gameState.current.player;
          const moveSpeed = 5; // Slightly faster movement
          if ((keys.w || mobileKeys.current.w) && p.y > p.size) p.y -= moveSpeed;
          if ((keys.s || mobileKeys.current.s) && p.y < LOGIC_H - p.size) p.y += moveSpeed;
          if ((keys.a || mobileKeys.current.a) && p.x > p.size) p.x -= moveSpeed;
          if ((keys.d || mobileKeys.current.d) && p.x < LOGIC_W - p.size) p.x += moveSpeed;

          // Shooting
          if (isCombat && (keys.space || mobileKeys.current.space) && time - gameState.current.lastShot > 250) {
            gameState.current.bullets.push({
              x: p.x, y: p.y, vx: 0, vy: -8, size: 4, active: true, type: 'bullet', color: '#66FCF1'
            });
            gameState.current.lastShot = time;
          }

          // Draw Player
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          // Simple Triangle Ship
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size, p.size);
          ctx.lineTo(-p.size, p.size);
          ctx.closePath();
          ctx.fillStyle = isCombat ? '#FFFFFF' : '#FACC15';
          ctx.shadowBlur = 15;
          ctx.shadowColor = p.color;
          ctx.fill();
          
          // Engine flame
          if (keys.w || keys.a || keys.s || keys.d) {
             ctx.beginPath();
             ctx.moveTo(-p.size/2, p.size);
             ctx.lineTo(0, p.size + (Math.random() * 10 + 5));
             ctx.lineTo(p.size/2, p.size);
             ctx.fillStyle = '#66FCF1';
             ctx.fill();
          }
          
          ctx.restore();

          // Entities
          gameState.current.enemies.forEach(e => {
            e.x += e.vx;
            e.y += e.vy;

            // Collision
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.size + e.size && e.active) {
              e.active = false;
              const dmg = e.type === 'debris' ? 5 : 10; // Debris does less damage
              gameState.current.damage += dmg;
              setHullDamage(gameState.current.damage);
            }

            if (e.active) {
                ctx.beginPath();
                if (e.type === 'enemy') {
                    ctx.moveTo(e.x, e.y - e.size);
                    ctx.lineTo(e.x + e.size, e.y);
                    ctx.lineTo(e.x, e.y + e.size);
                    ctx.lineTo(e.x - e.size, e.y);
                    ctx.fillStyle = e.color;
                } else {
                    // Debris (Rock shape)
                    ctx.moveTo(e.x - e.size, e.y - e.size/2);
                    ctx.lineTo(e.x + e.size, e.y - e.size);
                    ctx.lineTo(e.x + e.size/2, e.y + e.size);
                    ctx.lineTo(e.x - e.size, e.y + e.size);
                    ctx.fillStyle = e.color;
                }
                ctx.closePath();
                ctx.fill();
            }
          });

          // Bullets
          gameState.current.bullets.forEach(b => {
            b.y += b.vy;
            if (b.y < 0) b.active = false;

            gameState.current.enemies.forEach(e => {
                 // Only enemies can be shot, debris might just block or need more shots (keeping simple for now)
                 if (e.active && b.active && Math.hypot(b.x - e.x, b.y - e.y) < e.size + b.size) {
                     if (e.type === 'enemy') {
                        e.active = false;
                        b.active = false;
                        gameState.current.score += 1;
                     } else {
                        // Bullet hits debris - destroy bullet, maybe push debris? Just destroy bullet for now
                        b.active = false;
                     }
                 }
            });

            if (b.active) {
                ctx.fillStyle = b.color;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.size, 0, Math.PI*2);
                ctx.fill();
            }
          });

          // Cleanup off-screen
          gameState.current.enemies = gameState.current.enemies.filter(e => e.active && e.x > -50 && e.x < LOGIC_W + 50 && e.y > -50 && e.y < LOGIC_H + 50);
          gameState.current.bullets = gameState.current.bullets.filter(b => b.active);
      }

      ctx.restore(); // Restore scale
      animationFrameId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      clearInterval(spawnInterval);
      clearInterval(timerInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [config, onComplete, isCombat, isHacking, readyPhase]);

  // Mobile Controls Handlers
  const handleTouchStart = (key: 'w'|'a'|'s'|'d'|'space') => {
      if (key === 'space') {
          mobileKeys.current.space = true;
          // Also support hacking tap here
          if (isHacking) mobileKeys.current.space = true; 
      } else {
          mobileKeys.current[key] = true;
      }
  };
  
  const handleTouchEnd = (key: 'w'|'a'|'s'|'d'|'space') => {
      mobileKeys.current[key] = false;
  };


  return (
    <div ref={canvasContainerRef} className={`relative flex flex-col items-center justify-center w-full h-full min-h-[300px] bg-black/90 rounded-xl overflow-hidden border-2 ${borderColor} ${glowShadow} touch-none`}>
      
      {/* --- FLIGHT MANUAL OVERLAY --- */}
      {readyPhase && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-500 p-4 text-center">
              <h2 className="font-display text-2xl md:text-3xl text-white mb-4 md:mb-8 tracking-widest border-b border-white/20 pb-2">
                  {isHacking ? 'DECRYPTION MANUAL' : 'FLIGHT MANUAL'}
              </h2>
              
              <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center">
                  {!isHacking && (
                    <div className="flex flex-col items-center gap-3">
                        <Move size={48} className="text-space-accent opacity-80" />
                        <div className="flex gap-1">
                            <div className="px-2 py-1 border border-white/30 rounded text-xs font-mono">W</div>
                            <div className="px-2 py-1 border border-white/30 rounded text-xs font-mono">A</div>
                            <div className="px-2 py-1 border border-white/30 rounded text-xs font-mono">S</div>
                            <div className="px-2 py-1 border border-white/30 rounded text-xs font-mono">D</div>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 uppercase">THRUST VECTORS</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-3">
                      <Keyboard size={48} className="text-space-accent opacity-80" />
                      <div className="px-4 py-1 border border-white/30 rounded text-xs font-mono w-full text-center">SPACEBAR</div>
                      <span className="text-[10px] font-mono text-gray-400 uppercase">
                          {isHacking ? 'LOCK FREQUENCY' : 'PRIMARY WEAPON / BRAKE'}
                      </span>
                  </div>
              </div>
              
              <div className="mt-12 font-mono text-xs text-space-secondary animate-pulse">
                  SYSTEMS ONLINE... ENGAGING
              </div>
          </div>
      )}


      {/* --- HUD OVERLAY --- */}
      <div className="absolute inset-0 pointer-events-none z-30">
          {/* Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%] opacity-30"></div>
          
          {/* Header Status */}
          <div className="absolute top-4 left-0 right-0 flex justify-center items-center gap-2 md:gap-4">
               <div className={`flex items-center gap-2 font-display tracking-widest ${primaryColor} bg-black/60 px-2 py-1 md:px-4 border border-white/10 text-[10px] md:text-xs rounded`}>
                   {isCombat && <Target size={14} className="animate-pulse" />}
                   {isHacking && <Wifi size={14} className="animate-pulse" />}
                   {!isCombat && !isHacking && <AlertTriangle size={14} className="animate-pulse" />}
                   
                   <span className="animate-pulse">
                       {isCombat ? 'COMBAT PROTOCOL' : isHacking ? 'DECRYPTION PROTOCOL' : 'EVASIVE MANEUVERS'}
                   </span>
               </div>
          </div>
      </div>

      {/* --- STATUS BARS --- */}
      <div className="absolute top-16 left-4 right-4 md:left-12 md:right-12 flex justify-between z-40 pointer-events-none">
        {/* Left Bar: Health or Progress */}
        <div className="flex flex-col w-1/3">
            <span className="text-[8px] text-gray-500 uppercase mb-1">{isHacking ? 'SIGNAL NOISE' : 'SHIELD INTEGRITY'}</span>
            <div className="h-1.5 md:h-2 w-full bg-gray-900 skew-x-[-20deg] overflow-hidden border border-white/10">
                <div 
                    className={`h-full transition-all duration-200 ${isCombat ? 'bg-red-500' : isHacking ? 'bg-red-400' : 'bg-yellow-400'}`} 
                    style={{ width: `${Math.max(0, 100 - hullDamage)}%` }}
                ></div>
            </div>
        </div>

        {/* Center: Hack Progress Specific */}
        {isHacking && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                <span className="text-[8px] text-blue-400 uppercase tracking-wider">DECRYPTION KEYS</span>
                <div className="flex gap-2">
                    {[0,1,2].map(i => (
                        <div key={i} className={`w-3 h-3 md:w-4 md:h-4 rounded-full border ${i < hackScore ? 'bg-blue-400 border-blue-200 shadow-[0_0_10px_#60A5FA]' : 'bg-transparent border-gray-600'}`}></div>
                    ))}
                </div>
            </div>
        )}

        {/* Right Bar: Timer */}
        <div className="flex flex-col w-1/3 items-end">
            <span className="text-[8px] text-gray-500 uppercase mb-1">TIME TO FAILURE</span>
            <div className="h-1.5 md:h-2 w-full bg-gray-900 skew-x-[20deg] overflow-hidden border border-white/10">
                <div 
                    className="h-full bg-white transition-all duration-1000 ease-linear" 
                    style={{ width: `${(timer / 15) * 100}%` }}
                ></div>
            </div>
        </div>
      </div>
      
      {/* Mobile Controls Layer */}
      <div className="absolute bottom-4 left-4 right-4 z-50 flex justify-between md:hidden">
          {/* D-Pad */}
          {!isHacking && (
            <div className="grid grid-cols-3 gap-1">
                <div></div>
                <button 
                    className="w-12 h-12 bg-white/10 rounded border border-white/20 flex items-center justify-center active:bg-white/30"
                    onTouchStart={() => handleTouchStart('w')} onTouchEnd={() => handleTouchEnd('w')}
                ><ArrowUp size={20} /></button>
                <div></div>
                <button 
                    className="w-12 h-12 bg-white/10 rounded border border-white/20 flex items-center justify-center active:bg-white/30"
                    onTouchStart={() => handleTouchStart('a')} onTouchEnd={() => handleTouchEnd('a')}
                ><ArrowLeft size={20} /></button>
                <button 
                    className="w-12 h-12 bg-white/10 rounded border border-white/20 flex items-center justify-center active:bg-white/30"
                    onTouchStart={() => handleTouchStart('s')} onTouchEnd={() => handleTouchEnd('s')}
                ><ArrowDown size={20} /></button>
                <button 
                    className="w-12 h-12 bg-white/10 rounded border border-white/20 flex items-center justify-center active:bg-white/30"
                    onTouchStart={() => handleTouchStart('d')} onTouchEnd={() => handleTouchEnd('d')}
                ><ArrowRight size={20} /></button>
            </div>
          )}
          
          {/* Action Button */}
          <div className={`flex items-end ${isHacking ? 'w-full justify-center' : ''}`}>
              <button 
                  className={`
                    bg-white/10 rounded-full border-2 border-white/20 flex items-center justify-center active:bg-white/40 active:scale-95 transition-transform backdrop-blur-sm
                    ${isHacking ? 'w-24 h-24' : 'w-20 h-20'}
                  `}
                  onTouchStart={() => handleTouchStart('space')} onTouchEnd={() => handleTouchEnd('space')}
                  onClick={() => isHacking && handleTouchStart('space')} 
              >
                  {isHacking ? <Wifi size={32} className="animate-pulse" /> : isCombat ? <Crosshair size={28} /> : <Zap size={28} />}
              </button>
          </div>
      </div>

      {/* The Game Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-cover opacity-80"
      />
    </div>
  );
};
