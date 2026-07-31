export type PaddleClientEnvironment = 'live' | 'sandbox';

export interface PaddleClientConfig {
  environment: PaddleClientEnvironment;
  token: string;
}

const ENVIRONMENT_KEY = 'NEXT_PUBLIC_PADDLE_ENVIRONMENT';
const TOKEN_KEY = 'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN';

type EnvironmentSource = Record<string, string | undefined>;

function readPublicEnvironment(): EnvironmentSource {
  return {
    NEXT_PUBLIC_PADDLE_ENVIRONMENT: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT,
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  };
}

export function readPaddleClientConfig(source: EnvironmentSource = readPublicEnvironment()): PaddleClientConfig {
  const environment = source[ENVIRONMENT_KEY];
  const token = source[TOKEN_KEY];

  if (!environment) {
    throw new Error(`${ENVIRONMENT_KEY} is required. Set it to "live" or "sandbox" before loading Paddle.`);
  }

  if (environment !== 'live' && environment !== 'sandbox') {
    throw new Error(`${ENVIRONMENT_KEY} must be "live" or "sandbox". Received "${environment}".`);
  }

  if (!token) {
    throw new Error(`${TOKEN_KEY} is required. Use a Paddle client-side token, not a server API key.`);
  }

  if (environment === 'live' && !token.startsWith('live_')) {
    throw new Error(`${TOKEN_KEY} must start with "live_" when ${ENVIRONMENT_KEY}=live.`);
  }

  if (environment === 'sandbox' && !token.startsWith('test_')) {
    throw new Error(`${TOKEN_KEY} must start with "test_" when ${ENVIRONMENT_KEY}=sandbox.`);
  }

  return { environment, token };
}
