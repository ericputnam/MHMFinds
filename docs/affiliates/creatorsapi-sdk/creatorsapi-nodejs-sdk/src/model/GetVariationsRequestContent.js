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
import GetVariationsResource from './GetVariationsResource';

/**
 * The GetVariationsRequestContent model module.
 * @module model/GetVariationsRequestContent
 * @version 1.0.0
 */
class GetVariationsRequestContent {
    /**
     * Constructs a new <code>GetVariationsRequestContent</code>.
     * Input for the GetVariations operation to retrieve product variation information.
     * @alias module:model/GetVariationsRequestContent
     * @param partnerTag {String} Unique Id for a partner. This is used to identify the associate tag for tracking affiliate commissions. Example: 'xyz-20'
     * @param asin {String} Amazon Standard Identification Number. This can be either a parent ASIN (to retrieve all variations) or a child ASIN (to retrieve sibling variations). Type: Non-Empty String. Example: 'B0199980K4'
     */
    constructor(partnerTag, asin) { 
        
        GetVariationsRequestContent.initialize(this, partnerTag, asin);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, partnerTag, asin) { 
        obj['partnerTag'] = partnerTag;
        obj['asin'] = asin;
    }

    /**
     * Constructs a <code>GetVariationsRequestContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/GetVariationsRequestContent} obj Optional instance to populate.
     * @return {module:model/GetVariationsRequestContent} The populated <code>GetVariationsRequestContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new GetVariationsRequestContent();

            if (data.hasOwnProperty('partnerTag')) {
                obj['partnerTag'] = ApiClient.convertToType(data['partnerTag'], 'String');
            }
            if (data.hasOwnProperty('asin')) {
                obj['asin'] = ApiClient.convertToType(data['asin'], 'String');
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
                obj['resources'] = ApiClient.convertToType(data['resources'], [GetVariationsResource]);
            }
            if (data.hasOwnProperty('variationCount')) {
                obj['variationCount'] = ApiClient.convertToType(data['variationCount'], 'Number');
            }
            if (data.hasOwnProperty('variationPage')) {
                obj['variationPage'] = ApiClient.convertToType(data['variationPage'], 'Number');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>GetVariationsRequestContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>GetVariationsRequestContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of GetVariationsRequestContent.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        // ensure the json data is a string
        if (data['partnerTag'] && !(typeof data['partnerTag'] === 'string' || data['partnerTag'] instanceof String)) {
            throw new Error("Expected the field `partnerTag` to be a primitive type in the JSON string but got " + data['partnerTag']);
        }
        // ensure the json data is a string
        if (data['asin'] && !(typeof data['asin'] === 'string' || data['asin'] instanceof String)) {
            throw new Error("Expected the field `asin` to be a primitive type in the JSON string but got " + data['asin']);
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

GetVariationsRequestContent.RequiredProperties = ["partnerTag", "asin"];

/**
 * Unique Id for a partner. This is used to identify the associate tag for tracking affiliate commissions. Example: 'xyz-20'
 * @member {String} partnerTag
 */
GetVariationsRequestContent.prototype['partnerTag'] = undefined;

/**
 * Amazon Standard Identification Number. This can be either a parent ASIN (to retrieve all variations) or a child ASIN (to retrieve sibling variations). Type: Non-Empty String. Example: 'B0199980K4'
 * @member {String} asin
 */
GetVariationsRequestContent.prototype['asin'] = undefined;

/**
 * @member {module:model/Condition} condition
 */
GetVariationsRequestContent.prototype['condition'] = undefined;

/**
 * Currency of preference in which the prices information should be returned in response. By default the prices are returned in the default currency of the marketplace. Expected currency code format is the ISO 4217 currency code (i.e. USD, EUR etc.). Example: 'USD'
 * @member {String} currencyOfPreference
 */
GetVariationsRequestContent.prototype['currencyOfPreference'] = undefined;

/**
 * Languages of preference in which the information should be returned in response. By default the information is returned in the default language of the marketplace. Expected locale format is the ISO 639 language code followed by underscore followed by the ISO 3166 country code (i.e. en_US, fr_CA etc.). Currently only single language of preference is supported. Example: ['en_US']
 * @member {Array.<String>} languagesOfPreference
 */
GetVariationsRequestContent.prototype['languagesOfPreference'] = undefined;

/**
 * Reserved parameter for specifying key-value pairs. This is a flexible mechanism for passing additional context or metadata to the API.
 * @member {Object.<String, String>} properties
 */
GetVariationsRequestContent.prototype['properties'] = undefined;

/**
 * Specifies the types of values to return. You can specify multiple resources in one request. Supports high-level resources such as: - BrowseNodeInfo resources (browse nodes, ancestor, sales rank, website sales rank) - Images resources (primary and variant images in small, medium, large sizes) - ItemInfo resources (title, features, product info, technical info, etc.) - OffersV2 resources (availability, condition, price, merchant info, deal details) - VariationSummary resources (price range, variation dimensions) - ParentASIN Default: ['ItemInfo.Title']
 * @member {Array.<module:model/GetVariationsResource>} resources
 */
GetVariationsRequestContent.prototype['resources'] = undefined;

/**
 * Number of variations to be returned per page in GetVariations. By default, GetVariations returns 10 variations per page. Valid range: 1-10. Type: Positive Integer Less than or equal to 10 Default: 10 Example: 10  Use this parameter to control how many variations are returned in each response. When combined with VariationPage, you can paginate through all available variations.
 * @member {Number} variationCount
 */
GetVariationsRequestContent.prototype['variationCount'] = undefined;

/**
 * Page number of variations returned by GetVariations. By default, GetVariations returns the first page. Use VariationPage to return a subsection of the response. By default, there are 10 variations per page (configurable via VariationCount). Type: Positive Integer Default: 1 Example: 1
 * @member {Number} variationPage
 */
GetVariationsRequestContent.prototype['variationPage'] = undefined;






export default GetVariationsRequestContent;

