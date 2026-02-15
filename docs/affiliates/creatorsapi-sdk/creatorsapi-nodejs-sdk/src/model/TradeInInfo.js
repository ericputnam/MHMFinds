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
import TradeInPrice from './TradeInPrice';

/**
 * The TradeInInfo model module.
 * @module model/TradeInInfo
 * @version 1.0.0
 */
class TradeInInfo {
    /**
     * Constructs a new <code>TradeInInfo</code>.
     * Container for set of attributes that specifies trade-in information of the product.
     * @alias module:model/TradeInInfo
     */
    constructor() { 
        
        TradeInInfo.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>TradeInInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TradeInInfo} obj Optional instance to populate.
     * @return {module:model/TradeInInfo} The populated <code>TradeInInfo</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new TradeInInfo();

            if (data.hasOwnProperty('isEligibleForTradeIn')) {
                obj['isEligibleForTradeIn'] = ApiClient.convertToType(data['isEligibleForTradeIn'], 'Boolean');
            }
            if (data.hasOwnProperty('price')) {
                obj['price'] = TradeInPrice.constructFromObject(data['price']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>TradeInInfo</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>TradeInInfo</code>.
     */
    static validateJSON(data) {
        // validate the optional field `price`
        if (data['price']) { // data not null
          TradeInPrice.validateJSON(data['price']);
        }

        return true;
    }


}



/**
 * @member {Boolean} isEligibleForTradeIn
 */
TradeInInfo.prototype['isEligibleForTradeIn'] = undefined;

/**
 * @member {module:model/TradeInPrice} price
 */
TradeInInfo.prototype['price'] = undefined;






export default TradeInInfo;

