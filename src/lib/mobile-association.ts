type MobileEnvironment = 'staging' | 'production';

type MobileAssociationConfig = {
  environment: MobileEnvironment;
  appId: string;
  packageName: string;
};

const associationByHost: Record<string, MobileAssociationConfig> = {
  'quiz.preview.nutreeai.com': {
    environment: 'staging',
    appId: 'KB4Q9QGD7M.com.nutreeai.mobile.staging',
    packageName: 'com.nutreeai.mobile.staging',
  },
  'quiz.nutreeai.com': {
    environment: 'production',
    appId: 'KB4Q9QGD7M.com.nutreeai.mobile',
    packageName: 'com.nutreeai.mobile',
  },
};

export const associationResponseHeaders = {
  'Cache-Control': 'public, max-age=300, s-maxage=300',
  'Content-Type': 'application/json',
};

const quizAssociationPaths = [
  '/auth/email-link*',
  '/open-nutree*',
  '/redeem*',
  '/postcheckout*',
];

function normalizedHost(host: string | null): string {
  return (host ?? '').trim().toLowerCase().split(':')[0];
}

function configForHost(host: string | null): MobileAssociationConfig | null {
  return associationByHost[normalizedHost(host)] ?? null;
}

export function mobileEnvironmentForHost(host: string | null): MobileEnvironment | null {
  return configForHost(host)?.environment ?? null;
}

export function appleAssociationForHost(host: string | null) {
  const config = configForHost(host);
  if (!config) return null;

  return {
    applinks: {
      apps: [],
      details: [{ appID: config.appId, paths: quizAssociationPaths }],
    },
  };
}

export function sha256Fingerprints(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[\n,]/)
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);
}

export function androidAssociationForHost(host: string | null, rawFingerprints?: string) {
  const config = configForHost(host);
  const fingerprints = sha256Fingerprints(
    rawFingerprints ?? process.env.NUTREE_ANDROID_SHA256_CERT_FINGERPRINTS,
  );
  if (!config || fingerprints.length === 0) return [];

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
