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
 * The ContentRating model module.
 * @module model/ContentRating
 * @version 1.0.0
 */
class ContentRating {
    /**
     * Constructs a new <code>ContentRating</code>.
     * Container for set of attributes that tell what age group is suitable to view said media.
     * @alias module:model/ContentRating
     */
    constructor() { 
        
        ContentRating.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>ContentRating</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ContentRating} obj Optional instance to populate.
     * @return {module:model/ContentRating} The populated <code>ContentRating</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ContentRating();

            if (data.hasOwnProperty('audienceRating')) {
                obj['audienceRating'] = SingleStringValuedAttribute.constructFromObject(data['audienceRating']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ContentRating</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ContentRating</code>.
     */
    static validateJSON(data) {
        // validate the optional field `audienceRating`
        if (data['audienceRating']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['audienceRating']);
        }

        return true;
    }


}



/**
 * @member {module:model/SingleStringValuedAttribute} audienceRating
 */
ContentRating.prototype['audienceRating'] = undefined;






export default ContentRating;

