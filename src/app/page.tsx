'use client';

import { useState, useEffect } from 'react';

interface Advancement {
  name: string;
  ability: string;
  isStartingAdvancement: boolean;
  effects: {
    ignoreShieldsOn6?: boolean;
    ignoreShieldsOn5Or6?: boolean;
    doublesKillOnMiss?: boolean;
    firstStrike?: boolean;
    ignoreFirstCasualty?: boolean;
    rerollOneMiss?: boolean;
    blocksCloaking?: boolean;
    stoneOfGol?: boolean;
  };
}

interface Fleet {
  id: string;
  name: string;
  maxShips: number;
  minShips: number;
  ability: string;
  effects: {
    productionOnKill?: number;
    rerollOnes?: boolean;
    doubleDiceInTerritory?: boolean;
    autoHitFirstRound?: boolean;
  } | null;
}

interface SpecialAbility {
  name: string;
  ability: string;
  type: string;
  effects: {
    rerollFailedHits?: boolean;
  };
}

interface Faction {
  name: string;
  fleets: Fleet[];
  advancements: Advancement[];
  specialAbilities?: SpecialAbility[];
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
  inBreenTerritory: boolean;
  ascendancy: number;
}

interface BattleResult {
  attackerWins: number;
  defenderWins: number;
  totalBattles: number;
  attackerCasualties: {
    totalLosses: number;
    averageLosses: number;
    averageRemaining: number;
    lossPercentage: number;
  };
  defenderCasualties: {
    totalLosses: number;
    averageLosses: number;
    averageRemaining: number;
    lossPercentage: number;
  };
}

// Battle state for tracking fleets and individual ships during combat
interface BattleState {
  fleets: Array<{ fleet: Fleet; shipCount: number; isActive: boolean }>;
  individualShips: number;
  advancements: Advancement[];
  hasStarbase: boolean;
  weapons: number;
  shields: number;
  inBreenTerritory: boolean;
  ascendancy: number;
}

