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
 * The LanguageType model module.
 * @module model/LanguageType
 * @version 1.0.0
 */
class LanguageType {
    /**
     * Constructs a new <code>LanguageType</code>.
     * Container for language type used to describe the language value associated with the item.
     * @alias module:model/LanguageType
     */
    constructor() { 
        
        LanguageType.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>LanguageType</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/LanguageType} obj Optional instance to populate.
     * @return {module:model/LanguageType} The populated <code>LanguageType</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new LanguageType();

            if (data.hasOwnProperty('displayValue')) {
                obj['displayValue'] = ApiClient.convertToType(data['displayValue'], 'String');
            }
            if (data.hasOwnProperty('type')) {
                obj['type'] = ApiClient.convertToType(data['type'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>LanguageType</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>LanguageType</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['displayValue'] && !(typeof data['displayValue'] === 'string' || data['displayValue'] instanceof String)) {
            throw new Error("Expected the field `displayValue` to be a primitive type in the JSON string but got " + data['displayValue']);
        }
        // ensure the json data is a string
        if (data['type'] && !(typeof data['type'] === 'string' || data['type'] instanceof String)) {
            throw new Error("Expected the field `type` to be a primitive type in the JSON string but got " + data['type']);
        }

        return true;
    }


}



/**
 * @member {String} displayValue
 */
LanguageType.prototype['displayValue'] = undefined;

/**
 * @member {String} type
 */
LanguageType.prototype['type'] = undefined;






export default LanguageType;

