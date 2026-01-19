#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { Pool } from 'undici';
import { isValidNpmPackageName } from './validate.js';
import { Spinner } from './spinner.js';
import { Display } from './display.js';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const CONCURRENT_LIMIT = 150;
const REQUEST_TIMEOUT = 5000;

const pool = new Pool(NPM_REGISTRY_URL, {
  connections: CONCURRENT_LIMIT,
  pipelining: 10,
  keepAliveTimeout: 30000
});
const INPUT_FILE = 'data/word.txt';
const OUTPUT_FILE = 'data/available.txt';

const args = process.argv.slice(2);
const showAll = args.includes('-all');
const showBanned = args.includes('-ban');

async function readPackageList(filename) {
  const packages = [];
  const fileStream = createReadStream(filename);
  const rl = createInterface({ input: fileStream });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      packages.push(trimmed);
    }
  }

  return packages;
}

async function checkPackageAvailability(packageName) {
  const { isValid, reason } = isValidNpmPackageName(packageName);
  
  if (!isValid) {
    return {
      name: packageName,
      status: `INVALID (${reason})`
    };
  }

  try {
    const { statusCode } = await pool.request({
      path: `/${packageName}`,
      method: 'HEAD',
      headersTimeout: REQUEST_TIMEOUT,
      bodyTimeout: REQUEST_TIMEOUT
    });

    if (statusCode === 404) {
      return {
        name: packageName,
        status: 'AVAILABLE'
      };
    }

    if (statusCode === 200) {
      return {
        name: packageName,
        status: 'TAKEN'
      };
    }

    return {
      name: packageName,
      status: `UNKNOWN (status: ${statusCode})`
    };
  } catch (error) {
    throw new Error(error.message || 'Request failed');
  }
}

async function processPackages(packages, display) {
  const results = [];
  const semaphore = new Array(CONCURRENT_LIMIT).fill(null);
  let index = 0;
  let completed = 0;
  const spinner = new Spinner('Starting...', display);

  spinner.start();

  const processNext = async () => {
    if (index >= packages.length) return;

    const currentIndex = index++;
    const packageName = packages[currentIndex];

    spinner.update(`Checking ${packageName} (${completed + 1}/${packages.length})`);

    try {
      const result = await checkPackageAvailability(packageName);
      results[currentIndex] = result;

      completed++;

      if (showAll) {
        display.addResult(`${result.name} ${result.status}`);
      } else if (showBanned && result.status.includes('INVALID')) {
        display.addResult(result.name);
      } else if (!showBanned && !showAll && result.status === 'AVAILABLE') {
        display.addResult(`✓ ${result.name} - AVAILABLE`);
      }
    } catch (error) {
      results[currentIndex] = {
        name: packageName,
        status: `ERROR: ${error.message}`
      };
      completed++;
    }

    await processNext();
  };

  await Promise.all(semaphore.map(() => processNext()));

  spinner.stop();

  return results.filter(Boolean);
}

async function saveAvailable(results) {
  const available = results
    .filter(r => r.status === 'AVAILABLE')
    .map(r => r.name);

  if (available.length > 0) {
    await writeFile(OUTPUT_FILE, available.join('\n'));
  }
}

async function main() {
  const startTime = Date.now();

  try {
    const packages = await readPackageList(INPUT_FILE);
    const display = new Display();

    display.init(packages.length);

    const results = await processPackages(packages, display);

    if (!showAll && !showBanned) {
      await saveAvailable(results);
      const available = results.filter(r => r.status === 'AVAILABLE');
      display.showSummary(available.length);
    }

    display.finish();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Completed in ${elapsed}s`);
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}