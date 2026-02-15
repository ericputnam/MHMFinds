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
import Contributor from './Contributor';
import SingleStringValuedAttribute from './SingleStringValuedAttribute';

/**
 * The ByLineInfo model module.
 * @module model/ByLineInfo
 * @version 1.0.0
 */
class ByLineInfo {
    /**
     * Constructs a new <code>ByLineInfo</code>.
     * Container for set of attributes that specifies basic information of the product like Brand, Manufacturer, etc.
     * @alias module:model/ByLineInfo
     */
    constructor() { 
        
        ByLineInfo.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>ByLineInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ByLineInfo} obj Optional instance to populate.
     * @return {module:model/ByLineInfo} The populated <code>ByLineInfo</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ByLineInfo();

            if (data.hasOwnProperty('brand')) {
                obj['brand'] = SingleStringValuedAttribute.constructFromObject(data['brand']);
            }
            if (data.hasOwnProperty('contributors')) {
                obj['contributors'] = ApiClient.convertToType(data['contributors'], [Contributor]);
            }
            if (data.hasOwnProperty('manufacturer')) {
                obj['manufacturer'] = SingleStringValuedAttribute.constructFromObject(data['manufacturer']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ByLineInfo</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ByLineInfo</code>.
     */
    static validateJSON(data) {
        // validate the optional field `brand`
        if (data['brand']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['brand']);
        }
        if (data['contributors']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['contributors'])) {
                throw new Error("Expected the field `contributors` to be an array in the JSON data but got " + data['contributors']);
            }
            // validate the optional field `contributors` (array)
            for (const item of data['contributors']) {
                Contributor.validateJSON(item);
            };
        }
        // validate the optional field `manufacturer`
        if (data['manufacturer']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['manufacturer']);
        }

        return true;
    }


}



/**
 * @member {module:model/SingleStringValuedAttribute} brand
 */
ByLineInfo.prototype['brand'] = undefined;

/**
 * List of contributors associated with the product.
 * @member {Array.<module:model/Contributor>} contributors
 */
ByLineInfo.prototype['contributors'] = undefined;

/**
 * @member {module:model/SingleStringValuedAttribute} manufacturer
 */
ByLineInfo.prototype['manufacturer'] = undefined;






export default ByLineInfo;

