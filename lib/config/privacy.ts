export interface PrivacyConfig {
  // Timing settings
  minDelay: number; // Minimum delay between requests (ms)
  maxDelay: number; // Maximum delay between requests (ms)
  jitterRange: number; // Additional random jitter (ms)
  
  // Session management
  maxRequestsPerSession: number; // Rotate after N requests
  sessionTimeout: number; // Rotate after N minutes
  
  // Request patterns
  enableRandomReferers: boolean; // Add random referer headers
  enableGeographicRotation: boolean; // Rotate geographic locations
  enableProxyRotation: boolean; // Use proxy rotation
  
  // User agent settings
  userAgentRotation: boolean; // Rotate user agents
  acceptHeaderRotation: boolean; // Rotate accept headers
  languageRotation: boolean; // Rotate language preferences
  
  // Anti-detection
  enableRequestRandomization: boolean; // Randomize request patterns
  enableHeaderRandomization: boolean; // Randomize headers
  enableTimingRandomization: boolean; // Randomize timing patterns
}

export const defaultPrivacyConfig: PrivacyConfig = {
  // Timing settings
  minDelay: 3000, // 3 seconds minimum
  maxDelay: 8000, // 8 seconds maximum
  jitterRange: 2000, // Up to 2 seconds jitter
  
  // Session management
  maxRequestsPerSession: 50, // Rotate after 50 requests
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  
  // Request patterns
  enableRandomReferers: true,
  enableGeographicRotation: false, // Disabled by default
  enableProxyRotation: false, // Disabled by default
  
  // User agent settings
  userAgentRotation: true,
  acceptHeaderRotation: true,
  languageRotation: true,
  
  // Anti-detection
  enableRequestRandomization: true,
  enableHeaderRandomization: true,
  enableTimingRandomization: true,
};

// Advanced privacy configuration for maximum stealth
export const stealthPrivacyConfig: PrivacyConfig = {
  ...defaultPrivacyConfig,
  minDelay: 5000, // 5 seconds minimum
  maxDelay: 15000, // 15 seconds maximum
  jitterRange: 5000, // Up to 5 seconds jitter
  maxRequestsPerSession: 25, // Rotate more frequently
  sessionTimeout: 15 * 60 * 1000, // 15 minutes
  enableGeographicRotation: true,
  enableProxyRotation: true,
};

// Conservative privacy configuration for safety
export const conservativePrivacyConfig: PrivacyConfig = {
  ...defaultPrivacyConfig,
  minDelay: 10000, // 10 seconds minimum
  maxDelay: 30000, // 30 seconds maximum
  jitterRange: 10000, // Up to 10 seconds jitter
  maxRequestsPerSession: 20, // Rotate very frequently
  sessionTimeout: 10 * 60 * 1000, // 10 minutes
  enableGeographicRotation: true,
  enableProxyRotation: true,
};

// Get configuration based on environment
export function getPrivacyConfig(): PrivacyConfig {
  const env = process.env.NODE_ENV || 'development';
  const privacyLevel = process.env.PRIVACY_LEVEL || 'default';
  
  switch (privacyLevel) {
    case 'stealth':
      return stealthPrivacyConfig;
    case 'conservative':
      return conservativePrivacyConfig;
    case 'default':
    default:
      return defaultPrivacyConfig;
  }
}
