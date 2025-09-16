# NPM Package Checker

Minimal NPM package availability checker.

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

```bash
npm start                # Show available packages only
npm start -- -all        # Show all packages with status
npm start -- -ban        # Show banned/invalid packages
npm run claim            # Claim a package (interactive)
npm run claim <name>     # Claim a package directly
```

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

## Note

If you encounter rate limiting (429 errors), just take a short break before continuing.

## License

[MIT](LICENSE)