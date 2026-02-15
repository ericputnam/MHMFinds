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
import SearchResult from './SearchResult';

/**
 * The SearchItemsResponseContent model module.
 * @module model/SearchItemsResponseContent
 * @version 1.0.0
 */
class SearchItemsResponseContent {
    /**
     * Constructs a new <code>SearchItemsResponseContent</code>.
     * The response object for SearchItems operation.
     * @alias module:model/SearchItemsResponseContent
     */
    constructor() { 
        
        SearchItemsResponseContent.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>SearchItemsResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SearchItemsResponseContent} obj Optional instance to populate.
     * @return {module:model/SearchItemsResponseContent} The populated <code>SearchItemsResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new SearchItemsResponseContent();

            if (data.hasOwnProperty('searchResult')) {
                obj['searchResult'] = SearchResult.constructFromObject(data['searchResult']);
            }
            if (data.hasOwnProperty('errors')) {
                obj['errors'] = ApiClient.convertToType(data['errors'], [ErrorData]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>SearchItemsResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>SearchItemsResponseContent</code>.
     */
    static validateJSON(data) {
        // validate the optional field `searchResult`
        if (data['searchResult']) { // data not null
          SearchResult.validateJSON(data['searchResult']);
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
 * @member {module:model/SearchResult} searchResult
 */
SearchItemsResponseContent.prototype['searchResult'] = undefined;

/**
 * List of partial errors encountered during request processing in an otherwise successful response
 * @member {Array.<module:model/ErrorData>} errors
 */
SearchItemsResponseContent.prototype['errors'] = undefined;






export default SearchItemsResponseContent;