// Simulate a single space battle based on Star Trek Ascendancy rules
function simulateBattle(
  attacker: PlayerSetup,
  defender: PlayerSetup
): {
  winner: 'attacker' | 'defender';
  attackerLosses: number;
  defenderLosses: number;
} {
  // Create mutable battle states
  const attackerState: BattleState = {
    fleets: attacker.fleets.map((f) => ({ ...f, isActive: true })),
    individualShips: attacker.individualShips,
    advancements: attacker.advancements,
    hasStarbase: attacker.hasStarbase,
    weapons: attacker.weapons,
    shields: attacker.shields,
    inBreenTerritory: attacker.inBreenTerritory,
    ascendancy: attacker.ascendancy,
  };

  const defenderState: BattleState = {
    fleets: defender.fleets.map((f) => ({ ...f, isActive: true })),
    individualShips: defender.individualShips,
    advancements: defender.advancements,
    hasStarbase: defender.hasStarbase,
    weapons: defender.weapons,
    shields: defender.shields,
    inBreenTerritory: defender.inBreenTerritory,
    ascendancy: defender.ascendancy,
  };

  // Check for first strike from advancements
  // Only attackers can use first strike (since it only applies "during your turn")
  const attackerFirstStrike = attackerState.advancements.some(
    (adv) => adv.effects.firstStrike
  );

  // Tachyon Detection Array blocks Klingon/Romulan cloaking (first strike) but not Breen cloaking
  const defenderHasTachyonArray = defenderState.advancements.some(
    (adv) => adv.effects.blocksCloaking
  );
  const attackerHasKlingonRomulanCloaking =
    attackerFirstStrike &&
    attackerState.advancements.some(
      (adv) =>
        adv.effects.firstStrike &&
        (adv.name === 'Adapted Cloaking Device' ||
          adv.name === 'Romulan Cloaking Device')
    );

  // Block first strike if defender has Tachyon Detection Array and attacker is using Klingon/Romulan cloaking
  const firstStrike =
    attackerFirstStrike &&
    !(defenderHasTachyonArray && attackerHasKlingonRomulanCloaking)
      ? 'attacker'
      : null;

  // Calculate hit requirements
  const attackerHitRoll =
    Math.max(1, 5 - attackerState.weapons) + defenderState.shields;
  const defenderHitRoll =
    Math.max(1, 5 - defenderState.weapons) + attackerState.shields;

  // Check for invulnerable shields (but account for advancements that bypass shields)
  const attackerHasIgnoreShieldsOn6 = attackerState.advancements.some(
    (adv) => adv.effects.ignoreShieldsOn6
  );
  const defenderHasIgnoreShieldsOn6 = defenderState.advancements.some(
    (adv) => adv.effects.ignoreShieldsOn6
  );

  const attackerCanHit = attackerHitRoll <= 6 || attackerHasIgnoreShieldsOn6;
  const defenderCanHit = defenderHitRoll <= 6 || defenderHasIgnoreShieldsOn6;

  if (!attackerCanHit && !defenderCanHit) {
    return {
      winner: 'defender',
      attackerLosses: 0,
      defenderLosses: 0,
    };
  }

  let isFirstRound = true;

  while (
    getTotalShipsInBattle(attackerState) > 0 &&
    getTotalShipsInBattle(defenderState) > 0
  ) {
    let attackerHits = 0;
    let defenderHits = 0;

    // Handle first strike (only attackers can have first strike)
    if (isFirstRound && firstStrike === 'attacker') {
      if (attackerCanHit) {
        attackerHits = rollHitsForBattleState(
          attackerState,
          attackerHitRoll,
          isFirstRound
        );
      }
      allocateHits(defenderState, attackerHits);

      if (defenderCanHit && getTotalShipsInBattle(defenderState) > 0) {
        defenderHits = rollHitsForBattleState(
          defenderState,
          defenderHitRoll,
          isFirstRound
        );
      }
      allocateHits(attackerState, defenderHits);
    } else {
      // Simultaneous combat
      if (attackerCanHit) {
        attackerHits = rollHitsForBattleState(
          attackerState,
          attackerHitRoll,
          isFirstRound
        );
      }
      if (defenderCanHit) {
        defenderHits = rollHitsForBattleState(
          defenderState,
          defenderHitRoll,
          isFirstRound
        );
      }

      allocateHits(attackerState, defenderHits);
      allocateHits(defenderState, attackerHits);
    }

    isFirstRound = false;
  }

  // Calculate casualties
  const attackerInitialShips = getTotalShips(attacker);
  const defenderInitialShips = getTotalShips(defender);
  const attackerRemainingShips = getTotalShipsInBattle(attackerState);
  const defenderRemainingShips = getTotalShipsInBattle(defenderState);

  const attackerLosses = attackerInitialShips - attackerRemainingShips;
  const defenderLosses = defenderInitialShips - defenderRemainingShips;

  return {
    winner: getTotalShipsInBattle(attackerState) > 0 ? 'attacker' : 'defender',
    attackerLosses,
    defenderLosses,
  };
}

// Get total ships for a player setup (for initial ship count calculation)
function getTotalShips(playerData: PlayerSetup): number {
  return (
    playerData.fleets.reduce((total, fleet) => total + fleet.shipCount, 0) +
    playerData.individualShips
  );
}

// Get total ships currently in battle (active fleets + individual ships)
function getTotalShipsInBattle(state: BattleState): number {
  const fleetShips = state.fleets
    .filter((f) => f.isActive)
    .reduce((total, fleet) => total + fleet.shipCount, 0);
  return fleetShips + state.individualShips;
}

