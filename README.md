# npm-package-checker

Find and claim available npm package names.

## Features

- 3,000+ curated english words
- real-time availability checking
- automatic otp setup
- browser authentication
- package name diagnosis

## Usage

```bash
npm start                    # check availability
npm start -- -all            # show all results
npm run diagnose <name>      # diagnose why a name fails
npm run claim <name>         # claim a package
```

## Setup

```bash
npm install
npm login
npm start
```

## Diagnosis

Before claiming, check if a name is blocked:

```bash
npm run diagnose openchat
```

```
Package Diagnosis

Name: openchat

Validation: passed
Registry: not found
Status: blocked
Reason: too similar to existing package

Conflicting packages:
  - open-chat

Both normalize to "openchat"
```

NPM blocks names that normalize to the same string after removing hyphens and underscores.

## Claiming

```bash
npm run claim <name>
```

Option 1 - automatic otp:
- get secret from npmjs.com/settings/profile
- paste when prompted
- future claims work automatically

Option 2 - browser auth:
- follow the authentication link
- complete in browser

## Files

```
data/word.txt         input words
data/available.txt    available packages
src/check.js          availability checker
src/claim.js          package claimer
src/diagnose.js       name diagnosis
src/validate.js       name validation
template/             claiming template
```

## Warning

Use responsibly. No name squatting. Follow npm terms of service. Only claim what you'll use.

## License

MIT
