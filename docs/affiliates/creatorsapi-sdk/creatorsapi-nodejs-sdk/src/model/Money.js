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
 * The Money model module.
 * @module model/Money
 * @version 1.0.0
 */
class Money {
    /**
     * Constructs a new <code>Money</code>.
     * Used to return the information about the Money value or amount. Consists of the integral value, the currency codes and the formatted price which can be used for display purposes.
     * @alias module:model/Money
     */
    constructor() { 
        
        Money.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>Money</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Money} obj Optional instance to populate.
     * @return {module:model/Money} The populated <code>Money</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new Money();

            if (data.hasOwnProperty('amount')) {
                obj['amount'] = ApiClient.convertToType(data['amount'], 'Number');
            }
            if (data.hasOwnProperty('currency')) {
                obj['currency'] = ApiClient.convertToType(data['currency'], 'String');
            }
            if (data.hasOwnProperty('displayAmount')) {
                obj['displayAmount'] = ApiClient.convertToType(data['displayAmount'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>Money</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>Money</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['currency'] && !(typeof data['currency'] === 'string' || data['currency'] instanceof String)) {
            throw new Error("Expected the field `currency` to be a primitive type in the JSON string but got " + data['currency']);
        }
        // ensure the json data is a string
        if (data['displayAmount'] && !(typeof data['displayAmount'] === 'string' || data['displayAmount'] instanceof String)) {
            throw new Error("Expected the field `displayAmount` to be a primitive type in the JSON string but got " + data['displayAmount']);
        }

        return true;
    }


}



/**
 * @member {Number} amount
 */
Money.prototype['amount'] = undefined;

/**
 * @member {String} currency
 */
Money.prototype['currency'] = undefined;

/**
 * @member {String} displayAmount
 */
Money.prototype['displayAmount'] = undefined;






export default Money;

