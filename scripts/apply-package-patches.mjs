import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  'v.rcbCompleted || (v.rcbCancelled = !0, v.closeCheckout(), F());',
  'this.rcbCompleted = !0, u == null || u()',
  'if (e.paddleService.rcbCancelled) return;',
  'displayMode: "inline",\n    variant: "express",',
];

/**
 * `next dev --webpack` keys its cache on package name and version, so it keeps serving the
 * unpatched SDK after the file changes in place. Drop the cache whenever the bundle changes.
 */
function clearNextWebpackCache() {
  for (const dir of ['.next/dev/cache/webpack', '.next/cache/webpack']) rmSync(resolve(dir), { recursive: true, force: true });
}

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
// because patch-package cannot apply the full patch over part of itself. Each step matches only
// the text from before its change, so steps already applied are skipped, whichever copy is installed.
const cancelHook = `      y && (p.rcbCancelCheckout = () => {
        v.rcbCompleted || (v.rcbCancelled = !0, v.closeCheckout(), F());
      });
`;
const upgrades = [
  {
    // In-page checkout uses Paddle's express variant: one-tap wallet buttons, then "Pay another way" for the card form.
    from: `    displayMode: "inline",
    frameTarget: ig,`,
    to: `    displayMode: "inline",
    variant: "express",
    frameTarget: ig,`,
  },
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
      const D = this.createCheckoutOnFinishedHandler(`,
    to: `      y || C.addEventListener("popstate", F);
${cancelHook}      const D = this.createCheckoutOnFinishedHandler(`,
  },
  {
    // The first version of the hook could cancel a paid checkout.
    from: `      y && (p.rcbCancelCheckout = () => {
        v.closeCheckout(), F();
      });
`,
    to: cancelHook,
  },
  {
    // Once Paddle reports the payment, the hook no longer cancels.
    from: `            else if (v === Ia.CHECKOUT_COMPLETED) {
              u == null || u(), d.Checkout.close();`,
    to: `            else if (v === Ia.CHECKOUT_COMPLETED) {
              this.rcbCompleted = !0, u == null || u(), d.Checkout.close();`,
  },
  {
    // A checkout cancelled while it was still starting never opens Paddle afterwards.
    from: `      q(d, Z, !0), q(p, "error"), e.onError(Z);
      return;
    }
    try {
      const N = await e.paddleService.purchase({`,
    to: `      q(d, Z, !0), q(p, "error"), e.onError(Z);
      return;
    }
    if (e.paddleService.rcbCancelled) return;
    try {
      const N = await e.paddleService.purchase({`,
  },
];
if (bundle.includes('discountCodeValue = null')) {
  const upgraded = upgrades.reduce((text, { from, to }) => (text.includes(from) ? text.replace(from, to) : text), bundle);
  if (!patchMarkers.every((marker) => upgraded.includes(marker))) {
    console.error('Could not bring the existing RevenueCat patch up to date.');
    process.exit(1);
  }
  writeFileSync(patchedBundle, upgraded);
  clearNextWebpackCache();
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
if (result.status === 0) clearNextWebpackCache();
process.exit(result.status ?? 1);