// Roll hits for a battle state, considering fleet abilities and advancements
function rollHitsForBattleState(
  state: BattleState,
  hitRoll: number,
  isFirstRound: boolean = false
): number {
  let totalHits = 0;
  const hasIgnoreShieldsOn6 = state.advancements.some(
    (adv) => adv.effects.ignoreShieldsOn6
  );
  const hasIgnoreShieldsOn5Or6 = state.advancements.some(
    (adv) => adv.effects.ignoreShieldsOn5Or6
  );
  const hasDoublesKillOnMiss = state.advancements.some(
    (adv) => adv.effects.doublesKillOnMiss
  );
  const hasWeaponizedStarbases = state.advancements.some(
    (adv) => adv.name === 'Weaponized Starbases'
  );
  const hasRerollOneMiss = state.advancements.some(
    (adv) => adv.effects.rerollOneMiss
  );
  const hasStoneOfGol = state.advancements.some(
    (adv) => adv.effects.stoneOfGol
  );

  // Check if this is a Breen player in Breen territory (can reroll all failed hits)
  // The Breen territorial special ability allows rerolling all failed hits in Breen territory
  const isBreenInTerritory = state.inBreenTerritory;

  const allRolls: number[] = [];

  // Roll for each active fleet separately to handle fleet-specific abilities
  for (const fleetAllocation of state.fleets) {
    if (!fleetAllocation.isActive) continue;

    const fleet = fleetAllocation.fleet;
    const shipCount = fleetAllocation.shipCount;
    const canRerollOnes = fleet.effects?.rerollOnes || false;
    const hasDoubleDiceInTerritory =
      fleet.effects?.doubleDiceInTerritory || false;
    const hasAutoHitFirstRound = fleet.effects?.autoHitFirstRound || false;
    // Since fleets no longer have faction property, Breen territory applies to all fleets of a Breen player
    const isBreenFleet = isBreenInTerritory;

    // System Patrol gets double dice in Breen territory
    const dicePerShip = hasDoubleDiceInTerritory && isBreenInTerritory ? 2 : 1;

    for (let i = 0; i < shipCount; i++) {
      for (let diceRoll = 0; diceRoll < dicePerShip; diceRoll++) {
        // Hunter Killer: auto-hit in first round
        if (hasAutoHitFirstRound && isFirstRound) {
          totalHits++; // Automatic hit, no dice roll needed
          allRolls.push(6); // Record as a 6 for tracking purposes
          continue;
        }

        let roll = Math.floor(Math.random() * 6) + 1;

        // Handle Battle Group reroll 1s ability
        if (canRerollOnes && roll === 1) {
          roll = Math.floor(Math.random() * 6) + 1; // Reroll the 1
        }

        // Handle Breen territory reroll ability (reroll all failed hits)
        if (
          isBreenFleet &&
          isBreenInTerritory &&
          roll < hitRoll &&
          !(hasIgnoreShieldsOn6 && roll === 6) &&
          !(hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6))
        ) {
          roll = Math.floor(Math.random() * 6) + 1; // Reroll the failed hit
        }

        allRolls.push(roll);

        // Check for hit
        if (roll >= hitRoll) {
          totalHits++;
        } else if (hasIgnoreShieldsOn6 && roll === 6) {
          // Disruptor Technology: 6s always hit regardless of shields
          totalHits++;
        } else if (hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6)) {
          // Energy Damping Weapons: 5s and 6s always hit regardless of shields
          totalHits++;
        }
      }
    }
  }

  // Roll for individual ships (no fleet abilities, but can benefit from Breen territory)
  for (let i = 0; i < state.individualShips; i++) {
    let roll = Math.floor(Math.random() * 6) + 1;

    // Handle Breen territory reroll ability for individual ships
    if (
      isBreenInTerritory &&
      roll < hitRoll &&
      !(hasIgnoreShieldsOn6 && roll === 6) &&
      !(hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6))
    ) {
      roll = Math.floor(Math.random() * 6) + 1; // Reroll the failed hit
    }

    allRolls.push(roll);

    // Check for hit
    if (roll >= hitRoll) {
      totalHits++;
    } else if (hasIgnoreShieldsOn6 && roll === 6) {
      // Disruptor Technology: 6s always hit regardless of shields
      totalHits++;
    } else if (hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6)) {
      // Energy Damping Weapons: 5s and 6s always hit regardless of shields
      totalHits++;
    }
  }

  // Starbase support: roll additional dice
  if (state.hasStarbase) {
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
      } else if (hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6)) {
        // Energy Damping Weapons: 5s and 6s always hit regardless of shields
        totalHits++;
      }
    }
  }

  // Stone of Gol: reroll any dice equal to or higher than Ascendancy that are currently misses
  if (hasStoneOfGol && state.ascendancy > 0) {
    for (let i = 0; i < allRolls.length; i++) {
      const roll = allRolls[i];
      // Check if this roll is >= Ascendancy AND is currently a miss
      const isCurrentlyMiss =
        roll < hitRoll &&
        !(hasIgnoreShieldsOn6 && roll === 6) &&
        !(hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6));

      if (roll >= state.ascendancy && isCurrentlyMiss) {
        // Reroll this die
        const newRoll = Math.floor(Math.random() * 6) + 1;
        allRolls[i] = newRoll;

        // Check if the new roll is now a hit
        if (newRoll >= hitRoll) {
          totalHits++;
        } else if (hasIgnoreShieldsOn6 && newRoll === 6) {
          totalHits++;
        } else if (hasIgnoreShieldsOn5Or6 && (newRoll === 5 || newRoll === 6)) {
          totalHits++;
        }
      }
    }
  }

  // Mass Fire Tactics: doubles on misses kill 1 ship
  if (hasDoublesKillOnMiss) {
    const missRolls = allRolls.filter(
      (roll) =>
        roll < hitRoll &&
        !(hasIgnoreShieldsOn6 && roll === 6) &&
        !(hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6))
    );
    const doubles = new Set();
    missRolls.forEach((roll) => {
      if (missRolls.filter((r) => r === roll).length >= 2) {
        doubles.add(roll);
      }
    });
    totalHits += doubles.size;
  }

  // Superior Targeting Array: reroll one miss per round
  if (hasRerollOneMiss) {
    const missRolls = allRolls.filter(
      (roll) =>
        roll < hitRoll &&
        !(hasIgnoreShieldsOn6 && roll === 6) &&
        !(hasIgnoreShieldsOn5Or6 && (roll === 5 || roll === 6))
    );
    if (missRolls.length > 0) {
      // Reroll the first miss
      let reroll = Math.floor(Math.random() * 6) + 1;
      if (reroll >= hitRoll) {
        totalHits++;
      } else if (hasIgnoreShieldsOn6 && reroll === 6) {
        totalHits++;
      } else if (hasIgnoreShieldsOn5Or6 && (reroll === 5 || reroll === 6)) {
        totalHits++;
      }
    }
  }

  return totalHits;
}

