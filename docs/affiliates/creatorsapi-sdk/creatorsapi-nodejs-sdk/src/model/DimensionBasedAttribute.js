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
import UnitBasedAttribute from './UnitBasedAttribute';

/**
 * The DimensionBasedAttribute model module.
 * @module model/DimensionBasedAttribute
 * @version 1.0.0
 */
class DimensionBasedAttribute {
    /**
     * Constructs a new <code>DimensionBasedAttribute</code>.
     * Container for attributes which are dimension based for example ItemDimensions, etc.
     * @alias module:model/DimensionBasedAttribute
     */
    constructor() { 
        
        DimensionBasedAttribute.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>DimensionBasedAttribute</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/DimensionBasedAttribute} obj Optional instance to populate.
     * @return {module:model/DimensionBasedAttribute} The populated <code>DimensionBasedAttribute</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new DimensionBasedAttribute();

            if (data.hasOwnProperty('height')) {
                obj['height'] = UnitBasedAttribute.constructFromObject(data['height']);
            }
            if (data.hasOwnProperty('length')) {
                obj['length'] = UnitBasedAttribute.constructFromObject(data['length']);
            }
            if (data.hasOwnProperty('weight')) {
                obj['weight'] = UnitBasedAttribute.constructFromObject(data['weight']);
            }
            if (data.hasOwnProperty('width')) {
                obj['width'] = UnitBasedAttribute.constructFromObject(data['width']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>DimensionBasedAttribute</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>DimensionBasedAttribute</code>.
     */
    static validateJSON(data) {
        // validate the optional field `height`
        if (data['height']) { // data not null
          UnitBasedAttribute.validateJSON(data['height']);
        }
        // validate the optional field `length`
        if (data['length']) { // data not null
          UnitBasedAttribute.validateJSON(data['length']);
        }
        // validate the optional field `weight`
        if (data['weight']) { // data not null
          UnitBasedAttribute.validateJSON(data['weight']);
        }
        // validate the optional field `width`
        if (data['width']) { // data not null
          UnitBasedAttribute.validateJSON(data['width']);
        }

        return true;
    }


}



/**
 * @member {module:model/UnitBasedAttribute} height
 */
DimensionBasedAttribute.prototype['height'] = undefined;

/**
 * @member {module:model/UnitBasedAttribute} length
 */
DimensionBasedAttribute.prototype['length'] = undefined;

/**
 * @member {module:model/UnitBasedAttribute} weight
 */
DimensionBasedAttribute.prototype['weight'] = undefined;

/**
 * @member {module:model/UnitBasedAttribute} width
 */
DimensionBasedAttribute.prototype['width'] = undefined;






export default DimensionBasedAttribute;

