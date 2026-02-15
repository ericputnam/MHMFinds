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
import Feed from './Feed';

/**
 * The ListFeedsResponseContent model module.
 * @module model/ListFeedsResponseContent
 * @version 1.0.0
 */
class ListFeedsResponseContent {
    /**
     * Constructs a new <code>ListFeedsResponseContent</code>.
     * @alias module:model/ListFeedsResponseContent
     */
    constructor() { 
        
        ListFeedsResponseContent.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>ListFeedsResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ListFeedsResponseContent} obj Optional instance to populate.
     * @return {module:model/ListFeedsResponseContent} The populated <code>ListFeedsResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ListFeedsResponseContent();

            if (data.hasOwnProperty('feeds')) {
                obj['feeds'] = ApiClient.convertToType(data['feeds'], [Feed]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ListFeedsResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ListFeedsResponseContent</code>.
     */
    static validateJSON(data) {
        if (data['feeds']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['feeds'])) {
                throw new Error("Expected the field `feeds` to be an array in the JSON data but got " + data['feeds']);
            }
            // validate the optional field `feeds` (array)
            for (const item of data['feeds']) {
                Feed.validateJSON(item);
            };
        }

        return true;
    }


}



/**
 * @member {Array.<module:model/Feed>} feeds
 */
ListFeedsResponseContent.prototype['feeds'] = undefined;






export default ListFeedsResponseContent;

