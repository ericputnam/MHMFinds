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
import ImageType from './ImageType';

/**
 * The Images model module.
 * @module model/Images
 * @version 1.0.0
 */
class Images {
    /**
     * Constructs a new <code>Images</code>.
     * Container for image information associated with a product. Includes url, size, and other image attributes.
     * @alias module:model/Images
     */
    constructor() { 
        
        Images.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>Images</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Images} obj Optional instance to populate.
     * @return {module:model/Images} The populated <code>Images</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new Images();

            if (data.hasOwnProperty('primary')) {
                obj['primary'] = ImageType.constructFromObject(data['primary']);
            }
            if (data.hasOwnProperty('variants')) {
                obj['variants'] = ApiClient.convertToType(data['variants'], [ImageType]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>Images</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>Images</code>.
     */
    static validateJSON(data) {
        // validate the optional field `primary`
        if (data['primary']) { // data not null
          ImageType.validateJSON(data['primary']);
        }
        if (data['variants']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['variants'])) {
                throw new Error("Expected the field `variants` to be an array in the JSON data but got " + data['variants']);
            }
            // validate the optional field `variants` (array)
            for (const item of data['variants']) {
                ImageType.validateJSON(item);
            };
        }

        return true;
    }


}



/**
 * @member {module:model/ImageType} primary
 */
Images.prototype['primary'] = undefined;

/**
 * List of image type which identifies a image as Primary and Variant. Primary denotes the image which is displayed in search results and on the detail page. Variant includes everything else.
 * @member {Array.<module:model/ImageType>} variants
 */
Images.prototype['variants'] = undefined;






export default Images;

