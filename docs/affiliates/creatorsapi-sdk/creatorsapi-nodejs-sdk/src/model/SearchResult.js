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
import Item from './Item';
import SearchRefinements from './SearchRefinements';

/**
 * The SearchResult model module.
 * @module model/SearchResult
 * @version 1.0.0
 */
class SearchResult {
    /**
     * Constructs a new <code>SearchResult</code>.
     * The container for SearchItems response. It consists of search results items and some meta-data about the search result like TotalResultCount, SearchURL and SearchRefinements.
     * @alias module:model/SearchResult
     */
    constructor() { 
        
        SearchResult.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>SearchResult</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SearchResult} obj Optional instance to populate.
     * @return {module:model/SearchResult} The populated <code>SearchResult</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new SearchResult();

            if (data.hasOwnProperty('totalResultCount')) {
                obj['totalResultCount'] = ApiClient.convertToType(data['totalResultCount'], 'Number');
            }
            if (data.hasOwnProperty('searchURL')) {
                obj['searchURL'] = ApiClient.convertToType(data['searchURL'], 'String');
            }
            if (data.hasOwnProperty('items')) {
                obj['items'] = ApiClient.convertToType(data['items'], [Item]);
            }
            if (data.hasOwnProperty('searchRefinements')) {
                obj['searchRefinements'] = SearchRefinements.constructFromObject(data['searchRefinements']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>SearchResult</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>SearchResult</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['searchURL'] && !(typeof data['searchURL'] === 'string' || data['searchURL'] instanceof String)) {
            throw new Error("Expected the field `searchURL` to be a primitive type in the JSON string but got " + data['searchURL']);
        }
        if (data['items']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['items'])) {
                throw new Error("Expected the field `items` to be an array in the JSON data but got " + data['items']);
            }
            // validate the optional field `items` (array)
            for (const item of data['items']) {
                Item.validateJSON(item);
            };
        }
        // validate the optional field `searchRefinements`
        if (data['searchRefinements']) { // data not null
          SearchRefinements.validateJSON(data['searchRefinements']);
        }

        return true;
    }


}



/**
 * @member {Number} totalResultCount
 */
SearchResult.prototype['totalResultCount'] = undefined;

/**
 * @member {String} searchURL
 */
SearchResult.prototype['searchURL'] = undefined;

/**
 * List of Item which is a container for item information.
 * @member {Array.<module:model/Item>} items
 */
SearchResult.prototype['items'] = undefined;

/**
 * @member {module:model/SearchRefinements} searchRefinements
 */
SearchResult.prototype['searchRefinements'] = undefined;






export default SearchResult;

