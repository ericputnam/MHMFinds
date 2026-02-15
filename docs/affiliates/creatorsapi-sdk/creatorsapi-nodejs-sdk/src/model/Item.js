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
import BrowseNodeInfo from './BrowseNodeInfo';
import CustomerReviews from './CustomerReviews';
import Images from './Images';
import ItemInfo from './ItemInfo';
import OffersV2 from './OffersV2';
import VariationAttribute from './VariationAttribute';

/**
 * The Item model module.
 * @module model/Item
 * @version 1.0.0
 */
class Item {
    /**
     * Constructs a new <code>Item</code>.
     * Container for item information such as ASIN, Detail Page URL and other attributes. It also includes containers for various item related resources like Images, ItemInfo, etc.
     * @alias module:model/Item
     */
    constructor() { 
        
        Item.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>Item</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Item} obj Optional instance to populate.
     * @return {module:model/Item} The populated <code>Item</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new Item();

            if (data.hasOwnProperty('asin')) {
                obj['asin'] = ApiClient.convertToType(data['asin'], 'String');
            }
            if (data.hasOwnProperty('browseNodeInfo')) {
                obj['browseNodeInfo'] = BrowseNodeInfo.constructFromObject(data['browseNodeInfo']);
            }
            if (data.hasOwnProperty('customerReviews')) {
                obj['customerReviews'] = CustomerReviews.constructFromObject(data['customerReviews']);
            }
            if (data.hasOwnProperty('detailPageURL')) {
                obj['detailPageURL'] = ApiClient.convertToType(data['detailPageURL'], 'String');
            }
            if (data.hasOwnProperty('images')) {
                obj['images'] = Images.constructFromObject(data['images']);
            }
            if (data.hasOwnProperty('itemInfo')) {
                obj['itemInfo'] = ItemInfo.constructFromObject(data['itemInfo']);
            }
            if (data.hasOwnProperty('offersV2')) {
                obj['offersV2'] = OffersV2.constructFromObject(data['offersV2']);
            }
            if (data.hasOwnProperty('parentASIN')) {
                obj['parentASIN'] = ApiClient.convertToType(data['parentASIN'], 'String');
            }
            if (data.hasOwnProperty('score')) {
                obj['score'] = ApiClient.convertToType(data['score'], 'Number');
            }
            if (data.hasOwnProperty('variationAttributes')) {
                obj['variationAttributes'] = ApiClient.convertToType(data['variationAttributes'], [VariationAttribute]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>Item</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>Item</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['asin'] && !(typeof data['asin'] === 'string' || data['asin'] instanceof String)) {
            throw new Error("Expected the field `asin` to be a primitive type in the JSON string but got " + data['asin']);
        }
        // validate the optional field `browseNodeInfo`
        if (data['browseNodeInfo']) { // data not null
          BrowseNodeInfo.validateJSON(data['browseNodeInfo']);
        }
        // validate the optional field `customerReviews`
        if (data['customerReviews']) { // data not null
          CustomerReviews.validateJSON(data['customerReviews']);
        }
        // ensure the json data is a string
        if (data['detailPageURL'] && !(typeof data['detailPageURL'] === 'string' || data['detailPageURL'] instanceof String)) {
            throw new Error("Expected the field `detailPageURL` to be a primitive type in the JSON string but got " + data['detailPageURL']);
        }
        // validate the optional field `images`
        if (data['images']) { // data not null
          Images.validateJSON(data['images']);
        }
        // validate the optional field `itemInfo`
        if (data['itemInfo']) { // data not null
          ItemInfo.validateJSON(data['itemInfo']);
        }
        // validate the optional field `offersV2`
        if (data['offersV2']) { // data not null
          OffersV2.validateJSON(data['offersV2']);
        }
        // ensure the json data is a string
        if (data['parentASIN'] && !(typeof data['parentASIN'] === 'string' || data['parentASIN'] instanceof String)) {
            throw new Error("Expected the field `parentASIN` to be a primitive type in the JSON string but got " + data['parentASIN']);
        }
        if (data['variationAttributes']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['variationAttributes'])) {
                throw new Error("Expected the field `variationAttributes` to be an array in the JSON data but got " + data['variationAttributes']);
            }
            // validate the optional field `variationAttributes` (array)
            for (const item of data['variationAttributes']) {
                VariationAttribute.validateJSON(item);
            };
        }

        return true;
    }


}



/**
 * @member {String} asin
 */
Item.prototype['asin'] = undefined;

/**
 * @member {module:model/BrowseNodeInfo} browseNodeInfo
 */
Item.prototype['browseNodeInfo'] = undefined;

/**
 * @member {module:model/CustomerReviews} customerReviews
 */
Item.prototype['customerReviews'] = undefined;

/**
 * @member {String} detailPageURL
 */
Item.prototype['detailPageURL'] = undefined;

/**
 * @member {module:model/Images} images
 */
Item.prototype['images'] = undefined;

/**
 * @member {module:model/ItemInfo} itemInfo
 */
Item.prototype['itemInfo'] = undefined;

/**
 * @member {module:model/OffersV2} offersV2
 */
Item.prototype['offersV2'] = undefined;

/**
 * @member {String} parentASIN
 */
Item.prototype['parentASIN'] = undefined;

/**
 * @member {Number} score
 */
Item.prototype['score'] = undefined;

/**
 * List of offer listing associated with a product.
 * @member {Array.<module:model/VariationAttribute>} variationAttributes
 */
Item.prototype['variationAttributes'] = undefined;






export default Item;

