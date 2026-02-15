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
import DealDetails from './DealDetails';
import OfferAvailabilityV2 from './OfferAvailabilityV2';
import OfferConditionV2 from './OfferConditionV2';
import OfferLoyaltyPointsV2 from './OfferLoyaltyPointsV2';
import OfferMerchantInfoV2 from './OfferMerchantInfoV2';
import OfferPriceV2 from './OfferPriceV2';
import OfferType from './OfferType';

/**
 * The OfferListingV2 model module.
 * @module model/OfferListingV2
 * @version 1.0.0
 */
class OfferListingV2 {
    /**
     * Constructs a new <code>OfferListingV2</code>.
     * Specifies about various offer listings associated with the product.
     * @alias module:model/OfferListingV2
     */
    constructor() { 
        
        OfferListingV2.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>OfferListingV2</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferListingV2} obj Optional instance to populate.
     * @return {module:model/OfferListingV2} The populated <code>OfferListingV2</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new OfferListingV2();

            if (data.hasOwnProperty('availability')) {
                obj['availability'] = OfferAvailabilityV2.constructFromObject(data['availability']);
            }
            if (data.hasOwnProperty('condition')) {
                obj['condition'] = OfferConditionV2.constructFromObject(data['condition']);
            }
            if (data.hasOwnProperty('dealDetails')) {
                obj['dealDetails'] = DealDetails.constructFromObject(data['dealDetails']);
            }
            if (data.hasOwnProperty('isBuyBoxWinner')) {
                obj['isBuyBoxWinner'] = ApiClient.convertToType(data['isBuyBoxWinner'], 'Boolean');
            }
            if (data.hasOwnProperty('loyaltyPoints')) {
                obj['loyaltyPoints'] = OfferLoyaltyPointsV2.constructFromObject(data['loyaltyPoints']);
            }
            if (data.hasOwnProperty('merchantInfo')) {
                obj['merchantInfo'] = OfferMerchantInfoV2.constructFromObject(data['merchantInfo']);
            }
            if (data.hasOwnProperty('price')) {
                obj['price'] = OfferPriceV2.constructFromObject(data['price']);
            }
            if (data.hasOwnProperty('type')) {
                obj['type'] = OfferType.constructFromObject(data['type']);
            }
            if (data.hasOwnProperty('violatesMAP')) {
                obj['violatesMAP'] = ApiClient.convertToType(data['violatesMAP'], 'Boolean');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferListingV2</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferListingV2</code>.
     */
    static validateJSON(data) {
        // validate the optional field `availability`
        if (data['availability']) { // data not null
          OfferAvailabilityV2.validateJSON(data['availability']);
        }
        // validate the optional field `condition`
        if (data['condition']) { // data not null
          OfferConditionV2.validateJSON(data['condition']);
        }
        // validate the optional field `dealDetails`
        if (data['dealDetails']) { // data not null
          DealDetails.validateJSON(data['dealDetails']);
        }
        // validate the optional field `loyaltyPoints`
        if (data['loyaltyPoints']) { // data not null
          OfferLoyaltyPointsV2.validateJSON(data['loyaltyPoints']);
        }
        // validate the optional field `merchantInfo`
        if (data['merchantInfo']) { // data not null
          OfferMerchantInfoV2.validateJSON(data['merchantInfo']);
        }
        // validate the optional field `price`
        if (data['price']) { // data not null
          OfferPriceV2.validateJSON(data['price']);
        }

        return true;
    }


}



/**
 * @member {module:model/OfferAvailabilityV2} availability
 */
OfferListingV2.prototype['availability'] = undefined;

/**
 * @member {module:model/OfferConditionV2} condition
 */
OfferListingV2.prototype['condition'] = undefined;

/**
 * @member {module:model/DealDetails} dealDetails
 */
OfferListingV2.prototype['dealDetails'] = undefined;

/**
 * @member {Boolean} isBuyBoxWinner
 */
OfferListingV2.prototype['isBuyBoxWinner'] = undefined;

/**
 * @member {module:model/OfferLoyaltyPointsV2} loyaltyPoints
 */
OfferListingV2.prototype['loyaltyPoints'] = undefined;

/**
 * @member {module:model/OfferMerchantInfoV2} merchantInfo
 */
OfferListingV2.prototype['merchantInfo'] = undefined;

/**
 * @member {module:model/OfferPriceV2} price
 */
OfferListingV2.prototype['price'] = undefined;

/**
 * @member {module:model/OfferType} type
 */
OfferListingV2.prototype['type'] = undefined;

/**
 * @member {Boolean} violatesMAP
 */
OfferListingV2.prototype['violatesMAP'] = undefined;






export default OfferListingV2;

