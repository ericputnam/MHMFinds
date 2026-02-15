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

import ApiClient from '../ApiClient';
/**
* Enum class UnauthorizedExceptionReason.
* @enum {}
* @readonly
*/
export default class UnauthorizedExceptionReason {
    
        /**
         * value: "TokenExpired"
         * @const
         */
        "TokenExpired" = "TokenExpired";

    
        /**
         * value: "InvalidToken"
         * @const
         */
        "InvalidToken" = "InvalidToken";

    
        /**
         * value: "InvalidIssuer"
         * @const
         */
        "InvalidIssuer" = "InvalidIssuer";

    
        /**
         * value: "MissingClaim"
         * @const
         */
        "MissingClaim" = "MissingClaim";

    
        /**
         * value: "MissingKeyId"
         * @const
         */
        "MissingKeyId" = "MissingKeyId";

    
        /**
         * value: "UnsupportedClient"
         * @const
         */
        "UnsupportedClient" = "UnsupportedClient";

    
        /**
         * value: "InvalidClient"
         * @const
         */
        "InvalidClient" = "InvalidClient";

    
        /**
         * value: "MissingCredential"
         * @const
         */
        "MissingCredential" = "MissingCredential";

    
        /**
         * value: "Other"
         * @const
         */
        "Other" = "Other";

    

    /**
    * Returns a <code>UnauthorizedExceptionReason</code> enum value from a Javascript object name.
    * @param {Object} data The plain JavaScript object containing the name of the enum value.
    * @return {module:model/UnauthorizedExceptionReason} The enum <code>UnauthorizedExceptionReason</code> value.
    */
    static constructFromObject(object) {
        return object;
    }
}

