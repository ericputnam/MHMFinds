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

/**
 * The ExternalIds model module.
 * @module model/ExternalIds
 * @version 1.0.0
 */
class ExternalIds {
    /**
     * Constructs a new <code>ExternalIds</code>.
     * Container for set of identifiers that is used globally to identify a particular product.
     * @alias module:model/ExternalIds
     */
    constructor() { 
        
        ExternalIds.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>ExternalIds</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ExternalIds} obj Optional instance to populate.
     * @return {module:model/ExternalIds} The populated <code>ExternalIds</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ExternalIds();

            if (data.hasOwnProperty('eans')) {
                obj['eans'] = MultiValuedAttribute.constructFromObject(data['eans']);
            }
            if (data.hasOwnProperty('isbns')) {
                obj['isbns'] = MultiValuedAttribute.constructFromObject(data['isbns']);
            }
            if (data.hasOwnProperty('upcs')) {
                obj['upcs'] = MultiValuedAttribute.constructFromObject(data['upcs']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ExternalIds</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ExternalIds</code>.
     */
    static validateJSON(data) {
        // validate the optional field `eans`
        if (data['eans']) { // data not null
          MultiValuedAttribute.validateJSON(data['eans']);
        }
        // validate the optional field `isbns`
        if (data['isbns']) { // data not null
          MultiValuedAttribute.validateJSON(data['isbns']);
        }
        // validate the optional field `upcs`
        if (data['upcs']) { // data not null
          MultiValuedAttribute.validateJSON(data['upcs']);
        }

        return true;
    }


}



/**
 * @member {module:model/MultiValuedAttribute} eans
 */
ExternalIds.prototype['eans'] = undefined;

/**
 * @member {module:model/MultiValuedAttribute} isbns
 */
ExternalIds.prototype['isbns'] = undefined;

/**
 * @member {module:model/MultiValuedAttribute} upcs
 */
ExternalIds.prototype['upcs'] = undefined;






export default ExternalIds;

