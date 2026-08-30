import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve('node_modules/@revenuecat/purchases-js');
const packageManifest = resolve(packageRoot, 'package.json');
const patchedBundle = resolve(packageRoot, 'dist/Purchases.es.js');
const patchMarkers = [
  'discountCodeValue = null',
  'discountIdValue = null',
  'showAddDiscounts: !0',
  'discountCode: i.discountCode',
];

if (!existsSync(packageManifest) || !existsSync(patchedBundle)) {
  console.error('RevenueCat package is missing before patch application.');
  process.exit(1);
}

const packageVersion = JSON.parse(readFileSync(packageManifest, 'utf8')).version;
if (packageVersion !== '1.51.0') {
  console.error(`Unsupported @revenuecat/purchases-js version: ${packageVersion}`);
  process.exit(1);
}

const bundle = readFileSync(patchedBundle, 'utf8');
if (patchMarkers.every((marker) => bundle.includes(marker))) {
  console.log('RevenueCat package patch already applied.');
  process.exit(0);
}

const patchPackage = resolve('node_modules/patch-package/index.js');
const result = spawnSync(process.execPath, [patchPackage, '--error-on-fail'], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not run patch-package: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
