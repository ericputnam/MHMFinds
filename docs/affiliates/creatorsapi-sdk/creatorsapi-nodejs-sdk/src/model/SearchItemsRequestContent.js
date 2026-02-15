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
import Availability from './Availability';
import Condition from './Condition';
import DeliveryFlag from './DeliveryFlag';
import SearchItemsResource from './SearchItemsResource';
import SortBy from './SortBy';

/**
 * The SearchItemsRequestContent model module.
 * @module model/SearchItemsRequestContent
 * @version 1.0.0
 */
class SearchItemsRequestContent {
    /**
     * Constructs a new <code>SearchItemsRequestContent</code>.
     * The request object for the search items operation. It contains the request parameters for the search items operation.
     * @alias module:model/SearchItemsRequestContent
     */
    constructor() { 
        
        SearchItemsRequestContent.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>SearchItemsRequestContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/SearchItemsRequestContent} obj Optional instance to populate.
     * @return {module:model/SearchItemsRequestContent} The populated <code>SearchItemsRequestContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new SearchItemsRequestContent();

            if (data.hasOwnProperty('actor')) {
                obj['actor'] = ApiClient.convertToType(data['actor'], 'String');
            }
            if (data.hasOwnProperty('artist')) {
                obj['artist'] = ApiClient.convertToType(data['artist'], 'String');
            }
            if (data.hasOwnProperty('author')) {
                obj['author'] = ApiClient.convertToType(data['author'], 'String');
            }
            if (data.hasOwnProperty('availability')) {
                obj['availability'] = Availability.constructFromObject(data['availability']);
            }
            if (data.hasOwnProperty('brand')) {
                obj['brand'] = ApiClient.convertToType(data['brand'], 'String');
            }
            if (data.hasOwnProperty('browseNodeId')) {
                obj['browseNodeId'] = ApiClient.convertToType(data['browseNodeId'], 'String');
            }
            if (data.hasOwnProperty('condition')) {
                obj['condition'] = Condition.constructFromObject(data['condition']);
            }
            if (data.hasOwnProperty('currencyOfPreference')) {
                obj['currencyOfPreference'] = ApiClient.convertToType(data['currencyOfPreference'], 'String');
            }
            if (data.hasOwnProperty('deliveryFlags')) {
                obj['deliveryFlags'] = ApiClient.convertToType(data['deliveryFlags'], [DeliveryFlag]);
            }
            if (data.hasOwnProperty('itemCount')) {
                obj['itemCount'] = ApiClient.convertToType(data['itemCount'], 'Number');
            }
            if (data.hasOwnProperty('itemPage')) {
                obj['itemPage'] = ApiClient.convertToType(data['itemPage'], 'Number');
            }
            if (data.hasOwnProperty('keywords')) {
                obj['keywords'] = ApiClient.convertToType(data['keywords'], 'String');
            }
            if (data.hasOwnProperty('languagesOfPreference')) {
                obj['languagesOfPreference'] = ApiClient.convertToType(data['languagesOfPreference'], ['String']);
            }
            if (data.hasOwnProperty('maxPrice')) {
                obj['maxPrice'] = ApiClient.convertToType(data['maxPrice'], 'Number');
            }
            if (data.hasOwnProperty('minPrice')) {
                obj['minPrice'] = ApiClient.convertToType(data['minPrice'], 'Number');
            }
            if (data.hasOwnProperty('minReviewsRating')) {
                obj['minReviewsRating'] = ApiClient.convertToType(data['minReviewsRating'], 'Number');
            }
            if (data.hasOwnProperty('minSavingPercent')) {
                obj['minSavingPercent'] = ApiClient.convertToType(data['minSavingPercent'], 'Number');
            }
            if (data.hasOwnProperty('partnerTag')) {
                obj['partnerTag'] = ApiClient.convertToType(data['partnerTag'], 'String');
            }
            if (data.hasOwnProperty('properties')) {
                obj['properties'] = ApiClient.convertToType(data['properties'], {'String': 'String'});
            }
            if (data.hasOwnProperty('resources')) {
                obj['resources'] = ApiClient.convertToType(data['resources'], [SearchItemsResource]);
            }
            if (data.hasOwnProperty('searchIndex')) {
                obj['searchIndex'] = ApiClient.convertToType(data['searchIndex'], 'String');
            }
            if (data.hasOwnProperty('sortBy')) {
                obj['sortBy'] = SortBy.constructFromObject(data['sortBy']);
            }
            if (data.hasOwnProperty('title')) {
                obj['title'] = ApiClient.convertToType(data['title'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>SearchItemsRequestContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>SearchItemsRequestContent</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['actor'] && !(typeof data['actor'] === 'string' || data['actor'] instanceof String)) {
            throw new Error("Expected the field `actor` to be a primitive type in the JSON string but got " + data['actor']);
        }
        // ensure the json data is a string
        if (data['artist'] && !(typeof data['artist'] === 'string' || data['artist'] instanceof String)) {
            throw new Error("Expected the field `artist` to be a primitive type in the JSON string but got " + data['artist']);
        }
        // ensure the json data is a string
        if (data['author'] && !(typeof data['author'] === 'string' || data['author'] instanceof String)) {
            throw new Error("Expected the field `author` to be a primitive type in the JSON string but got " + data['author']);
        }
        // ensure the json data is a string
        if (data['brand'] && !(typeof data['brand'] === 'string' || data['brand'] instanceof String)) {
            throw new Error("Expected the field `brand` to be a primitive type in the JSON string but got " + data['brand']);
        }
        // ensure the json data is a string
        if (data['browseNodeId'] && !(typeof data['browseNodeId'] === 'string' || data['browseNodeId'] instanceof String)) {
            throw new Error("Expected the field `browseNodeId` to be a primitive type in the JSON string but got " + data['browseNodeId']);
        }
        // ensure the json data is a string
        if (data['currencyOfPreference'] && !(typeof data['currencyOfPreference'] === 'string' || data['currencyOfPreference'] instanceof String)) {
            throw new Error("Expected the field `currencyOfPreference` to be a primitive type in the JSON string but got " + data['currencyOfPreference']);
        }
        // ensure the json data is an array
        if (!Array.isArray(data['deliveryFlags'])) {
            throw new Error("Expected the field `deliveryFlags` to be an array in the JSON data but got " + data['deliveryFlags']);
        }
        // ensure the json data is a string
        if (data['keywords'] && !(typeof data['keywords'] === 'string' || data['keywords'] instanceof String)) {
            throw new Error("Expected the field `keywords` to be a primitive type in the JSON string but got " + data['keywords']);
        }
        // ensure the json data is an array
        if (!Array.isArray(data['languagesOfPreference'])) {
            throw new Error("Expected the field `languagesOfPreference` to be an array in the JSON data but got " + data['languagesOfPreference']);
        }
        // ensure the json data is a string
        if (data['partnerTag'] && !(typeof data['partnerTag'] === 'string' || data['partnerTag'] instanceof String)) {
            throw new Error("Expected the field `partnerTag` to be a primitive type in the JSON string but got " + data['partnerTag']);
        }
        // ensure the json data is an array
        if (!Array.isArray(data['resources'])) {
            throw new Error("Expected the field `resources` to be an array in the JSON data but got " + data['resources']);
        }
        // ensure the json data is a string
        if (data['searchIndex'] && !(typeof data['searchIndex'] === 'string' || data['searchIndex'] instanceof String)) {
            throw new Error("Expected the field `searchIndex` to be a primitive type in the JSON string but got " + data['searchIndex']);
        }
        // ensure the json data is a string
        if (data['title'] && !(typeof data['title'] === 'string' || data['title'] instanceof String)) {
            throw new Error("Expected the field `title` to be a primitive type in the JSON string but got " + data['title']);
        }

        return true;
    }


}



/**
 * Actor name associated with the item. You can enter all or part of the name.
 * @member {String} actor
 */
SearchItemsRequestContent.prototype['actor'] = undefined;

/**
 * Artist name associated with the item. You can enter all or part of the name.
 * @member {String} artist
 */
SearchItemsRequestContent.prototype['artist'] = undefined;

/**
 * Author name associated with the item. You can enter all or part of the name.
 * @member {String} author
 */
SearchItemsRequestContent.prototype['author'] = undefined;

/**
 * @member {module:model/Availability} availability
 */
SearchItemsRequestContent.prototype['availability'] = undefined;

/**
 * Brand name associated with the item. You can enter all or part of the name.
 * @member {String} brand
 */
SearchItemsRequestContent.prototype['brand'] = undefined;

/**
 * A unique ID assigned by Amazon that identifies a product category/sub-category. The BrowseNodeId is a positive Long having max value upto Long.MAX_VALUE i.e. 9223372036854775807 (inclusive).
 * @member {String} browseNodeId
 */
SearchItemsRequestContent.prototype['browseNodeId'] = undefined;

/**
 * @member {module:model/Condition} condition
 */
SearchItemsRequestContent.prototype['condition'] = undefined;

/**
 * Currency of preference in which the prices information should be returned in response. By default the prices are returned in the default currency of the marketplace. Expected currency code format is the ISO 4217 currency code (i.e. USD, EUR etc.).
 * @member {String} currencyOfPreference
 */
SearchItemsRequestContent.prototype['currencyOfPreference'] = undefined;

/**
 * List of DeliveryFlag which denotes a certain delivery program.
 * @member {Array.<module:model/DeliveryFlag>} deliveryFlags
 */
SearchItemsRequestContent.prototype['deliveryFlags'] = undefined;

/**
 * The number of items desired in SearchItems response.
 * @member {Number} itemCount
 */
SearchItemsRequestContent.prototype['itemCount'] = undefined;

/**
 * The specific page of items to be returned from the available Search Results.
 * @member {Number} itemPage
 */
SearchItemsRequestContent.prototype['itemPage'] = undefined;

/**
 * A word or phrase that describes an item i.e. the search query.
 * @member {String} keywords
 */
SearchItemsRequestContent.prototype['keywords'] = undefined;

/**
 * Languages in order of preference in which the item information should be returned in response. By default the item information is returned in the default language of the marketplace.
 * @member {Array.<String>} languagesOfPreference
 */
SearchItemsRequestContent.prototype['languagesOfPreference'] = undefined;

/**
 * The MaxPrice parameter filters search results to items with at least one offer price below the specified value.
 * @member {Number} maxPrice
 */
SearchItemsRequestContent.prototype['maxPrice'] = undefined;

/**
 * The MinPrice parameter filters search results to items with at least one offer price above the specified value.
 * @member {Number} minPrice
 */
SearchItemsRequestContent.prototype['minPrice'] = undefined;

/**
 * The MinReviewsRating parameter filters search results to items with customer review ratings above specified value.
 * @member {Number} minReviewsRating
 */
SearchItemsRequestContent.prototype['minReviewsRating'] = undefined;

/**
 * The MinSavingPercent parameter filters search results to items with at least one offer having saving percentage above the specified value.
 * @member {Number} minSavingPercent
 */
SearchItemsRequestContent.prototype['minSavingPercent'] = undefined;

/**
 * An alphanumeric token that uniquely identifies a partner. If the value of PartnerType is Associates, enter your Store Id or tracking ID.
 * @member {String} partnerTag
 */
SearchItemsRequestContent.prototype['partnerTag'] = undefined;

/**
 * Reserved parameter for specifying key-value pairs. This is a flexible mechanism for passing additional context or metadata to the API.
 * @member {Object.<String, String>} properties
 */
SearchItemsRequestContent.prototype['properties'] = undefined;

/**
 * List of resources for SearchItems operation which specify the values to return.
 * @member {Array.<module:model/SearchItemsResource>} resources
 */
SearchItemsRequestContent.prototype['resources'] = undefined;

/**
 * Indicates the product category to search. SearchIndex values differ by marketplace.
 * @member {String} searchIndex
 */
SearchItemsRequestContent.prototype['searchIndex'] = undefined;

/**
 * @member {module:model/SortBy} sortBy
 */
SearchItemsRequestContent.prototype['sortBy'] = undefined;

/**
 * Title associated with the item.
 * @member {String} title
 */
SearchItemsRequestContent.prototype['title'] = undefined;






export default SearchItemsRequestContent;

