'use client';

import { useState, useEffect } from 'react';

interface Advancement {
  faction: string;
  name: string;
  ability: string;
  isStartingAdvancement: boolean;
  effects: {
    ignoreShieldsOn6?: boolean;
    doublesKillOnMiss?: boolean;
    firstStrike?: boolean;
  };
}

interface Fleet {
  faction: string;
  id: string;
  name: string;
  maxShips: number;
  minShips: number;
  ability: string;
  effects: {
    productionOnKill?: number;
    rerollOnes?: boolean;
  };
}

interface FleetAllocation {
  fleet: Fleet;
  shipCount: number;
}

interface PlayerSetup {
  faction: string;
  weapons: number;
  shields: number;
  advancements: Advancement[];
  fleets: FleetAllocation[];
  individualShips: number;
  hasStarbase: boolean;
}

interface BattleResult {
  attackerWins: number;
  defenderWins: number;
  totalBattles: number;
}

// Simulate a single space battle based on Star Trek Ascendancy rules
function simulateBattle(attacker: PlayerSetup, defender: PlayerSetup): 'attacker' | 'defender' {
  let attackerShips = attacker.fleets.reduce((total, fleet) => total + fleet.shipCount, 0) + attacker.individualShips;
  let defenderShips = defender.fleets.reduce((total, fleet) => total + fleet.shipCount, 0) + defender.individualShips;
  
  // Check for first strike from advancements
  const attackerFirstStrike = attacker.advancements.some(adv => adv.effects.firstStrike);
  const defenderFirstStrike = defender.advancements.some(adv => adv.effects.firstStrike);
  const firstStrike = attackerFirstStrike && !defenderFirstStrike ? 'attacker' : 
                     defenderFirstStrike && !attackerFirstStrike ? 'defender' : null;
  
  // Calculate hit requirements
  const attackerHitRoll = Math.max(1, 5 - attacker.weapons) + defender.shields;
  const defenderHitRoll = Math.max(1, 5 - defender.weapons) + attacker.shields;
  
  // Check for invulnerable shields (but account for advancements that bypass shields)
  const attackerHasIgnoreShieldsOn6 = attacker.advancements.some(adv => adv.effects.ignoreShieldsOn6);
  const defenderHasIgnoreShieldsOn6 = defender.advancements.some(adv => adv.effects.ignoreShieldsOn6);
  
  const attackerCanHit = attackerHitRoll <= 6 || attackerHasIgnoreShieldsOn6;
  const defenderCanHit = defenderHitRoll <= 6 || defenderHasIgnoreShieldsOn6;
  
  if (!attackerCanHit && !defenderCanHit) {
    return 'defender';
  }
  
  let isFirstRound = true;
  
  while (attackerShips > 0 && defenderShips > 0) {
    let attackerHits = 0;
    let defenderHits = 0;
    
    // Handle first strike
    if (isFirstRound && firstStrike === 'attacker') {
      if (attackerCanHit) {
        attackerHits = rollHitsForPlayer(attacker, attackerHitRoll, defender.shields);
      }
      defenderShips = Math.max(0, defenderShips - attackerHits);
      
      if (defenderCanHit && defenderShips > 0) {
        defenderHits = rollHitsForPlayer(defender, defenderHitRoll, attacker.shields);
      }
      attackerShips = Math.max(0, attackerShips - defenderHits);
    } else if (isFirstRound && firstStrike === 'defender') {
      if (defenderCanHit) {
        defenderHits = rollHitsForPlayer(defender, defenderHitRoll, attacker.shields);
      }
      attackerShips = Math.max(0, attackerShips - defenderHits);
      
      if (attackerCanHit && attackerShips > 0) {
        attackerHits = rollHitsForPlayer(attacker, attackerHitRoll, defender.shields);
      }
      defenderShips = Math.max(0, defenderShips - attackerHits);
    } else {
      // Simultaneous combat
      if (attackerCanHit) {
        attackerHits = rollHitsForPlayer(attacker, attackerHitRoll, defender.shields);
      }
      if (defenderCanHit) {
        defenderHits = rollHitsForPlayer(defender, defenderHitRoll, attacker.shields);
      }
      
      attackerShips = Math.max(0, attackerShips - defenderHits);
      defenderShips = Math.max(0, defenderShips - attackerHits);
    }
    
    isFirstRound = false;
  }
  
  return attackerShips > 0 ? 'attacker' : 'defender';
}

