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
import ImageSize from './ImageSize';

/**
 * The ImageType model module.
 * @module model/ImageType
 * @version 1.0.0
 */
class ImageType {
    /**
     * Constructs a new <code>ImageType</code>.
     * Container for image sizes associated with an image type. Images are returned in various sizes like small, medium and large.
     * @alias module:model/ImageType
     */
    constructor() { 
        
        ImageType.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>ImageType</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ImageType} obj Optional instance to populate.
     * @return {module:model/ImageType} The populated <code>ImageType</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ImageType();

            if (data.hasOwnProperty('small')) {
                obj['small'] = ImageSize.constructFromObject(data['small']);
            }
            if (data.hasOwnProperty('medium')) {
                obj['medium'] = ImageSize.constructFromObject(data['medium']);
            }
            if (data.hasOwnProperty('large')) {
                obj['large'] = ImageSize.constructFromObject(data['large']);
            }
            if (data.hasOwnProperty('hiRes')) {
                obj['hiRes'] = ImageSize.constructFromObject(data['hiRes']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ImageType</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ImageType</code>.
     */
    static validateJSON(data) {
        // validate the optional field `small`
        if (data['small']) { // data not null
          ImageSize.validateJSON(data['small']);
        }
        // validate the optional field `medium`
        if (data['medium']) { // data not null
          ImageSize.validateJSON(data['medium']);
        }
        // validate the optional field `large`
        if (data['large']) { // data not null
          ImageSize.validateJSON(data['large']);
        }
        // validate the optional field `hiRes`
        if (data['hiRes']) { // data not null
          ImageSize.validateJSON(data['hiRes']);
        }

        return true;
    }


}



/**
 * @member {module:model/ImageSize} small
 */
ImageType.prototype['small'] = undefined;

/**
 * @member {module:model/ImageSize} medium
 */
ImageType.prototype['medium'] = undefined;

/**
 * @member {module:model/ImageSize} large
 */
ImageType.prototype['large'] = undefined;

/**
 * @member {module:model/ImageSize} hiRes
 */
ImageType.prototype['hiRes'] = undefined;






export default ImageType;