// Allocate hits to fleets first, then individual ships, handling fleet disbanding
function allocateHits(state: BattleState, hits: number): void {
  let remainingHits = hits;

  // Superior Shield Harmonics: each fleet may ignore the first casualty in each round
  const hasIgnoreFirstCasualty = state.advancements.some(
    (adv) => adv.effects.ignoreFirstCasualty
  );

  // First, allocate hits to active fleets
  for (const fleetAllocation of state.fleets) {
    if (!fleetAllocation.isActive || remainingHits <= 0) continue;

    let hitsToFleet = Math.min(remainingHits, fleetAllocation.shipCount);

    // Superior Shield Harmonics: this fleet ignores its first casualty
    if (hasIgnoreFirstCasualty && hitsToFleet > 0) {
      hitsToFleet--; // This fleet ignores its first hit
    }

    fleetAllocation.shipCount -= hitsToFleet;
    remainingHits -= hitsToFleet;

    // Check if fleet should be disbanded
    if (fleetAllocation.shipCount < fleetAllocation.fleet.minShips) {
      // Fleet is disbanded - move remaining ships to individual ships
      state.individualShips += fleetAllocation.shipCount;
      fleetAllocation.shipCount = 0;
      fleetAllocation.isActive = false;
    }
  }

  // Then, allocate remaining hits to individual ships
  if (remainingHits > 0) {
    state.individualShips = Math.max(0, state.individualShips - remainingHits);
  }
}

