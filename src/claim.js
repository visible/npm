#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { spawnSync } from 'child_process';
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

async function checkAvailability(packageName) {
  try {
    const result = spawnSync('npm', ['view', packageName], { 
      stdio: 'ignore' 
    });
    return result.status !== 0;
  } catch {
    return true;
  }
}

async function checkAuth() {
  const result = spawnSync('npm', ['whoami'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  });
  
  if (result.status !== 0) {
    return null;
  }
  
  return result.stdout.trim();
}

async function publishPackage(otp = null) {
  const args = ['publish', '--no-interactive'];
  if (otp) {
    args.push('--otp', otp);
  }

  const result = spawnSync('npm', args, {
    cwd: 'template',
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: 'true' }
  });

  return {
    success: result.status === 0,
    output: (result.stdout || '') + (result.stderr || '')
  };
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

  spinner.update('Checking NPM authentication');
  spinner.start();
  
  const username = await checkAuth();
  spinner.stop();
  
  if (!username) {
    console.log('✗ Not logged into NPM');
    console.log('');
    console.log('Please login first:');
    console.log('  npm login');
    console.log('');
    process.exit(1);
  }
  
  console.log(`✓ Logged in as: ${username}`);

  spinner.update(`Checking availability of '${packageName}'`);
  spinner.start();

  const isAvailable = await checkAvailability(packageName);
  spinner.stop();

  if (!isAvailable) {
    console.log(`✗ Package '${packageName}' already exists on npm`);
    process.exit(1);
  }

  console.log(`✓ Package '${packageName}' is available`);

  spinner.update('Preparing package');
  spinner.start();

  try {
    const packageJson = await readFile(TEMPLATE_PATH, 'utf8');

    if (!packageJson.includes(TEMPLATE_PLACEHOLDER)) {
      spinner.update('Fixing template');
      
      const nameMatch = packageJson.match(/"name":\s*"([^"]+)"/);
      if (nameMatch && nameMatch[1] !== TEMPLATE_PLACEHOLDER) {
        const fixedPackageJson = packageJson.replace(
          `"name": "${nameMatch[1]}"`,
          `"name": "${TEMPLATE_PLACEHOLDER}"`
        );
        await writeFile(TEMPLATE_PATH, fixedPackageJson);
        console.log('✓ Template auto-fixed');
        
        const updatedPackageJson = fixedPackageJson.replace(
          new RegExp(TEMPLATE_PLACEHOLDER, 'g'),
          packageName
        );
        await writeFile(TEMPLATE_PATH, updatedPackageJson);
      } else {
        spinner.stop();
        console.log(`\n✗ Template error: missing ${TEMPLATE_PLACEHOLDER} placeholder`);
        process.exit(1);
      }
    } else {
      const updatedPackageJson = packageJson.replace(
        new RegExp(TEMPLATE_PLACEHOLDER, 'g'),
        packageName
      );
      await writeFile(TEMPLATE_PATH, updatedPackageJson);
    }

    spinner.stop();
    console.log('✓ Package prepared');
  } catch (error) {
    spinner.stop();
    console.log(`\n✗ Error preparing package: ${error.message}`);
    process.exit(1);
  }

  spinner.update(`Publishing '${packageName}' to npm`);
  spinner.start();

  const otpSecret = process.env.NPM_OTP_SECRET;
  let otp = null;

  if (otpSecret?.trim()) {
    try {
      if (otpSecret.length > 10 && /^[A-Z2-7]+$/.test(otpSecret)) {
        otp = speakeasy.totp({
          secret: otpSecret,
          encoding: 'base32'
        });
      } else {
        otp = otpSecret;
      }
    } catch (error) {
      console.log(`\n⚠ Warning: Could not generate OTP from secret: ${error.message}`);
    }
  }

  const result = await publishPackage(otp);
  spinner.stop();

  if (result.success) {
    console.log(`✓ Successfully claimed '${packageName}'`);
    console.log(`\n→ https://www.npmjs.com/package/${packageName}\n`);
  } else {
    const output = result.output;
    
    if (output.includes('Authenticate your account') || output.includes('npmjs.com/auth/cli') || output.includes('EOTP') || output.includes('one-time password') || output.trim() === '') {
      console.log('✗ Authentication required');
      console.log('');
      console.log('Choose an option:');
      console.log('');
      console.log('1. Set up automatic OTP (recommended)');
      console.log('   → One-time setup for future claims');
      console.log('');
      console.log('2. Browser authentication');
      console.log('   → Get authentication link');
      console.log('');

      const choice = await prompt('Enter 1 or 2: ');

      if (choice === '1') {
        console.log('');
        console.log('Setting up automatic OTP:');
        console.log('');
        console.log('1. Go to your NPM account settings');
        console.log('2. Find "Two-Factor Authentication" section');
        console.log('3. Copy the base32 secret key (not the QR code)');
        console.log('');
        
        const secret = await prompt('Paste your NPM OTP secret key: ');
        
        if (secret?.trim()) {
          try {
            const envContent = await readFile('.env', 'utf8').catch(() => '');
            const lines = envContent.split('\n').filter(line => !line.startsWith('NPM_OTP_SECRET='));
            lines.push(`NPM_OTP_SECRET=${secret.trim()}`);
            await writeFile('.env', lines.filter(line => line.trim()).join('\n') + '\n');
            
            console.log('');
            console.log('✓ OTP secret saved to .env');
            console.log('');
            
            spinner.update('Publishing with automatic OTP');
            spinner.start();

            let otp;
            try {
              otp = speakeasy.totp({
                secret: secret.trim(),
                encoding: 'base32'
              });
            } catch {
              spinner.stop();
              console.log('✗ Invalid OTP secret format');
              console.log('Please check the secret key and try again.');
              return;
            }

            const retryResult = await publishPackage(otp);
            spinner.stop();

            if (retryResult.success) {
              console.log(`✓ Successfully claimed '${packageName}'`);
              console.log(`\n→ https://www.npmjs.com/package/${packageName}\n`);
            } else {
              console.log('✗ Failed to publish with automatic OTP');
              console.log('The secret may be incorrect. Please verify and try again.');
            }
          } catch (error) {
            console.log(`✗ Error saving OTP secret: ${error.message}`);
          }
        } else {
          console.log('\nSkipped. No secret provided.');
        }
      } else if (choice === '2') {
        const authResult = spawnSync('npm', ['publish'], {
          cwd: 'template',
          stdio: 'inherit'
        });
        
        if (authResult.status === 0) {
          console.log(`✓ Successfully claimed '${packageName}'`);
          console.log(`\n→ https://www.npmjs.com/package/${packageName}\n`);
        } else {
          console.log('\n✗ Authentication may have failed or was cancelled');
          console.log(`Run 'npm run claim ${packageName}' to try again.`);
        }
      } else {
        console.log('\nSkipped. Package prepared but not published.');
        console.log(`Run 'npm run claim ${packageName}' to try again.`);
      }
    } else {
      console.log('✗ Failed to publish package');
      console.log('');
      if (output.trim()) {
        console.log('Error:', output.trim());
      }
      console.log(`\nRun 'npm run claim ${packageName}' to try again.`);
    }
  }

  try {
    const packageJson = await readFile(TEMPLATE_PATH, 'utf8');
    const resetPackageJson = packageJson.replace(
      new RegExp(packageName, 'g'),
      TEMPLATE_PLACEHOLDER
    );
    await writeFile(TEMPLATE_PATH, resetPackageJson);
  } catch (resetError) {
    console.log(`⚠ Warning: Failed to reset template: ${resetError.message}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const packageName = process.argv[2];
  claimPackage(packageName);
}