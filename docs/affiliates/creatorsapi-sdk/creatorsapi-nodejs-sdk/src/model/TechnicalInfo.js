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
import MultiValuedAttribute from './MultiValuedAttribute';
import SingleStringValuedAttribute from './SingleStringValuedAttribute';

/**
 * The TechnicalInfo model module.
 * @module model/TechnicalInfo
 * @version 1.0.0
 */
class TechnicalInfo {
    /**
     * Constructs a new <code>TechnicalInfo</code>.
     * Container for set of attributes that describes the technical aspects of the product.
     * @alias module:model/TechnicalInfo
     */
    constructor() { 
        
        TechnicalInfo.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>TechnicalInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TechnicalInfo} obj Optional instance to populate.
     * @return {module:model/TechnicalInfo} The populated <code>TechnicalInfo</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new TechnicalInfo();

            if (data.hasOwnProperty('energyEfficiencyClass')) {
                obj['energyEfficiencyClass'] = SingleStringValuedAttribute.constructFromObject(data['energyEfficiencyClass']);
            }
            if (data.hasOwnProperty('formats')) {
                obj['formats'] = MultiValuedAttribute.constructFromObject(data['formats']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>TechnicalInfo</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>TechnicalInfo</code>.
     */
    static validateJSON(data) {
        // validate the optional field `energyEfficiencyClass`
        if (data['energyEfficiencyClass']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['energyEfficiencyClass']);
        }
        // validate the optional field `formats`
        if (data['formats']) { // data not null
          MultiValuedAttribute.validateJSON(data['formats']);
        }

        return true;
    }


}



/**
 * @member {module:model/SingleStringValuedAttribute} energyEfficiencyClass
 */
TechnicalInfo.prototype['energyEfficiencyClass'] = undefined;

/**
 * @member {module:model/MultiValuedAttribute} formats
 */
TechnicalInfo.prototype['formats'] = undefined;






export default TechnicalInfo;

