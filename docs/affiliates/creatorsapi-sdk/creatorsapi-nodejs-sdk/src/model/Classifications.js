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
import SingleStringValuedAttribute from './SingleStringValuedAttribute';

/**
 * The Classifications model module.
 * @module model/Classifications
 * @version 1.0.0
 */
class Classifications {
    /**
     * Constructs a new <code>Classifications</code>.
     * Container for set of attributes that are used to classify an item into a particular category.
     * @alias module:model/Classifications
     */
    constructor() { 
        
        Classifications.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>Classifications</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Classifications} obj Optional instance to populate.
     * @return {module:model/Classifications} The populated <code>Classifications</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new Classifications();

            if (data.hasOwnProperty('binding')) {
                obj['binding'] = SingleStringValuedAttribute.constructFromObject(data['binding']);
            }
            if (data.hasOwnProperty('productGroup')) {
                obj['productGroup'] = SingleStringValuedAttribute.constructFromObject(data['productGroup']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>Classifications</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>Classifications</code>.
     */
    static validateJSON(data) {
        // validate the optional field `binding`
        if (data['binding']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['binding']);
        }
        // validate the optional field `productGroup`
        if (data['productGroup']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['productGroup']);
        }

        return true;
    }


}



/**
 * @member {module:model/SingleStringValuedAttribute} binding
 */
Classifications.prototype['binding'] = undefined;

/**
 * @member {module:model/SingleStringValuedAttribute} productGroup
 */
Classifications.prototype['productGroup'] = undefined;






export default Classifications;

