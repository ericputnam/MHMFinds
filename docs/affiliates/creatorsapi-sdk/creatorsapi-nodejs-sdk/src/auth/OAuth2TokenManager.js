/**
 * Copyright 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/**
 * OAuth2TokenManager
 * Manages OAuth2 token lifecycle including acquisition, caching, and refresh
 *
 */

const superagent = require("superagent");

/**
 * OAuth2 token manager that handles token acquisition, caching, and automatic refresh
 * Note: ApiClient automatically manages token caching for optimal performance.
 * Direct instantiation is only needed for advanced use cases.
 * @class OAuth2TokenManager
 */
class OAuth2TokenManager {
    /**
     * Creates an OAuth2TokenManager instance
     * @param {OAuth2Config} config - The OAuth2 configuration
     */
    constructor(config) {
        this.config = config;
        this.accessToken = null;
        this.expiresAt = null;
    }

    /**
     * Gets a valid OAuth2 access token, refreshing if necessary
     * @returns {Promise<string>} A promise that resolves to a valid access token
     * @throws {Error} If token acquisition fails
     */
    async getToken() {
        if (this.isTokenValid()) {
            return this.accessToken;
        }
        return await this.refreshToken();
    }

    /**
     * Checks if the current token is valid and not expired
     * @returns {boolean} True if the token is valid, false otherwise
     */
    isTokenValid() {
        return this.accessToken && this.expiresAt && Date.now() < this.expiresAt;
    }

    /**
     * Refreshes the OAuth2 access token using client credentials grant
     * @returns {Promise<string>} A promise that resolves to the new access token
     * @throws {Error} If token refresh fails
     */
    async refreshToken() {
        try {
            const requestBody = new URLSearchParams({
                'grant_type': this.config.getGrantType(),
                'client_id': this.config.getCredentialId(),
                'client_secret': this.config.getCredentialSecret(),
                'scope': this.config.getScope()
            }).toString();

            const response = await superagent
                .post(this.config.getCognitoEndpoint())
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send(requestBody);

            const data = response.body;
            
            if (!data.access_token) {
                throw new Error('No access token received from OAuth2 endpoint');
            }

            this.accessToken = data.access_token;
            // Set expiration time with a 30-second buffer to avoid edge cases
            const expiresInMs = (data.expires_in - 30) * 1000;
            this.expiresAt = Date.now() + expiresInMs;
            return this.accessToken;
        } catch (error) {
            // Clear existing token on failure
            this.clearToken();
            
            throw error;
        }
    }

    /**
     * Clears the cached token, forcing a refresh on the next getToken() call
     */
    clearToken() {
        this.accessToken = null;
        this.expiresAt = null;
    }
}

module.exports = OAuth2TokenManager;
