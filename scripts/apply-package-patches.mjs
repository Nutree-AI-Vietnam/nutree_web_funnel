import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve('node_modules/@revenuecat/purchases-js');
const packageManifest = resolve(packageRoot, 'package.json');
const patchedBundle = resolve(packageRoot, 'dist/Purchases.es.js');
const patchMarkers = [
  'discountCodeValue = null',
  'discountIdValue = null',
  'showAddDiscounts: !0',
  'allowDiscountRemoval: !0',
  'discountCode: i.discountCode',
  'return e.isInElement || (',
  'p.rcbCancelCheckout = ',
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

// An install that already carries an older copy of the patch is brought up to date in place,
// because patch-package cannot apply the full patch over part of itself.
const upgrades = [
  {
    // Paddle discount removal.
    from: `showAddDiscounts: !0,
    showAddTaxId: !1,
    allowDiscountRemoval: !1`,
    to: `showAddDiscounts: !0,
    showAddTaxId: !1,
    allowDiscountRemoval: !0`,
  },
  {
    // Draw Paddle inside the page whenever we pass our own element, whatever RevenueCat's inline setting says.
    from: 'return ((J = o(f)) == null ? void 0 : J.paddle_billing_params.inline_checkout_enabled) ?? !1;',
    to: 'return e.isInElement || (((J = o(f)) == null ? void 0 : J.paddle_billing_params.inline_checkout_enabled) ?? !1);',
  },
  {
    // In-page checkout has no back button, so our sheet's close button cancels through this hook.
    from: `      y || C.addEventListener("popstate", F);
`,
    to: `      y || C.addEventListener("popstate", F);
      y && (p.rcbCancelCheckout = () => {
        v.closeCheckout(), F();
      });
`,
  },
];
if (bundle.includes('discountCodeValue = null')) {
  const upgraded = upgrades.reduce((text, { from, to }) => (text.includes(from) ? text.replace(from, to) : text), bundle);
  if (!patchMarkers.every((marker) => upgraded.includes(marker))) {
    console.error('Could not bring the existing RevenueCat patch up to date.');
    process.exit(1);
  }
  writeFileSync(patchedBundle, upgraded);
  console.log('Brought the existing RevenueCat patch up to date.');
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
