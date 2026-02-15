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
import RefinementBin from './RefinementBin';

/**
 * The Refinement model module.
 * @module model/Refinement
 * @version 1.0.0
 */
class Refinement {
    /**
     * Constructs a new <code>Refinement</code>.
     * Container for a search refinement which includes refinement attributes like Id, Display Name and refinement values.
     * @alias module:model/Refinement
     */
    constructor() { 
        
        Refinement.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>Refinement</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Refinement} obj Optional instance to populate.
     * @return {module:model/Refinement} The populated <code>Refinement</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new Refinement();

            if (data.hasOwnProperty('bins')) {
                obj['bins'] = ApiClient.convertToType(data['bins'], [RefinementBin]);
            }
            if (data.hasOwnProperty('displayName')) {
                obj['displayName'] = ApiClient.convertToType(data['displayName'], 'String');
            }
            if (data.hasOwnProperty('id')) {
                obj['id'] = ApiClient.convertToType(data['id'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>Refinement</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>Refinement</code>.
     */
    static validateJSON(data) {
        if (data['bins']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['bins'])) {
                throw new Error("Expected the field `bins` to be an array in the JSON data but got " + data['bins']);
            }
            // validate the optional field `bins` (array)
            for (const item of data['bins']) {
                RefinementBin.validateJSON(item);
            };
        }
        // ensure the json data is a string
        if (data['displayName'] && !(typeof data['displayName'] === 'string' || data['displayName'] instanceof String)) {
            throw new Error("Expected the field `displayName` to be a primitive type in the JSON string but got " + data['displayName']);
        }
        // ensure the json data is a string
        if (data['id'] && !(typeof data['id'] === 'string' || data['id'] instanceof String)) {
            throw new Error("Expected the field `id` to be a primitive type in the JSON string but got " + data['id']);
        }

        return true;
    }


}



/**
 * List of refinement bins which contains the values for a particular refinement.
 * @member {Array.<module:model/RefinementBin>} bins
 */
Refinement.prototype['bins'] = undefined;

/**
 * @member {String} displayName
 */
Refinement.prototype['displayName'] = undefined;

/**
 * @member {String} id
 */
Refinement.prototype['id'] = undefined;






export default Refinement;

