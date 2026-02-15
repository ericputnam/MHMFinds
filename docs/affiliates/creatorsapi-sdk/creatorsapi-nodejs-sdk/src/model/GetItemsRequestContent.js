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
import Condition from './Condition';
import GetItemsResource from './GetItemsResource';

/**
 * The GetItemsRequestContent model module.
 * @module model/GetItemsRequestContent
 * @version 1.0.0
 */
class GetItemsRequestContent {
    /**
     * Constructs a new <code>GetItemsRequestContent</code>.
     * @alias module:model/GetItemsRequestContent
     * @param partnerTag {String} An alphanumeric token that uniquely identifies a partner. If the value of PartnerType is Associates, enter your Store Id or tracking ID.
     * @param itemIds {Array.<String>} 
     */
    constructor(partnerTag, itemIds) { 
        
        GetItemsRequestContent.initialize(this, partnerTag, itemIds);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, partnerTag, itemIds) { 
        obj['partnerTag'] = partnerTag;
        obj['itemIds'] = itemIds;
    }

    /**
     * Constructs a <code>GetItemsRequestContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/GetItemsRequestContent} obj Optional instance to populate.
     * @return {module:model/GetItemsRequestContent} The populated <code>GetItemsRequestContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new GetItemsRequestContent();

            if (data.hasOwnProperty('partnerTag')) {
                obj['partnerTag'] = ApiClient.convertToType(data['partnerTag'], 'String');
            }
            if (data.hasOwnProperty('itemIds')) {
                obj['itemIds'] = ApiClient.convertToType(data['itemIds'], ['String']);
            }
            if (data.hasOwnProperty('condition')) {
                obj['condition'] = Condition.constructFromObject(data['condition']);
            }
            if (data.hasOwnProperty('currencyOfPreference')) {
                obj['currencyOfPreference'] = ApiClient.convertToType(data['currencyOfPreference'], 'String');
            }
            if (data.hasOwnProperty('languagesOfPreference')) {
                obj['languagesOfPreference'] = ApiClient.convertToType(data['languagesOfPreference'], ['String']);
            }
            if (data.hasOwnProperty('properties')) {
                obj['properties'] = ApiClient.convertToType(data['properties'], {'String': 'String'});
            }
            if (data.hasOwnProperty('resources')) {
                obj['resources'] = ApiClient.convertToType(data['resources'], [GetItemsResource]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>GetItemsRequestContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>GetItemsRequestContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of GetItemsRequestContent.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        // ensure the json data is a string
        if (data['partnerTag'] && !(typeof data['partnerTag'] === 'string' || data['partnerTag'] instanceof String)) {
            throw new Error("Expected the field `partnerTag` to be a primitive type in the JSON string but got " + data['partnerTag']);
        }
        // ensure the json data is an array
        if (!Array.isArray(data['itemIds'])) {
            throw new Error("Expected the field `itemIds` to be an array in the JSON data but got " + data['itemIds']);
        }
        // ensure the json data is a string
        if (data['currencyOfPreference'] && !(typeof data['currencyOfPreference'] === 'string' || data['currencyOfPreference'] instanceof String)) {
            throw new Error("Expected the field `currencyOfPreference` to be a primitive type in the JSON string but got " + data['currencyOfPreference']);
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

GetItemsRequestContent.RequiredProperties = ["partnerTag", "itemIds"];

/**
 * An alphanumeric token that uniquely identifies a partner. If the value of PartnerType is Associates, enter your Store Id or tracking ID.
 * @member {String} partnerTag
 */
GetItemsRequestContent.prototype['partnerTag'] = undefined;

/**
 * @member {Array.<String>} itemIds
 */
GetItemsRequestContent.prototype['itemIds'] = undefined;

/**
 * @member {module:model/Condition} condition
 */
GetItemsRequestContent.prototype['condition'] = undefined;

/**
 * Currency of preference in which the prices information should be returned in response. By default the prices are returned in the default currency of the marketplace. Expected currency code format is the ISO 4217 currency code (i.e. USD, EUR etc.).
 * @member {String} currencyOfPreference
 */
GetItemsRequestContent.prototype['currencyOfPreference'] = undefined;

/**
 * Languages in order of preference in which the item information should be returned in response. By default the item information is returned in the default language of the marketplace.
 * @member {Array.<String>} languagesOfPreference
 */
GetItemsRequestContent.prototype['languagesOfPreference'] = undefined;

/**
 * Reserved parameter for specifying key-value pairs. This is a flexible mechanism for passing additional context or metadata to the API.
 * @member {Object.<String, String>} properties
 */
GetItemsRequestContent.prototype['properties'] = undefined;

/**
 * @member {Array.<module:model/GetItemsResource>} resources
 */
GetItemsRequestContent.prototype['resources'] = undefined;






export default GetItemsRequestContent;