// Run multiple battle simulations
function runSimulation(
  attacker: PlayerSetup,
  defender: PlayerSetup,
  numBattles: number = 1000
): BattleResult {
  let attackerWins = 0;
  let defenderWins = 0;
  let attackerWinLosses = 0;
  let defenderWinLosses = 0;

  const attackerInitialShips = getTotalShips(attacker);
  const defenderInitialShips = getTotalShips(defender);

  for (let i = 0; i < numBattles; i++) {
    const result = simulateBattle(attacker, defender);

    if (result.winner === 'attacker') {
      attackerWins++;
      attackerWinLosses += result.attackerLosses;
    } else {
      defenderWins++;
      defenderWinLosses += result.defenderLosses;
    }
  }

  // Calculate casualty statistics - only for battles where each side wins
  const attackerAverageLosses =
    attackerWins > 0 ? attackerWinLosses / attackerWins : 0;
  const defenderAverageLosses =
    defenderWins > 0 ? defenderWinLosses / defenderWins : 0;

  const attackerAverageRemaining =
    attackerWins > 0 ? attackerInitialShips - attackerAverageLosses : 0;
  const defenderAverageRemaining =
    defenderWins > 0 ? defenderInitialShips - defenderAverageLosses : 0;

  const attackerLossPercentage =
    attackerWins > 0 ? (attackerAverageLosses / attackerInitialShips) * 100 : 0;
  const defenderLossPercentage =
    defenderWins > 0 ? (defenderAverageLosses / defenderInitialShips) * 100 : 0;

  return {
    attackerWins,
    defenderWins,
    totalBattles: numBattles,
    attackerCasualties: {
      totalLosses: attackerWinLosses,
      averageLosses: attackerAverageLosses,
      averageRemaining: attackerAverageRemaining,
      lossPercentage: attackerLossPercentage,
    },
    defenderCasualties: {
      totalLosses: defenderWinLosses,
      averageLosses: defenderAverageLosses,
      averageRemaining: defenderAverageRemaining,
      lossPercentage: defenderLossPercentage,
    },
  };
}

