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
* Enum class Condition.
* @enum {}
* @readonly
*/
export default class Condition {
    
        /**
         * value: "Any"
         * @const
         */
        "Any" = "Any";

    
        /**
         * value: "New"
         * @const
         */
        "New" = "New";

    

    /**
    * Returns a <code>Condition</code> enum value from a Javascript object name.
    * @param {Object} data The plain JavaScript object containing the name of the enum value.
    * @return {module:model/Condition} The enum <code>Condition</code> value.
    */
    static constructFromObject(object) {
        return object;
    }
}

