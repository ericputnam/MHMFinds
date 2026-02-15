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
import OfferListingV2 from './OfferListingV2';

/**
 * The OffersV2 model module.
 * @module model/OffersV2
 * @version 1.0.0
 */
class OffersV2 {
    /**
     * Constructs a new <code>OffersV2</code>.
     * The Offers resource contains various resources related to offer listings and summaries for an item.
     * @alias module:model/OffersV2
     */
    constructor() { 
        
        OffersV2.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>OffersV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OffersV2} obj Optional instance to populate.
     * @return {module:model/OffersV2} The populated <code>OffersV2</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new OffersV2();

            if (data.hasOwnProperty('listings')) {
                obj['listings'] = ApiClient.convertToType(data['listings'], [OfferListingV2]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OffersV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OffersV2</code>.
     */
    static validateJSON(data) {
        if (data['listings']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['listings'])) {
                throw new Error("Expected the field `listings` to be an array in the JSON data but got " + data['listings']);
            }
            // validate the optional field `listings` (array)
            for (const item of data['listings']) {
                OfferListingV2.validateJSON(item);
            };
        }

        return true;
    }


}



/**
 * List of offer listing associated with a product.
 * @member {Array.<module:model/OfferListingV2>} listings
 */
OffersV2.prototype['listings'] = undefined;






export default OffersV2;

