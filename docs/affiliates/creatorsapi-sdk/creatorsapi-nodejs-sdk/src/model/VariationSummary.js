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
import VariationDimension from './VariationDimension';

/**
 * The VariationSummary model module.
 * @module model/VariationSummary
 * @version 1.0.0
 */
class VariationSummary {
    /**
     * Constructs a new <code>VariationSummary</code>.
     * The container for Variations Summary response. It consists of metadata of variations response like page numbers, number of variations, Price range and Variation Dimensions.
     * @alias module:model/VariationSummary
     */
    constructor() { 
        
        VariationSummary.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>VariationSummary</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/VariationSummary} obj Optional instance to populate.
     * @return {module:model/VariationSummary} The populated <code>VariationSummary</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new VariationSummary();

            if (data.hasOwnProperty('pageCount')) {
                obj['pageCount'] = ApiClient.convertToType(data['pageCount'], 'Number');
            }
            if (data.hasOwnProperty('variationCount')) {
                obj['variationCount'] = ApiClient.convertToType(data['variationCount'], 'Number');
            }
            if (data.hasOwnProperty('variationDimensions')) {
                obj['variationDimensions'] = ApiClient.convertToType(data['variationDimensions'], [VariationDimension]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>VariationSummary</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>VariationSummary</code>.
     */
    static validateJSON(data) {
        if (data['variationDimensions']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['variationDimensions'])) {
                throw new Error("Expected the field `variationDimensions` to be an array in the JSON data but got " + data['variationDimensions']);
            }
            // validate the optional field `variationDimensions` (array)
            for (const item of data['variationDimensions']) {
                VariationDimension.validateJSON(item);
            };
        }

        return true;
    }


}



/**
 * Number of pages in the variation result set.
 * @member {Number} pageCount
 */
VariationSummary.prototype['pageCount'] = undefined;

/**
 * Total number of variations available for the product. This represents the complete count of all child ASINs across all pages. Use this value along with pageCount to understand the full scope of available variations.
 * @member {Number} variationCount
 */
VariationSummary.prototype['variationCount'] = undefined;

/**
 * List of variation dimensions associated with the product. Variation dimensions define the attributes on which products vary (e.g., size, color). Each dimension includes: - Display name and locale for presentation - Dimension name (internal identifier) - List of all possible values for that dimension  For example, a clothing item might have two dimensions: 'Size' with values ['S', 'M', 'L'] and 'Color' with values ['Red', 'Blue', 'Green']. These dimensions help users understand how variations differ from each other.
 * @member {Array.<module:model/VariationDimension>} variationDimensions
 */
VariationSummary.prototype['variationDimensions'] = undefined;






export default VariationSummary;

