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
 * The OfferLoyaltyPointsV2 model module.
 * @module model/OfferLoyaltyPointsV2
 * @version 1.0.0
 */
class OfferLoyaltyPointsV2 {
    /**
     * Constructs a new <code>OfferLoyaltyPointsV2</code>.
     * Specifies loyalty points in any region against an offer. Right now, only supporting JP marketplace.
     * @alias module:model/OfferLoyaltyPointsV2
     */
    constructor() { 
        
        OfferLoyaltyPointsV2.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>OfferLoyaltyPointsV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferLoyaltyPointsV2} obj Optional instance to populate.
     * @return {module:model/OfferLoyaltyPointsV2} The populated <code>OfferLoyaltyPointsV2</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new OfferLoyaltyPointsV2();

            if (data.hasOwnProperty('points')) {
                obj['points'] = ApiClient.convertToType(data['points'], 'Number');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferLoyaltyPointsV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferLoyaltyPointsV2</code>.
     */
    static validateJSON(data) {

        return true;
    }


}



/**
 * @member {Number} points
 */
OfferLoyaltyPointsV2.prototype['points'] = undefined;






export default OfferLoyaltyPointsV2;