// Roll hits for a player, considering advancement, fleet, and starbase effects
function rollHitsForPlayer(player: PlayerSetup, hitRoll: number, opponentShields: number): number {
  let totalHits = 0;
  const hasIgnoreShieldsOn6 = player.advancements.some(adv => adv.effects.ignoreShieldsOn6);
  const hasDoublesKillOnMiss = player.advancements.some(adv => adv.effects.doublesKillOnMiss);
  const hasWeaponizedStarbases = player.advancements.some(adv => adv.name === 'Weaponized Starbases');
  
  const allRolls: number[] = [];
  
  // Roll for each fleet separately to handle fleet-specific abilities
  for (const fleetAllocation of player.fleets) {
    const fleet = fleetAllocation.fleet;
    const shipCount = fleetAllocation.shipCount;
    const canRerollOnes = fleet.effects.rerollOnes || false;
    
    for (let i = 0; i < shipCount; i++) {
      let roll = Math.floor(Math.random() * 6) + 1;
      
      // Handle Battle Group reroll 1s ability
      if (canRerollOnes && roll === 1) {
        roll = Math.floor(Math.random() * 6) + 1; // Reroll the 1
      }
      
      allRolls.push(roll);
      
      // Check for hit
      if (roll >= hitRoll) {
        totalHits++;
      } else if (hasIgnoreShieldsOn6 && roll === 6) {
        // Disruptor Technology: 6s always hit regardless of shields
        totalHits++;
      }
    }
  }
  
  // Roll for individual ships (no fleet abilities)
  for (let i = 0; i < player.individualShips; i++) {
    const roll = Math.floor(Math.random() * 6) + 1;
    allRolls.push(roll);
    
    // Check for hit
    if (roll >= hitRoll) {
      totalHits++;
    } else if (hasIgnoreShieldsOn6 && roll === 6) {
      // Disruptor Technology: 6s always hit regardless of shields
      totalHits++;
    }
  }
  
  // Starbase support: roll additional dice
  if (player.hasStarbase) {
    const starbaseDice = hasWeaponizedStarbases ? 3 : 1;
    for (let i = 0; i < starbaseDice; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      allRolls.push(roll);
      
      // Check for hit
      if (roll >= hitRoll) {
        totalHits++;
      } else if (hasIgnoreShieldsOn6 && roll === 6) {
        // Disruptor Technology: 6s always hit regardless of shields
        totalHits++;
      }
    }
  }
  
  // Mass Fire Tactics: doubles on misses kill 1 ship
  if (hasDoublesKillOnMiss) {
    const missRolls = allRolls.filter(roll => roll < hitRoll && !(hasIgnoreShieldsOn6 && roll === 6));
    const doubles = new Set();
    missRolls.forEach(roll => {
      if (missRolls.filter(r => r === roll).length >= 2) {
        doubles.add(roll);
      }
    });
    totalHits += doubles.size;
  }
  
  return totalHits;
}

// Run multiple battle simulations
function runSimulation(attacker: PlayerSetup, defender: PlayerSetup, numBattles: number = 1000): BattleResult {
  let attackerWins = 0;
  let defenderWins = 0;
  
  for (let i = 0; i < numBattles; i++) {
    const result = simulateBattle(attacker, defender);
    if (result === 'attacker') {
      attackerWins++;
    } else {
      defenderWins++;
    }
  }
  
  return {
    attackerWins,
    defenderWins,
    totalBattles: numBattles
  };
}

