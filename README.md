# Star Trek Ascendancy Space Battle Simulator

A web-based probability calculator for Star Trek Ascendancy space battles. This simulator allows you to input battle parameters and run 1000 simulated battles to determine win probabilities for different faction matchups.

## Features

- **8 Complete Factions**: Klingon, Romulan, Breen, Cardassian, Federation, Ferengi, Dominion, and Vulcan
- **Faction-Specific Abilities**: Each faction has unique fleets, advancements, and special abilities
- **Advanced Mechanics**:
  - Fleet-specific effects (reroll 1s, auto-hit first round, etc.)
  - Advancement effects (shield bypass, first strike, reroll mechanics)
  - Territorial abilities (Breen territory bonuses)
  - Counter-technologies (Tachyon Detection Array vs cloaking)
- **Mobile-Friendly Design**: Optimized for both desktop and mobile use
- **Real-Time Simulation**: Runs 1000 battles instantly with detailed probability results

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How to Use

1. **Select Factions**: Choose attacker and defender factions from the dropdown
2. **Configure Setup**: Set weapons, shields, individual ships, and starbase presence
3. **Choose Advancements**: Select faction-specific technological advancements
4. **Add Fleets**: Configure fleet compositions with ship counts
5. **Special Abilities**: Enable faction-specific abilities (like Breen territory bonuses)
6. **Simulate**: Run 1000 battles to see win probabilities

## Technical Details

This is a [Next.js](https://nextjs.org) project built with:

- React 18+ with TypeScript
- Tailwind CSS for styling
- Client-side simulation logic
- No backend required - runs entirely in the browser

## Disclaimer

**This simulator is not affiliated with [Gale Force 9 Games](https://startrek.gf9games.com/) in any way.** This is an independent fan project created to help players calculate battle probabilities for the Star Trek Ascendancy board game.



## License

This project is open source. Feel free to contribute, report issues, or suggest improvements!
