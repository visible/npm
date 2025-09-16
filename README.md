# NPM Package Checker

Minimal NPM package availability checker.

## ⚠️ Warning

**This tool must be used in compliance with npm's Terms of Service:**

- **Package name squatting is prohibited** - Do not claim names just to reserve them
- **Automation of npm services is restricted** - Do not modify this tool for mass claiming
- **Name trading is forbidden** - Do not claim names to sell or trade them
- **Use responsibly** - Only claim packages you intend to actively develop

If you encounter rate limiting (429 errors), take a break before continuing.

## Setup

### Environment Configuration (for claiming packages)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your NPM 2FA secret key to `.env`:
   - When setting up 2FA on NPM, save the secret key (base32 string)
   - Add it to `.env` as `NPM_OTP_SECRET=YOUR_SECRET_KEY`
   - The claim command will automatically generate OTP codes

## Usage

<details>
<summary><b>npm</b></summary>

```bash
npm start                # Show available packages only
npm start -- -all        # Show all packages with status
npm start -- -ban        # Show banned/invalid packages
npm run claim            # Claim a package (interactive)
npm run claim <name>     # Claim a package directly
```
</details>

<details>
<summary><b>pnpm</b></summary>

```bash
pnpm start               # Show available packages only
pnpm start -all          # Show all packages with status
pnpm start -ban          # Show banned/invalid packages
pnpm claim               # Claim a package (interactive)
pnpm claim <name>        # Claim a package directly
```
</details>

<details>
<summary><b>bun</b></summary>

```bash
bun run start            # Show available packages only
bun run start -all       # Show all packages with status
bun run start -ban       # Show banned/invalid packages
bun run claim            # Claim a package (interactive)
bun run claim <name>     # Claim a package directly
```
</details>

## Files

- `data/word.txt` - Package names to check (input)
- `data/available.txt` - Available packages (output)
- `src/` - Source code
  - `check.js` - Main checker
  - `claim.js` - Package claimer
  - `validate.js` - Name validation
  - `display.js` - Terminal UI
  - `spinner.js` - Loading animation
- `template/` - Template for claiming packages

## License

[MIT](LICENSE)