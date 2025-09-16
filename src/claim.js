#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { execSync, spawnSync } from 'child_process';
import { createInterface } from 'readline';
import { Spinner } from './spinner.js';
import { isValidNpmPackageName } from './validate.js';
import { config } from 'dotenv';
import speakeasy from 'speakeasy';

config();

const TEMPLATE_PATH = 'template/package.json';
const TEMPLATE_PLACEHOLDER = 'PACKAGE_NAME';

function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function checkAvailability(packageName, spinner) {
  try {
    execSync(`npm view "${packageName}" > /dev/null 2>&1`, { stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}

async function claimPackage(packageName) {
  const spinner = new Spinner('');

  console.log('\nNPM Package Claimer');
  console.log('');

  if (!packageName) {
    packageName = await prompt('Enter package name: ');

    if (!packageName) {
      console.log('\n✗ No package name provided');
      process.exit(1);
    }
  }

  const { isValid, reason } = isValidNpmPackageName(packageName);
  if (!isValid) {
    console.log(`\n✗ Invalid package name: ${reason}`);
    process.exit(1);
  }

  spinner.update(`Checking availability of '${packageName}'`);
  spinner.start();

  const isAvailable = await checkAvailability(packageName, spinner);
  spinner.stop();

  if (!isAvailable) {
    console.log(`✗ Package '${packageName}' already exists on npm`);
    process.exit(1);
  }

  console.log(`✓ Package '${packageName}' is available`);

  try {
    const packageJson = await readFile(TEMPLATE_PATH, 'utf8');

    if (!packageJson.includes(TEMPLATE_PLACEHOLDER)) {
      console.log(`\n✗ Template error: missing ${TEMPLATE_PLACEHOLDER} placeholder`);
      process.exit(1);
    }

    spinner.update('Preparing package');
    spinner.start();

    const updatedPackageJson = packageJson.replace(
      new RegExp(TEMPLATE_PLACEHOLDER, 'g'),
      packageName
    );
    await writeFile(TEMPLATE_PATH, updatedPackageJson);

    spinner.stop();
    console.log('✓ Package prepared');

    spinner.update(`Publishing '${packageName}' to npm`);
    spinner.start();

    try {
      const args = ['publish'];
      const otpSecret = process.env.NPM_OTP_SECRET || process.env.NPM_OTP;

      if (otpSecret && otpSecret.trim()) {
        let otp;
        if (otpSecret.length > 10 && /^[A-Z2-7]+$/.test(otpSecret)) {
          otp = speakeasy.totp({
            secret: otpSecret,
            encoding: 'base32'
          });
        } else {
          otp = otpSecret;
        }
        args.push('--otp', otp);
      }

      const result = spawnSync('npm', args, {
        cwd: 'template',
        encoding: 'utf8',
        shell: true
      });

      if (result.status === 0) {
        spinner.stop();
        console.log(`✓ Successfully claimed '${packageName}'`);
        console.log(`\n→ https://www.npmjs.com/package/${packageName}\n`);
      } else {
        throw new Error(result.stderr || result.stdout || 'npm publish failed');
      }
    } catch (error) {
      spinner.stop();

      const errorString = error.message || error.toString();

      if (errorString.includes('EOTP') || errorString.includes('one-time') || errorString.includes('This operation requires')) {
        console.log(`\n✗ 2FA required`);
        console.log('');
        console.log('Options:');
        console.log('1. Add NPM_OTP_SECRET to .env for automatic OTP');
        console.log('2. Enter OTP manually below');
        console.log('');
        console.log('→ Get OTP from: https://www.npmjs.com/settings/~/profile');

        const otp = await prompt('\nEnter OTP (or press Enter to skip): ');

        if (otp) {
          try {
            spinner.update('Publishing with OTP');
            spinner.start();

            const retryResult = spawnSync('npm', ['publish', '--otp', otp], {
              cwd: 'template',
              encoding: 'utf8',
              shell: true
            });

            if (retryResult.status !== 0) {
              throw new Error(retryResult.stderr || 'Failed with OTP');
            }

            spinner.stop();
            console.log(`✓ Successfully claimed '${packageName}'`);
            console.log(`\n→ https://www.npmjs.com/package/${packageName}\n`);
            return;
          } catch (retryError) {
            spinner.stop();
            console.log(`✗ Failed to publish with provided OTP`);
            throw retryError;
          }
        } else {
          console.log('\nSkipped. Package prepared but not published.');
        }
      } else {
        console.log(`✗ Failed to publish package`);
        console.log('\nDebug - Full error:');
        console.log(errorString);
        throw error;
      }
    }
  } catch (error) {
    if (error.message) {
      console.log(`\n✗ Error: ${error.message}`);
    }
  } finally {
    try {
      const packageJson = await readFile(TEMPLATE_PATH, 'utf8');
      const resetPackageJson = packageJson.replace(
        new RegExp(packageName, 'g'),
        TEMPLATE_PLACEHOLDER
      );
      await writeFile(TEMPLATE_PATH, resetPackageJson);
    } catch (resetError) {
      console.log(`✗ Failed to reset template: ${resetError.message}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const packageName = process.argv[2];
  claimPackage(packageName);
}