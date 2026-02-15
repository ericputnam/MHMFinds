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
import GetBrowseNodesResource from './GetBrowseNodesResource';

/**
 * The GetBrowseNodesRequestContent model module.
 * @module model/GetBrowseNodesRequestContent
 * @version 1.0.0
 */
class GetBrowseNodesRequestContent {
    /**
     * Constructs a new <code>GetBrowseNodesRequestContent</code>.
     * Input for the GetBrowseNodes operation to retrieve browse node information.
     * @alias module:model/GetBrowseNodesRequestContent
     * @param partnerTag {String} Unique ID for a partner. Type: String (Non-Empty) Default Value: None Example: 'xyz-20'
     * @param browseNodeIds {Array.<String>} List of BrowseNodeIds. A BrowseNodeId is a unique ID assigned by Amazon that identifies a product category/sub-category. The BrowseNodeId is a positive Long having max value upto Long.MAX_VALUE i.e. 9223372036854775807 (inclusive). Type: List of Strings (Positive Long only) (up to 10) Default Value: None Example: ['283155', '3040']
     */
    constructor(partnerTag, browseNodeIds) { 
        
        GetBrowseNodesRequestContent.initialize(this, partnerTag, browseNodeIds);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, partnerTag, browseNodeIds) { 
        obj['partnerTag'] = partnerTag;
        obj['browseNodeIds'] = browseNodeIds;
    }

    /**
     * Constructs a <code>GetBrowseNodesRequestContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/GetBrowseNodesRequestContent} obj Optional instance to populate.
     * @return {module:model/GetBrowseNodesRequestContent} The populated <code>GetBrowseNodesRequestContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new GetBrowseNodesRequestContent();

            if (data.hasOwnProperty('partnerTag')) {
                obj['partnerTag'] = ApiClient.convertToType(data['partnerTag'], 'String');
            }
            if (data.hasOwnProperty('browseNodeIds')) {
                obj['browseNodeIds'] = ApiClient.convertToType(data['browseNodeIds'], ['String']);
            }
            if (data.hasOwnProperty('languagesOfPreference')) {
                obj['languagesOfPreference'] = ApiClient.convertToType(data['languagesOfPreference'], ['String']);
            }
            if (data.hasOwnProperty('resources')) {
                obj['resources'] = ApiClient.convertToType(data['resources'], [GetBrowseNodesResource]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>GetBrowseNodesRequestContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>GetBrowseNodesRequestContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of GetBrowseNodesRequestContent.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        // ensure the json data is a string
        if (data['partnerTag'] && !(typeof data['partnerTag'] === 'string' || data['partnerTag'] instanceof String)) {
            throw new Error("Expected the field `partnerTag` to be a primitive type in the JSON string but got " + data['partnerTag']);
        }
        // ensure the json data is an array
        if (!Array.isArray(data['browseNodeIds'])) {
            throw new Error("Expected the field `browseNodeIds` to be an array in the JSON data but got " + data['browseNodeIds']);
        }
        // ensure the json data is an array
        if (!Array.isArray(data['languagesOfPreference'])) {
            throw new Error("Expected the field `languagesOfPreference` to be an array in the JSON data but got " + data['languagesOfPreference']);
        }
        // ensure the json data is an array
        if (!Array.isArray(data['resources'])) {
            throw new Error("Expected the field `resources` to be an array in the JSON data but got " + data['resources']);
        }

        return true;
    }


}

GetBrowseNodesRequestContent.RequiredProperties = ["partnerTag", "browseNodeIds"];

/**
 * Unique ID for a partner. Type: String (Non-Empty) Default Value: None Example: 'xyz-20'
 * @member {String} partnerTag
 */
GetBrowseNodesRequestContent.prototype['partnerTag'] = undefined;

/**
 * List of BrowseNodeIds. A BrowseNodeId is a unique ID assigned by Amazon that identifies a product category/sub-category. The BrowseNodeId is a positive Long having max value upto Long.MAX_VALUE i.e. 9223372036854775807 (inclusive). Type: List of Strings (Positive Long only) (up to 10) Default Value: None Example: ['283155', '3040']
 * @member {Array.<String>} browseNodeIds
 */
GetBrowseNodesRequestContent.prototype['browseNodeIds'] = undefined;

/**
 * Languages of preference in which the information should be returned in response. By default the information is returned in the default language of the marketplace. Expected locale format is the ISO 639 language code followed by underscore followed by the ISO 3166 country code (i.e. en_US, fr_CA etc.). Currently only single language of preference is supported. Type: List of Strings (Non-Empty) Default Value: None Example: ['en_US']
 * @member {Array.<String>} languagesOfPreference
 */
GetBrowseNodesRequestContent.prototype['languagesOfPreference'] = undefined;

/**
 * Specifies the types of values to return. You can specify multiple resources in one request. For list of valid Resources for SearchItems operation, refer Resources Parameter. Type: List of String Default Value: ItemInfo.Title
 * @member {Array.<module:model/GetBrowseNodesResource>} resources
 */
GetBrowseNodesRequestContent.prototype['resources'] = undefined;






export default GetBrowseNodesRequestContent;

