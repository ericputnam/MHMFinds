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
import ErrorData from './ErrorData';
import ItemsResult from './ItemsResult';

/**
 * The GetItemsResponseContent model module.
 * @module model/GetItemsResponseContent
 * @version 1.0.0
 */
class GetItemsResponseContent {
    /**
     * Constructs a new <code>GetItemsResponseContent</code>.
     * The response object for the get items operation.
     * @alias module:model/GetItemsResponseContent
     */
    constructor() { 
        
        GetItemsResponseContent.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>GetItemsResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/GetItemsResponseContent} obj Optional instance to populate.
     * @return {module:model/GetItemsResponseContent} The populated <code>GetItemsResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new GetItemsResponseContent();

            if (data.hasOwnProperty('itemsResult')) {
                obj['itemsResult'] = ItemsResult.constructFromObject(data['itemsResult']);
            }
            if (data.hasOwnProperty('errors')) {
                obj['errors'] = ApiClient.convertToType(data['errors'], [ErrorData]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>GetItemsResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>GetItemsResponseContent</code>.
     */
    static validateJSON(data) {
        // validate the optional field `itemsResult`
        if (data['itemsResult']) { // data not null
          ItemsResult.validateJSON(data['itemsResult']);
        }
        if (data['errors']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['errors'])) {
                throw new Error("Expected the field `errors` to be an array in the JSON data but got " + data['errors']);
            }
            // validate the optional field `errors` (array)
            for (const item of data['errors']) {
                ErrorData.validateJSON(item);
            };
        }

        return true;
    }


}



/**
 * @member {module:model/ItemsResult} itemsResult
 */
GetItemsResponseContent.prototype['itemsResult'] = undefined;

/**
 * List of partial errors encountered during request processing in an otherwise successful response
 * @member {Array.<module:model/ErrorData>} errors
 */
GetItemsResponseContent.prototype['errors'] = undefined;






export default GetItemsResponseContent;

