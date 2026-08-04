
export const THROTTLE_TTL = 60_000;

export const THROTTLE_LIMIT = 100;

type ThrottleOverride = Record<string, { limit: number; ttl: number }>;

export const AUTH_THROTTLE: ThrottleOverride = {
  default: { limit: 5, ttl: THROTTLE_TTL },
};

export const REFRESH_THROTTLE: ThrottleOverride = {
  default: { limit: 30, ttl: THROTTLE_TTL },
};

export const SENSITIVE_THROTTLE: ThrottleOverride = {
  default: { limit: 3, ttl: THROTTLE_TTL },
};

export const OTP_VERIFY_THROTTLE: ThrottleOverride = {
  default: { limit: 5, ttl: THROTTLE_TTL },
};
