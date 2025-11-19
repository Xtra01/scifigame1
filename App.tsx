
import React, { useState, useEffect, useRef } from 'react';
import { Rocket, Users, Play, RotateCw, Shield, ShieldCheck, ShieldAlert, Crosshair, Zap } from 'lucide-react';
import { GameState, GameMode, Resources, GameEvent, LogEntry, PlayerState, Resolution, ShipClass, MinigameConfig, MinigameResult, Choice, CombatDetails } from './types';
import { GeminiGameMaster } from './services/geminiService';
import { ResourceDisplay, ChoiceCard, GameLog, SystemCalibration, EndScreen, ShipSelectCard, InventoryStrip } from './components/GameUI';
import { Minigame } from './components/Minigame';
import { CinematicView } from './components/CinematicView';

// --- Ship Definitions ---
const SHIP_CLASSES: ShipClass[] = [
  {
    id: 'vanguard',
    name: 'U.N.S. Vanguard',
    description: 'A balanced cruiser designed for deep space exploration.',
    bonus: 'Standard defensive shielding.',
    initialResources: { hull: 100, energy: 100, crew: 50, credits: 1000 }
  },
  {
    id: 'ironclad',
    name: 'Ironclad Hauler',
    description: 'Heavily armored transport. Slow but durable.',
    bonus: '+20% Max Hull Integrity.',
    initialResources: { hull: 120, energy: 80, crew: 30, credits: 1500 }
  },
  {
    id: 'stealth',
    name: 'Void Stalker',
    description: 'Experimental stealth frigate. High tech, fragile hull.',
    bonus: 'Starts with advanced Energy reserves.',
    initialResources: { hull: 70, energy: 120, crew: 15, credits: 800 }
  }
];

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerState, setPlayerState] = useState<PlayerState>({
    resources: { hull: 100, energy: 100, crew: 50, credits: 1000 },
    inventory: [],
    turn: 1,
    gameMode: GameMode.SINGLE_PLAYER,
    currentPlayer: 1,
    shipClass: null,
    difficultyMultiplier: 1.0
  });
  
  // Visual Effects State
  const [screenShake, setScreenShake] = useState(false);

  // Content State
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [lastResolution, setLastResolution] = useState<Resolution | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [minigameConfig, setMinigameConfig] = useState<MinigameConfig | null>(null);
  const [combatDetails, setCombatDetails] = useState<CombatDetails | null>(null);
  
  // Services
  const gmRef = useRef<GeminiGameMaster>(new GeminiGameMaster());

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { turn: playerState.turn, message, type }]);
  };

  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
  };

  // Phase 1: Mode Selection
  const selectMode = (mode: GameMode) => {
    setPlayerState(prev => ({ ...prev, gameMode: mode }));
    setGameState(GameState.SHIP_SELECT);
  };

  // Phase 2: Ship Selection & Start
  const startGame = (ship: ShipClass) => {
    setPlayerState(prev => ({
      ...prev,
      resources: { ...ship.initialResources },
      shipClass: ship,
      inventory: [],
      turn: 1,
      currentPlayer: 1,
      difficultyMultiplier: 1.0
    }));
    setLogs([]);
    setLastResolution(null);
    setGameState(GameState.LOADING_EVENT);
  };

  // Win/Loss Check
  useEffect(() => {
    if (gameState === GameState.MENU || gameState === GameState.SHIP_SELECT || gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) return;

    const { hull, energy, crew } = playerState.resources;
    
    if (hull <= 0 || energy <= 0 || crew <= 0) {
      setGameState(GameState.GAME_OVER);
      return;
    }
    // Infinite Mode: No Victory condition by default, play until death
  }, [playerState.resources, playerState.turn, gameState]);

  // Event Generator
  useEffect(() => {
    if (gameState === GameState.LOADING_EVENT) {
      const fetchEvent = async () => {
        const evt = await gmRef.current.generateEvent(
          playerState.turn, 
          playerState.resources, 
          playerState.shipClass,
          playerState.inventory
        );
        setCurrentEvent(evt);
        // Smooth transition after event is ready
        // We rely on the player to finish "Calibration" or simply transition if event is ready
      };
      fetchEvent();
    }
  }, [gameState, playerState.turn]);

  // Interactive Loading Completion
  const handleCalibrationComplete = (bonusEnergy: number) => {
    if (currentEvent) {
      if (bonusEnergy > 0) {
        setPlayerState(prev => ({
          ...prev,
          resources: { ...prev.resources, energy: Math.min(150, prev.resources.energy + bonusEnergy) }
        }));
        addLog(`System Calibrated: +${bonusEnergy} Energy`, 'success');
      }
      setGameState(GameState.PLAYING_EVENT);
    }
  };

  // Resolution Logic
  const handleChoice = async (choiceId: string) => {
    if (!currentEvent) return;
    
    const choice = currentEvent.choices.find(c => c.id === choiceId);
    if (!choice) return;

    // Calculate Difficulty based on Turn count + Choice Risk
    const baseDifficulty = choice.risk === 'low' ? 1 : choice.risk === 'medium' ? 2 : choice.risk === 'high' ? 3 : 5;
    const scaledDifficulty = baseDifficulty + Math.floor(playerState.turn / 5); // Difficulty increases every 5 turns

    // Branch 1: Combat (Aggressive) -> Cinematic -> Minigame
    if (choice.type === 'aggressive') {
        setGameState(GameState.RESOLVING); // Temporary loading state
        // Fetch Combat Details from Gemini
        const details = await gmRef.current.generateCombatDetails(currentEvent.description);
        setCombatDetails(details);
        
        setMinigameConfig({ type: 'combat', difficulty: scaledDifficulty });
        setGameState(GameState.CINEMATIC);
        return;
    }

    // Branch 2: Evasive -> Minigame
    if (choice.type === 'evasive') {
        setMinigameConfig({ type: 'dodge', difficulty: scaledDifficulty });
        setGameState(GameState.MINIGAME);
        return;
    }

    // Branch 3: Scientific -> Hacking Minigame
    if (choice.type === 'scientific') {
        setMinigameConfig({ type: 'hacking', difficulty: scaledDifficulty });
        setGameState(GameState.MINIGAME);
        return;
    }

    // Branch 4: Diplomatic / Standard Narrative Resolution
    resolveStandard(choice);
  };

  const handleCinematicComplete = () => {
      setGameState(GameState.MINIGAME);
  };

  const resolveStandard = async (choice: Choice, minigameResult?: MinigameResult) => {
     if (!currentEvent) return;
     setGameState(GameState.RESOLVING);

     // If coming from minigame, outcome depends on score/damage
     if (minigameResult) {
        // Logic varies by game type
        if (minigameConfig?.type === 'combat' || minigameConfig?.type === 'dodge') {
             if (minigameResult.hullDamageTaken > 50) minigameResult.success = false;
        }
     }

     const resolution = await gmRef.current.resolveAction(
        currentEvent,
        choice,
        playerState.resources,
        playerState.shipClass
     );

     // Override resolution with minigame data if applicable
     if (minigameResult) {
         if (minigameConfig?.type === 'hacking') {
            if (!minigameResult.success) {
                resolution.success = false;
                resolution.outcomeText = "Decryption failed. The system locked you out. " + resolution.outcomeText;
                resolution.itemReward = null; // Lose reward on fail
            } else {
                resolution.outcomeText = "Access granted. System firewall breached. " + resolution.outcomeText;
            }
         } else {
             resolution.resourceChanges.hull = (resolution.resourceChanges.hull || 0) - minigameResult.hullDamageTaken;
             resolution.outcomeText = `${minigameResult.success ? "Tactical execution successful." : "Heavy resistance encountered."} ` + resolution.outcomeText;
         }
         
         if (minigameResult.hullDamageTaken > 20) triggerShake();
     }

     applyResolution(resolution);
  };

  const handleMinigameComplete = (result: MinigameResult) => {
     if (!currentEvent || !minigameConfig) return;
     
     // Find the choice that triggered this
     const choice = currentEvent.choices.find(c => 
        (minigameConfig.type === 'combat' && c.type === 'aggressive') || 
        (minigameConfig.type === 'dodge' && c.type === 'evasive') ||
        (minigameConfig.type === 'hacking' && c.type === 'scientific')
     );

     if (choice) {
         resolveStandard(choice, result);
     } else {
         setGameState(GameState.PLAYING_EVENT);
     }
  };

  const applyResolution = (resolution: Resolution) => {
    setPlayerState(prev => {
      const { hull, energy, crew, credits } = resolution.resourceChanges;
      
      if ((hull && hull < 0) || (crew && crew < 0)) {
        triggerShake();
      }

      const newResources = {
        hull: Math.min(150, Math.max(0, prev.resources.hull + (hull || 0))), 
        energy: Math.min(150, Math.max(0, prev.resources.energy + (energy || 0))),
        crew: Math.max(0, prev.resources.crew + (crew || 0)),
        credits: Math.max(0, prev.resources.credits + (credits || 0))
      };

      const newInventory = resolution.itemReward 
        ? [...prev.inventory, resolution.itemReward]
        : prev.inventory;

      const nextPlayer = prev.gameMode === GameMode.COOP_LOCAL ? (prev.currentPlayer === 1 ? 2 : 1) : 1;
      
      // Increase difficulty slightly every turn
      const newMultiplier = prev.difficultyMultiplier + 0.05;

      return {
        ...prev,
        resources: newResources,
        inventory: newInventory,
        turn: prev.turn + 1,
        currentPlayer: nextPlayer,
        difficultyMultiplier: newMultiplier
      };
    });

    setLastResolution(resolution);
    addLog(resolution.outcomeText, resolution.success ? 'success' : 'danger');
    if (resolution.itemReward) {
      addLog(`Acquired: ${resolution.itemReward.name}`, 'item');
    }
  };

  const nextTurn = () => {
    setLastResolution(null);
    setGameState(GameState.LOADING_EVENT);
  };

  // --- RENDERERS ---

  // 1. Menu
  if (gameState === GameState.MENU) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048&auto=format&fit=crop')] bg-cover bg-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
        <div className="relative z-10 flex flex-col items-center w-full max-w-2xl p-6 md:p-10 text-center glass-panel rounded-2xl border-space-accent/30 border shadow-[0_0_80px_rgba(102,252,241,0.15)]">
          <div className="mb-10 animate-float">
            <Rocket size={64} className="text-space-accent mx-auto mb-6 drop-shadow-[0_0_15px_rgba(102,252,241,0.8)]" />
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter drop-shadow-xl">NEBULA <span className="text-space-accent">NEXUS</span></h1>
            <p className="font-sans text-sm md:text-lg text-space-700 tracking-[0.5em] uppercase">Infinite AI Odyssey</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 w-full justify-center">
            <button 
              onClick={() => selectMode(GameMode.SINGLE_PLAYER)}
              className="flex items-center justify-center gap-3 px-8 py-5 bg-space-accent text-space-900 font-bold font-display rounded hover:bg-white hover:scale-105 transition-all shadow-lg shadow-space-accent/20"
            >
              <Play size={24} fill="currentColor" />
              SOLO COMMAND
            </button>
            <button 
              onClick={() => selectMode(GameMode.COOP_LOCAL)}
              className="flex items-center justify-center gap-3 px-8 py-5 bg-space-800/50 border-2 border-space-accent text-space-accent font-bold font-display rounded hover:bg-space-accent hover:text-space-900 hover:scale-105 transition-all"
            >
              <Users size={24} />
              CO-OP MODE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Ship Selection
  if (gameState === GameState.SHIP_SELECT) {
    return (
      <div className="min-h-screen bg-space-900 flex flex-col items-center justify-center p-4">
        <h2 className="font-display text-2xl md:text-4xl text-white mb-8 text-center">SELECT YOUR VESSEL</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          {SHIP_CLASSES.map(ship => (
            <ShipSelectCard key={ship.id} ship={ship} onSelect={() => startGame(ship)} />
          ))}
        </div>
        <button onClick={() => setGameState(GameState.MENU)} className="mt-12 text-gray-500 hover:text-white uppercase text-sm tracking-widest">Abort Launch</button>
      </div>
    );
  }

  // 3. Main Game Loop
  return (
    <div className={`min-h-screen bg-space-900 text-gray-100 font-sans relative overflow-hidden ${screenShake ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}>
      {/* Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-space-800 via-space-900 to-black -z-10"></div>
      <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] -z-10"></div>

      {/* Cinematic Overlay */}
      {gameState === GameState.CINEMATIC && combatDetails && (
          <CinematicView details={combatDetails} onComplete={handleCinematicComplete} />
      )}

      {/* Overlay */}
      {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
        <EndScreen 
          victory={gameState === GameState.VICTORY} 
          onRestart={() => setGameState(GameState.MENU)} 
          stats={playerState.resources}
          turnCount={playerState.turn}
        />
      )}

      <main className="container mx-auto max-w-4xl p-2 md:p-4 h-screen flex flex-col">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-2 border-b border-white/5 pb-2 shrink-0">
          <div>
            <h2 className="font-display text-lg md:text-2xl text-white tracking-wide">NEBULA NEXUS</h2>
            <p className="text-[10px] text-space-accent uppercase tracking-widest opacity-80">
              Sector {playerState.turn} / INFINITE
            </p>
          </div>
          {playerState.gameMode === GameMode.COOP_LOCAL && (
             <div className="px-2 py-1 md:px-4 md:py-2 rounded-full bg-space-accent/10 border border-space-accent/30 text-[10px] md:text-xs font-bold text-space-accent flex items-center gap-2 animate-pulse">
               <Users size={14} />
               P{playerState.currentPlayer}
             </div>
          )}
        </header>

        {/* HUD */}
        <div className="shrink-0">
            <ResourceDisplay resources={playerState.resources} shipClass={playerState.shipClass} />
            <InventoryStrip items={playerState.inventory} />
        </div>

        {/* Main Stage */}
        <div className="flex-grow relative flex flex-col justify-center min-h-0">
          
          {gameState === GameState.LOADING_EVENT && (
             <SystemCalibration 
                onSuccess={(bonus) => handleCalibrationComplete(bonus)} 
                isReady={!!currentEvent} 
             />
          )}

          {/* Minigame Mode */}
          {gameState === GameState.MINIGAME && minigameConfig && (
            <div className="animate-in zoom-in-95 duration-300 w-full h-full flex-grow">
               <Minigame config={minigameConfig} onComplete={handleMinigameComplete} />
            </div>
          )}

          {/* Narrative Event */}
          {(gameState === GameState.PLAYING_EVENT || gameState === GameState.RESOLVING) && currentEvent && (
            <div className="glass-panel p-4 md:p-10 rounded-2xl animate-in zoom-in-95 duration-500 relative shadow-2xl shadow-black/50 flex flex-col max-h-full overflow-y-auto">
              
              {/* Narrative View */}
              {!lastResolution ? (
                <>
                  <div className="flex flex-col gap-2 mb-4">
                     <span className="text-[10px] font-mono text-space-secondary border border-space-secondary/30 self-start px-2 py-0.5 rounded">
                       SIGNAL ID: {currentEvent.id.slice(-4).toUpperCase()}
                     </span>
                    <h2 className="font-display text-xl md:text-3xl text-white leading-tight drop-shadow-lg">{currentEvent.title}</h2>
                  </div>
                  
                  <p className="text-sm md:text-lg text-gray-200 leading-relaxed mb-6 border-l-2 border-space-accent/50 pl-4 py-2 bg-gradient-to-r from-white/5 to-transparent rounded-r-lg">
                    {currentEvent.description}
                  </p>

                  <div className="grid gap-3">
                    {currentEvent.choices.map((choice) => (
                      <ChoiceCard 
                        key={choice.id} 
                        choice={choice} 
                        onClick={() => handleChoice(choice.id)}
                        disabled={gameState === GameState.RESOLVING} 
                      />
                    ))}
                  </div>
                </>
              ) : (
                
                // Resolution View
                <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="mb-4 flex justify-center">
                    {lastResolution.success ? (
                       <div className="p-4 bg-green-500/10 rounded-full border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                         <ShieldCheck size={32} className="text-green-400" />
                       </div>
                    ) : (
                      <div className="p-4 bg-red-500/10 rounded-full border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                        <ShieldAlert size={32} className="text-red-500" />
                      </div>
                    )}
                  </div>

                  <h3 className={`font-display text-2xl mb-2 tracking-wide ${lastResolution.success ? 'text-green-400' : 'text-red-400'}`}>
                    {lastResolution.success ? 'SUCCESS' : 'FAILURE'}
                  </h3>
                  <p className="text-sm md:text-base text-gray-200 mb-6 max-w-xl mx-auto leading-relaxed">{lastResolution.outcomeText}</p>
                  
                  {/* Resource Delta */}
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto mb-6">
                    {Object.entries(lastResolution.resourceChanges).map(([key, val]) => {
                      const v = val as number;
                      if (v === 0) return null;
                      return (
                        <div key={key} className={`flex items-center justify-center gap-2 px-3 py-2 rounded bg-space-900/50 border ${v > 0 ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                          <span className="text-[10px] uppercase font-bold">{key}</span>
                          <span className="font-mono text-sm">{v > 0 ? '+' : ''}{v}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Loot Display */}
                  {lastResolution.itemReward && (
                    <div className="mb-6 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg max-w-md mx-auto flex items-center gap-4 animate-bounce-slow">
                      <div className="p-2 bg-purple-900 rounded text-purple-300">
                        <Shield size={18} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">Artifact Recovered</div>
                        <div className="text-white font-display text-base">{lastResolution.itemReward.name}</div>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={nextTurn}
                    className="group px-8 py-3 bg-space-accent text-space-900 font-bold rounded hover:bg-white transition-all flex items-center gap-2 mx-auto text-sm"
                  >
                    <RotateCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                    CONTINUE VOYAGE
                  </button>
                </div>
              )}

              {gameState === GameState.RESOLVING && !lastResolution && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center z-20">
                   <div className="flex flex-col items-center gap-4 text-space-accent">
                     <div className="animate-spin rounded-full h-10 w-10 border-4 border-space-accent border-t-transparent"></div>
                     <span className="font-display tracking-widest animate-pulse text-xs">CALCULATING...</span>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0">
           <GameLog logs={logs} />
        </div>

      </main>
      
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default App;
