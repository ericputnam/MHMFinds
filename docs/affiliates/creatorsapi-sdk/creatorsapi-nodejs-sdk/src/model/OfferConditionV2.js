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
 * The OfferConditionV2 model module.
 * @module model/OfferConditionV2
 * @version 1.0.0
 */
class OfferConditionV2 {
    /**
     * Constructs a new <code>OfferConditionV2</code>.
     * Specifies the condition of the offer.
     * @alias module:model/OfferConditionV2
     */
    constructor() { 
        
        OfferConditionV2.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>OfferConditionV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferConditionV2} obj Optional instance to populate.
     * @return {module:model/OfferConditionV2} The populated <code>OfferConditionV2</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new OfferConditionV2();

            if (data.hasOwnProperty('value')) {
                obj['value'] = ApiClient.convertToType(data['value'], 'String');
            }
            if (data.hasOwnProperty('subCondition')) {
                obj['subCondition'] = ApiClient.convertToType(data['subCondition'], 'String');
            }
            if (data.hasOwnProperty('conditionNote')) {
                obj['conditionNote'] = ApiClient.convertToType(data['conditionNote'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferConditionV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferConditionV2</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['value'] && !(typeof data['value'] === 'string' || data['value'] instanceof String)) {
            throw new Error("Expected the field `value` to be a primitive type in the JSON string but got " + data['value']);
        }
        // ensure the json data is a string
        if (data['subCondition'] && !(typeof data['subCondition'] === 'string' || data['subCondition'] instanceof String)) {
            throw new Error("Expected the field `subCondition` to be a primitive type in the JSON string but got " + data['subCondition']);
        }
        // ensure the json data is a string
        if (data['conditionNote'] && !(typeof data['conditionNote'] === 'string' || data['conditionNote'] instanceof String)) {
            throw new Error("Expected the field `conditionNote` to be a primitive type in the JSON string but got " + data['conditionNote']);
        }

        return true;
    }


}



/**
 * @member {String} value
 */
OfferConditionV2.prototype['value'] = undefined;

/**
 * @member {String} subCondition
 */
OfferConditionV2.prototype['subCondition'] = undefined;

/**
 * @member {String} conditionNote
 */
OfferConditionV2.prototype['conditionNote'] = undefined;






export default OfferConditionV2;

