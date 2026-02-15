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
 * The OfferAvailabilityV2 model module.
 * @module model/OfferAvailabilityV2
 * @version 1.0.0
 */
class OfferAvailabilityV2 {
    /**
     * Constructs a new <code>OfferAvailabilityV2</code>.
     * Specifies availability information about an offer.
     * @alias module:model/OfferAvailabilityV2
     */
    constructor() { 
        
        OfferAvailabilityV2.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>OfferAvailabilityV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferAvailabilityV2} obj Optional instance to populate.
     * @return {module:model/OfferAvailabilityV2} The populated <code>OfferAvailabilityV2</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new OfferAvailabilityV2();

            if (data.hasOwnProperty('message')) {
                obj['message'] = ApiClient.convertToType(data['message'], 'String');
            }
            if (data.hasOwnProperty('maxOrderQuantity')) {
                obj['maxOrderQuantity'] = ApiClient.convertToType(data['maxOrderQuantity'], 'Number');
            }
            if (data.hasOwnProperty('minOrderQuantity')) {
                obj['minOrderQuantity'] = ApiClient.convertToType(data['minOrderQuantity'], 'Number');
            }
            if (data.hasOwnProperty('type')) {
                obj['type'] = ApiClient.convertToType(data['type'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferAvailabilityV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferAvailabilityV2</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['message'] && !(typeof data['message'] === 'string' || data['message'] instanceof String)) {
            throw new Error("Expected the field `message` to be a primitive type in the JSON string but got " + data['message']);
        }
        // ensure the json data is a string
        if (data['type'] && !(typeof data['type'] === 'string' || data['type'] instanceof String)) {
            throw new Error("Expected the field `type` to be a primitive type in the JSON string but got " + data['type']);
        }

        return true;
    }


}



/**
 * @member {String} message
 */
OfferAvailabilityV2.prototype['message'] = undefined;

/**
 * @member {Number} maxOrderQuantity
 */
OfferAvailabilityV2.prototype['maxOrderQuantity'] = undefined;

/**
 * @member {Number} minOrderQuantity
 */
OfferAvailabilityV2.prototype['minOrderQuantity'] = undefined;

/**
 * @member {String} type
 */
OfferAvailabilityV2.prototype['type'] = undefined;






export default OfferAvailabilityV2;

