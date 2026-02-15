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
import Refinement from './Refinement';

/**
 * The SearchRefinements model module.
 * @module model/SearchRefinements
 * @version 1.0.0
 */
class SearchRefinements {
    /**
     * Constructs a new <code>SearchRefinements</code>.
     * Container for SearchRefinements resource which helps in filtering search results obtained from SearchItems operation. It contains relevant SearchIndexes, BrowseNodes and other dynamic refinements for a search request.
     * @alias module:model/SearchRefinements
     */
    constructor() { 
        
        SearchRefinements.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>SearchRefinements</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SearchRefinements} obj Optional instance to populate.
     * @return {module:model/SearchRefinements} The populated <code>SearchRefinements</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new SearchRefinements();

            if (data.hasOwnProperty('browseNode')) {
                obj['browseNode'] = Refinement.constructFromObject(data['browseNode']);
            }
            if (data.hasOwnProperty('otherRefinements')) {
                obj['otherRefinements'] = ApiClient.convertToType(data['otherRefinements'], [Refinement]);
            }
            if (data.hasOwnProperty('searchIndex')) {
                obj['searchIndex'] = Refinement.constructFromObject(data['searchIndex']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>SearchRefinements</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>SearchRefinements</code>.
     */
    static validateJSON(data) {
        // validate the optional field `browseNode`
        if (data['browseNode']) { // data not null
          Refinement.validateJSON(data['browseNode']);
        }
        if (data['otherRefinements']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['otherRefinements'])) {
                throw new Error("Expected the field `otherRefinements` to be an array in the JSON data but got " + data['otherRefinements']);
            }
            // validate the optional field `otherRefinements` (array)
            for (const item of data['otherRefinements']) {
                Refinement.validateJSON(item);
            };
        }
        // validate the optional field `searchIndex`
        if (data['searchIndex']) { // data not null
          Refinement.validateJSON(data['searchIndex']);
        }

        return true;
    }


}



/**
 * @member {module:model/Refinement} browseNode
 */
SearchRefinements.prototype['browseNode'] = undefined;

/**
 * List of refinements.
 * @member {Array.<module:model/Refinement>} otherRefinements
 */
SearchRefinements.prototype['otherRefinements'] = undefined;

/**
 * @member {module:model/Refinement} searchIndex
 */
SearchRefinements.prototype['searchIndex'] = undefined;






export default SearchRefinements;

