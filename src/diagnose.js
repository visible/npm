#!/usr/bin/env node

import { isValidNpmPackageName } from './validate.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';

async function checkExists(name) {
  const res = await fetch(`${NPM_REGISTRY}/${name}`);
  if (res.status === 200) {
    const data = await res.json();
    return { exists: true, data };
  }
  return { exists: false };
}

async function searchSimilar(name) {
  const variants = [
    name,
    name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
    name.replace(/(.{4})/g, '$1-').replace(/-$/, '')
  ];

  const results = [];
  for (const variant of [...new Set(variants)]) {
    const res = await fetch(`${NPM_REGISTRY}/-/v1/search?text=${variant}&size=20`);
    const data = await res.json();
    results.push(...(data.objects || []));
  }

  const seen = new Set();
  return results.filter(obj => {
    if (seen.has(obj.package.name)) return false;
    seen.add(obj.package.name);
    return true;
  });
}

function normalize(name) {
  return name.replace(/[-_]/g, '').toLowerCase();
}

function findConflicts(name, packages) {
  const normalized = normalize(name);
  return packages.filter(pkg => {
    const pkgName = pkg.package.name;
    if (pkgName.startsWith('@')) return false;
    const pkgNormalized = normalize(pkgName);
    return pkgNormalized === normalized && pkgName !== name;
  });
}

async function diagnose(name) {
  console.log('\nPackage Diagnosis\n');
  console.log(`Name: ${name}\n`);

  const validation = isValidNpmPackageName(name);
  if (!validation.isValid) {
    console.log(`Status: Invalid`);
    console.log(`Reason: ${validation.reason}`);
    return;
  }
  console.log('Validation: passed');

  const { exists, data } = await checkExists(name);
  if (exists) {
    console.log('Status: taken');
    console.log(`Owner: ${data.maintainers?.[0]?.name || 'unknown'}`);
    console.log(`Version: ${data['dist-tags']?.latest || 'unknown'}`);
    return;
  }
  console.log('Registry: not found');

  const similar = await searchSimilar(name);
  const conflicts = findConflicts(name, similar);

  if (conflicts.length > 0) {
    console.log('Status: blocked');
    console.log('Reason: too similar to existing package');
    console.log('\nConflicting packages:');
    conflicts.forEach(pkg => {
      console.log(`  - ${pkg.package.name}`);
    });
    console.log('\nNPM blocks names that normalize to the same string.');
    console.log(`"${name}" and "${conflicts[0].package.name}" both normalize to "${normalize(name)}"`);
    return;
  }

  function generateHyphenated(str) {
    const results = [];
    for (let i = 1; i < str.length; i++) {
      results.push(str.slice(0, i) + '-' + str.slice(i));
    }
    return results;
  }

  const variants = [
    name.replace(/-/g, ''),
    name.replace(/_/g, ''),
    name + 'js',
    name + '-js',
    'node-' + name,
    ...generateHyphenated(name.replace(/-/g, ''))
  ].filter(v => v !== name);

  const taken = [];
  for (const variant of [...new Set(variants)]) {
    const check = await checkExists(variant);
    if (check.exists) taken.push(variant);
  }

  const blocking = taken.filter(t => normalize(t) === normalize(name));

  if (blocking.length > 0) {
    console.log('Status: blocked');
    console.log('Reason: too similar to existing package');
    console.log('\nConflicting packages:');
    blocking.forEach(t => console.log(`  - ${t}`));
    console.log(`\nBoth normalize to "${normalize(name)}"`);
  } else if (taken.length > 0) {
    console.log('Status: likely available');
    console.log('\nSimilar packages exist:');
    taken.forEach(t => console.log(`  - ${t}`));
  } else {
    console.log('Status: available');
  }
}

const name = process.argv[2];
if (!name) {
  console.log('Usage: node src/diagnose.js <package-name>');
  process.exit(1);
}

diagnose(name).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
