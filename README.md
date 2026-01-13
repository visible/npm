```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   📦  npm-package-checker                                    │
│                                                              │
│   find and claim available npm package names                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

```bash
> what is this?

  a minimal tool to check npm package availability
  and claim the good ones before someone else does ⚡

> features?

  ✓ 3,000+ curated english words
  ✓ real-time availability checking
  ✓ automatic otp setup
  ✓ browser authentication
  ✓ template auto-fixing

> usage?

  npm start              # check availability
  npm start -- -all      # show all results
  npm run claim <name>    # claim a package

> setup?

  npm install
  npm login              # authenticate with npm
  npm start              # start checking

> claiming?

  npm run claim <name>

  choose option 1 to setup automatic otp:
  → get secret from npmjs.com/settings/profile
  → paste it when prompted
  → future claims work automatically

  or choose option 2 for browser auth:
  → follow the authentication link
  → complete in browser

> files?

  data/word.txt         → 3,000+ brandable words
  data/available.txt    → found available packages
  src/check.js          → availability checker
  src/claim.js          → package claimer
  template/             → claiming template

> warning?

  ⚠️  use responsibly
  ⚠️  no name squatting
  ⚠️  follow npm terms of service
  ⚠️  only claim what you'll use
```

```
made with ♡ for developers who love clean package names
```