export default function Home() {
  const [factions, setFactions] = useState<Faction[]>([]);

  const [attacker, setAttacker] = useState<PlayerSetup>({
    faction: '',
    weapons: 0,
    shields: 0,
    advancements: [],
    fleets: [],
    individualShips: 0,
    hasStarbase: false,
    inBreenTerritory: false,
    ascendancy: 0,
  });

  const [defender, setDefender] = useState<PlayerSetup>({
    faction: '',
    weapons: 0,
    shields: 0,
    advancements: [],
    fleets: [],
    individualShips: 0,
    hasStarbase: false,
    inBreenTerritory: false,
    ascendancy: 0,
  });

  const [result, setResult] = useState<BattleResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<
    'attacker' | 'defender' | 'ready'
  >('attacker');

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/factions.json');
        const factionsData = await response.json();
        setFactions(factionsData);
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
    await new Promise((resolve) => setTimeout(resolve, 100));
    const battleResult = runSimulation(attacker, defender);
    setResult(battleResult);
    setIsSimulating(false);
  };

  const showCopyFeedback = () => {
    setCopyFeedback('Copied!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const updatePlayer = (
    player: 'attacker' | 'defender',
    updates: Partial<PlayerSetup>
  ) => {
    const setter = player === 'attacker' ? setAttacker : setDefender;
    setter((prev) => ({ ...prev, ...updates }));
    setResult(null);
  };

  const handleFactionChange = (
    player: 'attacker' | 'defender',
    faction: string
  ) => {
    const selectedFaction = factions.find((f) => f.name === faction);
    const startingAdvancements =
      selectedFaction?.advancements.filter(
        (adv) => adv.isStartingAdvancement
      ) || [];

    updatePlayer(player, {
      faction,
      advancements: startingAdvancements,
      fleets: [],
      individualShips: 0,
      hasStarbase: false,
      inBreenTerritory: false,
    });
  };

  const toggleAdvancement = (
    player: 'attacker' | 'defender',
    advancement: Advancement
  ) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    const hasAdvancement = currentPlayer.advancements.some(
      (adv) => adv.name === advancement.name
    );

    if (advancement.isStartingAdvancement) return; // Can't toggle starting advancements

    const newAdvancements = hasAdvancement
      ? currentPlayer.advancements.filter(
          (adv) => adv.name !== advancement.name
        )
      : [...currentPlayer.advancements, advancement];

    updatePlayer(player, { advancements: newAdvancements });
  };

  const addFleet = (player: 'attacker' | 'defender', fleet: Fleet) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    updatePlayer(player, {
      fleets: [...currentPlayer.fleets, { fleet, shipCount: fleet.minShips }],
    });
  };

  const updateFleetShips = (
    player: 'attacker' | 'defender',
    fleetIndex: number,
    shipCount: number
  ) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    const newFleets = [...currentPlayer.fleets];
    newFleets[fleetIndex].shipCount = Math.max(
      newFleets[fleetIndex].fleet.minShips,
      Math.min(newFleets[fleetIndex].fleet.maxShips, shipCount)
    );
    updatePlayer(player, { fleets: newFleets });
  };

  const removeFleet = (player: 'attacker' | 'defender', fleetIndex: number) => {
    const currentPlayer = player === 'attacker' ? attacker : defender;
    const newFleets = currentPlayer.fleets.filter(
      (_, index) => index !== fleetIndex
    );
    updatePlayer(player, { fleets: newFleets });
  };

  const renderPlayerSetup = (
    player: 'attacker' | 'defender',
    playerData: PlayerSetup
  ) => {
    const selectedFaction = factions.find((f) => f.name === playerData.faction);
    const availableAdvancements = selectedFaction?.advancements || [];
    const availableFleets = selectedFaction?.fleets || [];
    const playerColor =
      player === 'attacker' ? 'text-red-300' : 'text-blue-300';

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
            {factions.map((faction) => (
              <option key={faction.name} value={faction.name}>
                {faction.name}
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
                  value={playerData.weapons === 0 ? '' : playerData.weapons}
                  placeholder="0"
                  onChange={(e) =>
                    updatePlayer(player, {
                      weapons: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Shield Modifier</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={playerData.shields === 0 ? '' : playerData.shields}
                  placeholder="0"
                  onChange={(e) =>
                    updatePlayer(player, {
                      shields: parseInt(e.target.value) || 0,
                    })
                  }
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
                  value={
                    playerData.individualShips === 0
                      ? ''
                      : playerData.individualShips
                  }
                  placeholder="0"
                  onChange={(e) =>
                    updatePlayer(player, {
                      individualShips: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    checked={playerData.hasStarbase}
                    onChange={(e) =>
                      updatePlayer(player, { hasStarbase: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm">Has Starbase (+1 die)</span>
                </label>
              </div>
            </div>

            {/* Special Abilities - show checkboxes for faction-specific abilities */}
            {selectedFaction?.specialAbilities &&
              selectedFaction.specialAbilities.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium mb-2">
                    Special Abilities
                  </h3>
                  {selectedFaction.specialAbilities.map((ability) => {
                    if (
                      ability.type === 'territorial' &&
                      ability.effects.rerollFailedHits
                    ) {
                      return (
                        <label
                          key={ability.name}
                          className="flex items-center mb-2"
                        >
                          <input
                            type="checkbox"
                            checked={playerData.inBreenTerritory}
                            onChange={(e) =>
                              updatePlayer(player, {
                                inBreenTerritory: e.target.checked,
                              })
                            }
                            className="mr-2"
                          />
                          <span className="text-sm">{ability.ability}</span>
                        </label>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

            {/* Advancements */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Advancements</h3>
              <div className="space-y-2">
                {availableAdvancements.map((advancement) => {
                  const isSelected = playerData.advancements.some(
                    (adv) => adv.name === advancement.name
                  );
                  const isStarting = advancement.isStartingAdvancement;
                  const isFirstStrike = advancement.effects.firstStrike;
                  const isDefenderFirstStrike =
                    player === 'defender' && isFirstStrike;

                  return (
                    <label
                      key={advancement.name}
                      className="flex items-start space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAdvancement(player, advancement)}
                        disabled={isStarting || isDefenderFirstStrike}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div
                          className={`text-xs ${
                            isStarting
                              ? 'text-yellow-400'
                              : isDefenderFirstStrike
                              ? 'text-gray-500'
                              : 'text-white'
                          }`}
                        >
                          {advancement.name}
                          {isStarting && '(Starting)'}
                          {isDefenderFirstStrike && '(Attacker Only)'}
                        </div>
                        <div
                          className={`text-xs ${
                            isDefenderFirstStrike
                              ? 'text-gray-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {advancement.ability}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Stone of Gol Ascendancy Input */}
            {playerData.advancements.some((adv) => adv.effects.stoneOfGol) && (
              <div className="mb-4">
                <label className="block text-sm mb-2">
                  Current Ascendancy (for Stone of Gol)
                </label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={
                    playerData.ascendancy === 0 ? '' : playerData.ascendancy
                  }
                  onChange={(e) => {
                    const value = Math.max(
                      0,
                      Math.min(6, parseInt(e.target.value) || 0)
                    );
                    updatePlayer(player, { ascendancy: value });
                  }}
                  className="w-20 px-3 py-2 bg-gray-700 rounded border border-gray-600 text-white"
                  placeholder="0-6"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Reroll miss dice ≥ this value (0-6)
                </div>
              </div>
            )}

            {/* Fleets */}
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Fleets</h3>

              {/* Current Fleets */}
              {playerData.fleets.map((fleetAllocation, index) => (
                <div key={index} className="bg-gray-700 rounded p-3 mb-2">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {fleetAllocation.fleet.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {fleetAllocation.fleet.ability}
                      </div>
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
                      onChange={(e) =>
                        updateFleetShips(
                          player,
                          index,
                          parseInt(e.target.value) ||
                            fleetAllocation.fleet.minShips
                        )
                      }
                      className="w-16 px-2 py-1 bg-gray-600 rounded border border-gray-500 text-white text-xs"
                    />
                    <span className="text-xs text-gray-400">
                      ({fleetAllocation.fleet.minShips}-
                      {fleetAllocation.fleet.maxShips})
                    </span>
                  </div>
                </div>
              ))}

              {/* Add Fleet */}
              <div className="space-y-1">
                {availableFleets.map((fleet) => (
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
    return (
      playerData.fleets.reduce((total, fleet) => total + fleet.shipCount, 0) +
      playerData.individualShips
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <a
            href="https://startrek.gf9games.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src="/StarTrek-Header.jpg"
              alt="Star Trek Ascendancy Space Battle Simulator"
              className="mx-auto max-w-full h-auto rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            />
          </a>
          <h1 className="text-4xl font-bold text-yellow-400 mt-4">
            Space Battle Simulator!
          </h1>
        </div>

        {renderPlayerSetup('attacker', attacker)}
        {renderPlayerSetup('defender', defender)}

        {/* Battle Summary */}
        {attacker.faction && defender.faction && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-green-300">
              Battle Summary
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-red-300 font-medium">
                  Attacker ({attacker.faction})
                </div>
                <div>Total Ships: {getTotalShips(attacker)}</div>
                <div>
                  Fleet Ships:{' '}
                  {attacker.fleets.reduce(
                    (total, fleet) => total + fleet.shipCount,
                    0
                  )}
                </div>
                <div>Individual Ships: {attacker.individualShips}</div>
                <div>
                  Weapons: {attacker.weapons}, Shields: {attacker.shields}
                </div>
                <div>Advancements: {attacker.advancements.length}</div>
                <div>
                  Starbase: {attacker.hasStarbase ? 'Yes (+1 die)' : 'No'}
                </div>
              </div>
              <div>
                <div className="text-blue-300 font-medium">
                  Defender ({defender.faction})
                </div>
                <div>Total Ships: {getTotalShips(defender)}</div>
                <div>
                  Fleet Ships:{' '}
                  {defender.fleets.reduce(
                    (total, fleet) => total + fleet.shipCount,
                    0
                  )}
                </div>
                <div>Individual Ships: {defender.individualShips}</div>
                <div>
                  Weapons: {defender.weapons}, Shields: {defender.shields}
                </div>
                <div>Advancements: {defender.advancements.length}</div>
                <div>
                  Starbase: {defender.hasStarbase ? 'Yes (+1 die)' : 'No'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={
                isSimulating ||
                getTotalShips(attacker) === 0 ||
                getTotalShips(defender) === 0
              }
              className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
            >
              {isSimulating ? 'Simulating...' : 'Simulate 1000 Battles'}
            </button>
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-green-300">
              Battle Results
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-red-300">
                  {attacker.faction || 'Attacker'} Wins:
                </span>
                <span className="font-bold">
                  {result.attackerWins} (
                  {((result.attackerWins / result.totalBattles) * 100).toFixed(
                    1
                  )}
                  %)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-blue-300">
                  {defender.faction || 'Defender'} Wins:
                </span>
                <span className="font-bold">
                  {result.defenderWins} (
                  {((result.defenderWins / result.totalBattles) * 100).toFixed(
                    1
                  )}
                  %)
                </span>
              </div>

              <div className="mt-4 bg-gray-700 rounded-full h-4 overflow-hidden relative">
                {/* Attacker (Red) Section */}
                <div
                  className="h-full bg-red-500 transition-all duration-500 absolute left-0"
                  style={{
                    width: `${
                      (result.attackerWins / result.totalBattles) * 100
                    }%`,
                  }}
                ></div>

                {/* Defender (Blue) Section */}
                <div
                  className="h-full bg-blue-500 transition-all duration-500 absolute right-0"
                  style={{
                    width: `${
                      (result.defenderWins / result.totalBattles) * 100
                    }%`,
                  }}
                ></div>

                {/* White Separator Line */}
                {result.attackerWins > 0 && result.defenderWins > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white transition-all duration-500"
                    style={{
                      left: `${
                        (result.attackerWins / result.totalBattles) * 100
                      }%`,
                    }}
                  ></div>
                )}
              </div>

              <div className="text-xs text-gray-400 text-center mt-2">
                Based on {result.totalBattles} simulated battles
              </div>

              {/* Expected Casualties for Winner */}
              <div className="mt-6 pt-4 border-t border-gray-600">
                <h3 className="text-sm font-semibold text-yellow-300 mb-3 text-center">
                  Expected Winner Casualties
                </h3>

                {result.attackerWins > result.defenderWins ? (
                  // Attacker is more likely to win
                  <div className="bg-red-900/30 rounded-lg p-4">
                    <div className="text-center mb-2">
                      <span className="text-red-300 font-semibold">
                        {attacker.faction} Victory
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-gray-400">
                          Average Ships Lost %
                        </div>
                        <div className="text-red-300 font-bold">
                          {result.attackerCasualties.lossPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Average Ships Lost</div>
                        <div className="text-red-300 font-bold">
                          {result.attackerCasualties.averageLosses.toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">
                          Average Ships Remaining
                        </div>
                        <div className="text-red-300 font-bold">
                          {result.attackerCasualties.averageRemaining.toFixed(
                            1
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Defender is more likely to win
                  <div className="bg-blue-900/30 rounded-lg p-4">
                    <div className="text-center mb-2">
                      <span className="text-blue-300 font-semibold">
                        {defender.faction} Victory
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-gray-400">Loss %</div>
                        <div className="text-blue-300 font-bold">
                          {result.defenderCasualties.lossPercentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Ships Lost</div>
                        <div className="text-blue-300 font-bold">
                          {result.defenderCasualties.averageLosses.toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Ships Remaining</div>
                        <div className="text-blue-300 font-bold">
                          {result.defenderCasualties.averageRemaining.toFixed(
                            1
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="text-sm font-bold text-gray-400">
              This simulator is not affiliated with{' '}
              <a
                className="text-blue-400 hover:text-blue-300 underline"
                href="https://startrek.gf9games.com/"
              >
                Gale Force 9 Games
              </a>{' '}
              in any way!
            </div>
          </div>
        </div>

        {/* GitHub Link */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="text-center">
            <a
              href="https://github.com/Ferdinand737/startrek-simulator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
              title="View Source Code on GitHub"
            >
              <img
                src="/github-mark-white.png"
                alt="GitHub"
                className="w-8 h-8 mx-auto"
              />
              <br />
              View Source Code on GitHub
            </a>
          </div>
        </div>


      </div>

      {/* Copy Feedback Popup */}
      {copyFeedback && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {copyFeedback}
        </div>
      )}
    </div>
  );
}
