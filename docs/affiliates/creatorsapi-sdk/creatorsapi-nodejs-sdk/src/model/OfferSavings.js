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
import Money from './Money';

/**
 * The OfferSavings model module.
 * @module model/OfferSavings
 * @version 1.0.0
 */
class OfferSavings {
    /**
     * Constructs a new <code>OfferSavings</code>.
     * Specifies savings on an offer. This is calculated by taking reference as saving basis price.
     * @alias module:model/OfferSavings
     */
    constructor() { 
        
        OfferSavings.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>OfferSavings</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/OfferSavings} obj Optional instance to populate.
     * @return {module:model/OfferSavings} The populated <code>OfferSavings</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new OfferSavings();

            if (data.hasOwnProperty('money')) {
                obj['money'] = Money.constructFromObject(data['money']);
            }
            if (data.hasOwnProperty('percentage')) {
                obj['percentage'] = ApiClient.convertToType(data['percentage'], 'Number');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>OfferSavings</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>OfferSavings</code>.
     */
    static validateJSON(data) {
        // validate the optional field `money`
        if (data['money']) { // data not null
          Money.validateJSON(data['money']);
        }

        return true;
    }


}



/**
 * @member {module:model/Money} money
 */
OfferSavings.prototype['money'] = undefined;

/**
 * @member {Number} percentage
 */
OfferSavings.prototype['percentage'] = undefined;






export default OfferSavings;

