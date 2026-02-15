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
 * OAuth2 configuration class that manages version-specific cognito endpoints
 * @class OAuth2Config
 */
class OAuth2Config {
    // Constants
    static SCOPE = "creatorsapi/default";
    static GRANT_TYPE = "client_credentials";

    /**
     * Creates an OAuth2Config instance
     * @param {string} credentialId - The OAuth2 credential ID
     * @param {string} credentialSecret - The OAuth2 credential secret
     * @param {string} version - The OAuth2 token version (determines the token endpoint)
     * @param {string} authEndpoint - OAuth2 auth endpoint URL
     */
    constructor(credentialId, credentialSecret, version, authEndpoint) {
        this.credentialId = credentialId;
        this.credentialSecret = credentialSecret;
        this.version = version;
        this.authEndpoint = authEndpoint;
        this.cognitoEndpoint = this.determineTokenEndpoint();
    }

    /**
     * Determines the token endpoint to use
     * @returns {string} The OAuth2 token endpoint URL
     * @throws {Error} If the version is not supported and no custom authEndpoint is provided
     */
    determineTokenEndpoint() {
        // Custom authEndpoint used for testing
        if (this.authEndpoint) {
            return this.authEndpoint;
        }
        
        switch (this.version) {
            case "2.1":
                return "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token";
            case "2.2":
                return "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token";
            case "2.3":
                return "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token";
            default:
                throw new Error(`Unsupported version: ${this.version}. Supported versions are: 2.1, 2.2, 2.3`);
        }
    }

    /**
     * Gets the credential ID
     * @returns {string} The credential ID
     */
    getCredentialId() {
        return this.credentialId;
    }

    /**
     * Gets the credential secret
     * @returns {string} The credential secret
     */
    getCredentialSecret() {
        return this.credentialSecret;
    }

    /**
     * Gets the credential version
     * @returns {string} The credential version
     */
    getVersion() {
        return this.version;
    }

    /**
     * Gets the Cognito token endpoint URL
     * @returns {string} The token endpoint URL
     */
    getCognitoEndpoint() {
        return this.cognitoEndpoint;
    }

    /**
     * Gets the OAuth2 scope
     * @returns {string} The OAuth2 scope
     */
    getScope() {
        return OAuth2Config.SCOPE;
    }

    /**
     * Gets the OAuth2 grant type
     * @returns {string} The OAuth2 grant type
     */
    getGrantType() {
        return OAuth2Config.GRANT_TYPE;
    }
}

module.exports = OAuth2Config;
