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
 * The MultiValuedAttribute model module.
 * @module model/MultiValuedAttribute
 * @version 1.0.0
 */
class MultiValuedAttribute {
    /**
     * Constructs a new <code>MultiValuedAttribute</code>.
     * Container for attributes of multi-valued type.
     * @alias module:model/MultiValuedAttribute
     */
    constructor() { 
        
        MultiValuedAttribute.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>MultiValuedAttribute</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/MultiValuedAttribute} obj Optional instance to populate.
     * @return {module:model/MultiValuedAttribute} The populated <code>MultiValuedAttribute</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new MultiValuedAttribute();

            if (data.hasOwnProperty('displayValues')) {
                obj['displayValues'] = ApiClient.convertToType(data['displayValues'], ['String']);
            }
            if (data.hasOwnProperty('label')) {
                obj['label'] = ApiClient.convertToType(data['label'], 'String');
            }
            if (data.hasOwnProperty('locale')) {
                obj['locale'] = ApiClient.convertToType(data['locale'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>MultiValuedAttribute</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>MultiValuedAttribute</code>.
     */
    static validateJSON(data) {
        // ensure the json data is an array
        if (!Array.isArray(data['displayValues'])) {
            throw new Error("Expected the field `displayValues` to be an array in the JSON data but got " + data['displayValues']);
        }
        // ensure the json data is a string
        if (data['label'] && !(typeof data['label'] === 'string' || data['label'] instanceof String)) {
            throw new Error("Expected the field `label` to be a primitive type in the JSON string but got " + data['label']);
        }
        // ensure the json data is a string
        if (data['locale'] && !(typeof data['locale'] === 'string' || data['locale'] instanceof String)) {
            throw new Error("Expected the field `locale` to be a primitive type in the JSON string but got " + data['locale']);
        }

        return true;
    }


}



/**
 * List of primitive string type.
 * @member {Array.<String>} displayValues
 */
MultiValuedAttribute.prototype['displayValues'] = undefined;

/**
 * @member {String} label
 */
MultiValuedAttribute.prototype['label'] = undefined;

/**
 * @member {String} locale
 */
MultiValuedAttribute.prototype['locale'] = undefined;






export default MultiValuedAttribute;

