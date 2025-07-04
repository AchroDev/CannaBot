🧾 Credits
Built with ❤️ and 🍃 by [AchroDev](https://github.com/AchroDev)

---

### 📄 `CHANGELOG.md`

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.0] - 2025-07-04

### Added
- **Slash Command Handler**: Implemented a dynamic, file-based handler for modern slash commands.
- **Event Handler**: Added a dynamic handler for Discord client events (e.g., `ready`, `interactionCreate`).
- **MongoDB Integration**: Connected the bot to a MongoDB Atlas database using Mongoose for persistent data storage.
- **User Profile System**:
    - Created a `User` schema to store player data (level, XP, coins, inventory, plots).
    - Implemented the `/profile` command to view player stats and inventory.
- **Shop & Economy System**:
    - Created a `/shop` command with `list`, `buy`, and `sell` subcommands.
    - Implemented a category filter for `/shop list` and `/shop buy` for better UX.
    - Added a `quantity` option to buy and sell multiple items at once.
- **Farming & Core Gameplay Loop**:
    - Implemented the `/grow` command with `plant` and `harvest` subcommands.
    - Added a `/grow status` subcommand to allow players to check on their growing plants at any time.
- **Leveling & Progression System**:
    - Created a utility to manage XP requirements and the level-up process.
    - Players now gain XP from harvesting plants.
    - A public announcement and coin reward are given upon leveling up.
- **Item & Data Structure**:
    - Created a scalable, centralized data structure for all game items (`seeds`, `nutrients`).
    - Added seasonal items ("Freedom Bloom").
- **Autocomplete Functionality**:
    - Implemented smart autocomplete for `/grow plant` and `/shop sell` to only show items from the user's inventory.
    - Added autocomplete for `/shop buy` to suggest all purchasable items, filtered by category.

### Changed
- **Major Refactor**: Migrated bot from an outdated `messageCreate` (prefix) command structure to a modern `InteractionCreate` (slash command) structure.
- **Data Structure Overhaul**: Replaced the simple `plants.js` utility with a robust, category-based item system in the `/data` directory.
- **API Update**: Updated all interaction replies from the deprecated `ephemeral: true` option to the current standard `flags: [MessageFlags.Ephemeral]`.
- **Bot Startup**: Refactored the bot's startup sequence to connect to MongoDB *before* logging in to Discord, preventing race conditions.
- **Shop UX**: Improved the `/shop buy` workflow by requiring a category selection before showing item suggestions.

### Fixed
- **Authentication**: Resolved `TokenInvalid` error by using the correct Bot Token.
- **Module Exports**: Corrected a `module.-exports` typo that prevented the `ready` event from loading.
- **Command Permissions**: Fixed an issue where slash commands would not appear in a server by generating the bot invite link with the required `applications.commands` scope.
- **Database Connection**: Removed deprecated `useNewUrlParser` and `useUnifiedTopology` options from the Mongoose connection.
- **Autocomplete Logic**:
    - Fixed a bug where `/grow plant` would suggest incorrect or unowned seeds.
    - Fixed an issue where `/shop sell` would incorrectly suggest all items instead of only inventory items.
- **Interaction Failures**:
    - Corrected a typo (`user.Profile.xp`) that caused the `/profile` command to fail silently.
    - Resolved a timing issue where the `/grow plant` confirmation message would sometimes show a negative countdown.

---

## [0.1.0] – Initial Setup

### Added
- Base Discord.js bot setup
- `!ping` and `!smoke` test commands
- Environment config via `.env`
- Ready for Railway deployment