export default function Home() {
  const [allAdvancements, setAllAdvancements] = useState<Advancement[]>([]);
  const [allFleets, setAllFleets] = useState<Fleet[]>([]);
  const [factions] = useState<string[]>(['klingon']); // Will expand as more factions are added
  
  const [attacker, setAttacker] = useState<PlayerSetup>({
    faction: '',
    weapons: 0,
    shields: 0,
    advancements: [],
    fleets: [],
    individualShips: 0,
    hasStarbase: false
  });
  
  const [defender, setDefender] = useState<PlayerSetup>({
    faction: '',
    weapons: 0,
    shields: 0,
    advancements: [],
    fleets: [],
    individualShips: 0,
    hasStarbase: false
  });
  
  const [result, setResult] = useState<BattleResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState<'attacker' | 'defender' | 'ready'>('attacker');
  
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [advResponse, fleetResponse] = await Promise.all([
          fetch('/advancments.json'),
          fetch('/fleets.json')
        ]);
        
        const advancements = await advResponse.json();
        const fleets = await fleetResponse.json();
        
        setAllAdvancements(advancements);
        setAllFleets(fleets);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    
    loadData();
  }, []);
  
  const handleSimulate = async () => {
    if (getTotalShips(attacker) === 0 || getTotalShips(defender) === 0) {
      alert('Both players must have at least one ship!');
      return;
    }
    
    setIsSimulating(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    const battleResult = runSimulation(attacker, defender);
    setResult(battleResult);
    setIsSimulating(false);
  };
  
  const updatePlayer = (player: 'attacker' | 'defender', updates: Partial<PlayerSetup>) => {
    const setter = player === 'attacker' ? setAttacker : setDefender;
    setter(prev => ({ ...prev, ...updates }));
    setResult(null);
  };
  
  const handleFactionChange = (player: 'attacker' | 'defender', faction: string) => {
    const startingAdvancements = allAdvancements.filter(adv => 
      adv.faction === faction && adv.isStartingAdvancement
    );
    
    updatePlayer(player, {
      faction,
      advancements: startingAdvancements,
      fleets: [],
      individualShips: 0,
      hasStarbase: false
    });
  };
  
  const toggleAdvancement = (player: 'attacker' | 'defender', advancement: Advancement) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    const hasAdvancement = currentPlayer.advancements.some(adv => adv.name === advancement.name);
    
    if (advancement.isStartingAdvancement) return; // Can't toggle starting advancements
    
    const newAdvancements = hasAdvancement
      ? currentPlayer.advancements.filter(adv => adv.name !== advancement.name)
      : [...currentPlayer.advancements, advancement];
    
    updatePlayer(player, { advancements: newAdvancements });
  };
  
  const addFleet = (player: 'attacker' | 'defender', fleet: Fleet) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    updatePlayer(player, {
      fleets: [...currentPlayer.fleets, { fleet, shipCount: fleet.minShips }]
    });
  };
  
  const updateFleetShips = (player: 'attacker' | 'defender', fleetIndex: number, shipCount: number) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    const newFleets = [...currentPlayer.fleets];
    newFleets[fleetIndex].shipCount = Math.max(newFleets[fleetIndex].fleet.minShips, 
                                               Math.min(newFleets[fleetIndex].fleet.maxShips, shipCount));
    updatePlayer(player, { fleets: newFleets });
  };
  
  const removeFleet = (player: 'attacker' | 'defender', fleetIndex: number) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    const newFleets = currentPlayer.fleets.filter((_, index) => index !== fleetIndex);
    updatePlayer(player, { fleets: newFleets });
  };
  
  const renderPlayerSetup = (player: 'attacker' | 'defender', playerData: PlayerSetup) => {
    const availableAdvancements = allAdvancements.filter(adv => adv.faction === playerData.faction);
    const availableFleets = allFleets.filter(fleet => fleet.faction === playerData.faction);
    const playerColor = player === 'attacker' ? 'text-red-300' : 'text-blue-300';
    
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className={`text-lg font-semibold mb-4 ${playerColor}`}>
          {player === 'attacker' ? 'Attacker' : 'Defender'} Setup
        </h2>
        
        {/* Faction Selection */}
        <div className="mb-4">
          <label className="block text-sm mb-2">Faction</label>
          <select
            value={playerData.faction}
            onChange={(e) => handleFactionChange(player, e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
          >
            <option value="">Select Faction</option>
            {factions.map(faction => (
              <option key={faction} value={faction}>
                {faction.charAt(0).toUpperCase() + faction.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        {playerData.faction && (
          <>
            {/* Weapons and Shields */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Weapons Level</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={playerData.weapons}
                  onChange={(e) => updatePlayer(player, { weapons: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Shield Modifier</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={playerData.shields}
                  onChange={(e) => updatePlayer(player, { shields: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                />
              </div>
            </div>
            
            {/* Individual Ships and Starbase */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Individual Ships</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={playerData.individualShips}
                  onChange={(e) => updatePlayer(player, { individualShips: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    checked={playerData.hasStarbase}
                    onChange={(e) => updatePlayer(player, { hasStarbase: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Has Starbase (+1 die)</span>
                </label>
              </div>
            </div>
            
            {/* Advancements */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Advancements</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableAdvancements.map(advancement => {
                  const isSelected = playerData.advancements.some(adv => adv.name === advancement.name);
                  const isStarting = advancement.isStartingAdvancement;
                  
                  return (
                    <label key={advancement.name} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAdvancement(player, advancement)}
                        disabled={isStarting}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className={`text-xs ${isStarting ? 'text-yellow-400' : 'text-white'}`}>
                          {advancement.name} {isStarting && '(Starting)'}
                        </div>
                        <div className="text-xs text-gray-400">{advancement.ability}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            
            {/* Fleets */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Fleets</h3>
              
              {/* Current Fleets */}
              {playerData.fleets.map((fleetAllocation, index) => (
                <div key={index} className="bg-gray-700 rounded p-3 mb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{fleetAllocation.fleet.name}</div>
                      <div className="text-xs text-gray-400">{fleetAllocation.fleet.ability}</div>
                    </div>
                    <button
                      onClick={() => removeFleet(player, index)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs">Ships:</label>
                    <input
                      type="number"
                      min={fleetAllocation.fleet.minShips}
                      max={fleetAllocation.fleet.maxShips}
                      value={fleetAllocation.shipCount}
                      onChange={(e) => updateFleetShips(player, index, parseInt(e.target.value) || fleetAllocation.fleet.minShips)}
                      className="w-16 px-2 py-1 bg-gray-600 rounded border border-gray-500 text-white text-xs"
                    />
                    <span className="text-xs text-gray-400">
                      ({fleetAllocation.fleet.minShips}-{fleetAllocation.fleet.maxShips})
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Add Fleet */}
              <div className="space-y-1">
                {availableFleets.map(fleet => (
                  <button
                    key={fleet.id}
                    onClick={() => addFleet(player, fleet)}
                    className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                  >
                    Add {fleet.name} ({fleet.minShips}-{fleet.maxShips} ships)
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };
  
  const getTotalShips = (playerData: PlayerSetup) => {
    return playerData.fleets.reduce((total, fleet) => total + fleet.shipCount, 0) + playerData.individualShips;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-yellow-400">
          Star Trek Ascendancy<br />Space Battle Simulator
        </h1>
        
        {renderPlayerSetup('attacker', attacker)}
        {renderPlayerSetup('defender', defender)}
        
        {/* Battle Summary */}
        {attacker.faction && defender.faction && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-green-300">Battle Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-red-300 font-medium">Attacker ({attacker.faction})</div>
                <div>Total Ships: {getTotalShips(attacker)}</div>
                <div>Fleet Ships: {attacker.fleets.reduce((total, fleet) => total + fleet.shipCount, 0)}</div>
                <div>Individual Ships: {attacker.individualShips}</div>
                <div>Weapons: {attacker.weapons}, Shields: {attacker.shields}</div>
                <div>Advancements: {attacker.advancements.length}</div>
                <div>Starbase: {attacker.hasStarbase ? 'Yes (+1 die)' : 'No'}</div>
              </div>
              <div>
                <div className="text-blue-300 font-medium">Defender ({defender.faction})</div>
                <div>Total Ships: {getTotalShips(defender)}</div>
                <div>Fleet Ships: {defender.fleets.reduce((total, fleet) => total + fleet.shipCount, 0)}</div>
                <div>Individual Ships: {defender.individualShips}</div>
                <div>Weapons: {defender.weapons}, Shields: {defender.shields}</div>
                <div>Advancements: {defender.advancements.length}</div>
                <div>Starbase: {defender.hasStarbase ? 'Yes (+1 die)' : 'No'}</div>
              </div>
            </div>
            
            <button
              onClick={handleSimulate}
              disabled={isSimulating || getTotalShips(attacker) === 0 || getTotalShips(defender) === 0}
              className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
            >
              {isSimulating ? 'Simulating...' : 'Simulate 1000 Battles'}
            </button>
          </div>
        )}
        
        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-green-300">Battle Results</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-red-300">Attacker Wins:</span>
                <span className="font-bold">
                  {result.attackerWins} ({((result.attackerWins / result.totalBattles) * 100).toFixed(1)}%)
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-blue-300">Defender Wins:</span>
                <span className="font-bold">
                  {result.defenderWins} ({((result.defenderWins / result.totalBattles) * 100).toFixed(1)}%)
                </span>
              </div>
              
              <div className="mt-4 bg-gray-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${(result.attackerWins / result.totalBattles) * 100}%` }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-400 text-center mt-2">
                Based on {result.totalBattles} simulated battles
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>Simulates basic Star Trek Ascendancy space battle rules.</p>
          <p>Hit rolls: 5+ base, modified by weapons and shields.</p>
        </div>
      </div>
    </div>
  );
}
