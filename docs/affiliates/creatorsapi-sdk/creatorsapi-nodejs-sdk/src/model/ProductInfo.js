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
import DimensionBasedAttribute from './DimensionBasedAttribute';
import SingleBooleanValuedAttribute from './SingleBooleanValuedAttribute';
import SingleIntegerValuedAttribute from './SingleIntegerValuedAttribute';
import SingleStringValuedAttribute from './SingleStringValuedAttribute';

/**
 * The ProductInfo model module.
 * @module model/ProductInfo
 * @version 1.0.0
 */
class ProductInfo {
    /**
     * Constructs a new <code>ProductInfo</code>.
     * Container for set of attributes that describes non-technical aspects of the product.
     * @alias module:model/ProductInfo
     */
    constructor() { 
        
        ProductInfo.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>ProductInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ProductInfo} obj Optional instance to populate.
     * @return {module:model/ProductInfo} The populated <code>ProductInfo</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ProductInfo();

            if (data.hasOwnProperty('color')) {
                obj['color'] = SingleStringValuedAttribute.constructFromObject(data['color']);
            }
            if (data.hasOwnProperty('isAdultProduct')) {
                obj['isAdultProduct'] = SingleBooleanValuedAttribute.constructFromObject(data['isAdultProduct']);
            }
            if (data.hasOwnProperty('itemDimensions')) {
                obj['itemDimensions'] = DimensionBasedAttribute.constructFromObject(data['itemDimensions']);
            }
            if (data.hasOwnProperty('releaseDate')) {
                obj['releaseDate'] = SingleStringValuedAttribute.constructFromObject(data['releaseDate']);
            }
            if (data.hasOwnProperty('size')) {
                obj['size'] = SingleStringValuedAttribute.constructFromObject(data['size']);
            }
            if (data.hasOwnProperty('unitCount')) {
                obj['unitCount'] = SingleIntegerValuedAttribute.constructFromObject(data['unitCount']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ProductInfo</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ProductInfo</code>.
     */
    static validateJSON(data) {
        // validate the optional field `color`
        if (data['color']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['color']);
        }
        // validate the optional field `isAdultProduct`
        if (data['isAdultProduct']) { // data not null
          SingleBooleanValuedAttribute.validateJSON(data['isAdultProduct']);
        }
        // validate the optional field `itemDimensions`
        if (data['itemDimensions']) { // data not null
          DimensionBasedAttribute.validateJSON(data['itemDimensions']);
        }
        // validate the optional field `releaseDate`
        if (data['releaseDate']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['releaseDate']);
        }
        // validate the optional field `size`
        if (data['size']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['size']);
        }
        // validate the optional field `unitCount`
        if (data['unitCount']) { // data not null
          SingleIntegerValuedAttribute.validateJSON(data['unitCount']);
        }

        return true;
    }


}



/**
 * @member {module:model/SingleStringValuedAttribute} color
 */
ProductInfo.prototype['color'] = undefined;

/**
 * @member {module:model/SingleBooleanValuedAttribute} isAdultProduct
 */
ProductInfo.prototype['isAdultProduct'] = undefined;

/**
 * @member {module:model/DimensionBasedAttribute} itemDimensions
 */
ProductInfo.prototype['itemDimensions'] = undefined;

/**
 * @member {module:model/SingleStringValuedAttribute} releaseDate
 */
ProductInfo.prototype['releaseDate'] = undefined;

/**
 * @member {module:model/SingleStringValuedAttribute} size
 */
ProductInfo.prototype['size'] = undefined;

/**
 * @member {module:model/SingleIntegerValuedAttribute} unitCount
 */
ProductInfo.prototype['unitCount'] = undefined;






export default ProductInfo;

