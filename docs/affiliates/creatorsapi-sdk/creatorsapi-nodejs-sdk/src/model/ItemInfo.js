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
import ByLineInfo from './ByLineInfo';
import Classifications from './Classifications';
import ContentInfo from './ContentInfo';
import ContentRating from './ContentRating';
import ExternalIds from './ExternalIds';
import ManufactureInfo from './ManufactureInfo';
import MultiValuedAttribute from './MultiValuedAttribute';
import ProductInfo from './ProductInfo';
import SingleStringValuedAttribute from './SingleStringValuedAttribute';
import TechnicalInfo from './TechnicalInfo';
import TradeInInfo from './TradeInInfo';

/**
 * The ItemInfo model module.
 * @module model/ItemInfo
 * @version 1.0.0
 */
class ItemInfo {
    /**
     * Constructs a new <code>ItemInfo</code>.
     * Container for ItemInfo high level resource which is a collection of large number of attributes describing a product.
     * @alias module:model/ItemInfo
     */
    constructor() { 
        
        ItemInfo.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>ItemInfo</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ItemInfo} obj Optional instance to populate.
     * @return {module:model/ItemInfo} The populated <code>ItemInfo</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ItemInfo();

            if (data.hasOwnProperty('byLineInfo')) {
                obj['byLineInfo'] = ByLineInfo.constructFromObject(data['byLineInfo']);
            }
            if (data.hasOwnProperty('classifications')) {
                obj['classifications'] = Classifications.constructFromObject(data['classifications']);
            }
            if (data.hasOwnProperty('contentInfo')) {
                obj['contentInfo'] = ContentInfo.constructFromObject(data['contentInfo']);
            }
            if (data.hasOwnProperty('contentRating')) {
                obj['contentRating'] = ContentRating.constructFromObject(data['contentRating']);
            }
            if (data.hasOwnProperty('externalIds')) {
                obj['externalIds'] = ExternalIds.constructFromObject(data['externalIds']);
            }
            if (data.hasOwnProperty('features')) {
                obj['features'] = MultiValuedAttribute.constructFromObject(data['features']);
            }
            if (data.hasOwnProperty('manufactureInfo')) {
                obj['manufactureInfo'] = ManufactureInfo.constructFromObject(data['manufactureInfo']);
            }
            if (data.hasOwnProperty('productInfo')) {
                obj['productInfo'] = ProductInfo.constructFromObject(data['productInfo']);
            }
            if (data.hasOwnProperty('technicalInfo')) {
                obj['technicalInfo'] = TechnicalInfo.constructFromObject(data['technicalInfo']);
            }
            if (data.hasOwnProperty('title')) {
                obj['title'] = SingleStringValuedAttribute.constructFromObject(data['title']);
            }
            if (data.hasOwnProperty('tradeInInfo')) {
                obj['tradeInInfo'] = TradeInInfo.constructFromObject(data['tradeInInfo']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ItemInfo</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ItemInfo</code>.
     */
    static validateJSON(data) {
        // validate the optional field `byLineInfo`
        if (data['byLineInfo']) { // data not null
          ByLineInfo.validateJSON(data['byLineInfo']);
        }
        // validate the optional field `classifications`
        if (data['classifications']) { // data not null
          Classifications.validateJSON(data['classifications']);
        }
        // validate the optional field `contentInfo`
        if (data['contentInfo']) { // data not null
          ContentInfo.validateJSON(data['contentInfo']);
        }
        // validate the optional field `contentRating`
        if (data['contentRating']) { // data not null
          ContentRating.validateJSON(data['contentRating']);
        }
        // validate the optional field `externalIds`
        if (data['externalIds']) { // data not null
          ExternalIds.validateJSON(data['externalIds']);
        }
        // validate the optional field `features`
        if (data['features']) { // data not null
          MultiValuedAttribute.validateJSON(data['features']);
        }
        // validate the optional field `manufactureInfo`
        if (data['manufactureInfo']) { // data not null
          ManufactureInfo.validateJSON(data['manufactureInfo']);
        }
        // validate the optional field `productInfo`
        if (data['productInfo']) { // data not null
          ProductInfo.validateJSON(data['productInfo']);
        }
        // validate the optional field `technicalInfo`
        if (data['technicalInfo']) { // data not null
          TechnicalInfo.validateJSON(data['technicalInfo']);
        }
        // validate the optional field `title`
        if (data['title']) { // data not null
          SingleStringValuedAttribute.validateJSON(data['title']);
        }
        // validate the optional field `tradeInInfo`
        if (data['tradeInInfo']) { // data not null
          TradeInInfo.validateJSON(data['tradeInInfo']);
        }

        return true;
    }


}



/**
 * @member {module:model/ByLineInfo} byLineInfo
 */
ItemInfo.prototype['byLineInfo'] = undefined;

/**
 * @member {module:model/Classifications} classifications
 */
ItemInfo.prototype['classifications'] = undefined;

/**
 * @member {module:model/ContentInfo} contentInfo
 */
ItemInfo.prototype['contentInfo'] = undefined;

/**
 * @member {module:model/ContentRating} contentRating
 */
ItemInfo.prototype['contentRating'] = undefined;

/**
 * @member {module:model/ExternalIds} externalIds
 */
ItemInfo.prototype['externalIds'] = undefined;

/**
 * @member {module:model/MultiValuedAttribute} features
 */
ItemInfo.prototype['features'] = undefined;

/**
 * @member {module:model/ManufactureInfo} manufactureInfo
 */
ItemInfo.prototype['manufactureInfo'] = undefined;

/**
 * @member {module:model/ProductInfo} productInfo
 */
ItemInfo.prototype['productInfo'] = undefined;

/**
 * @member {module:model/TechnicalInfo} technicalInfo
 */
ItemInfo.prototype['technicalInfo'] = undefined;

/**
 * @member {module:model/SingleStringValuedAttribute} title
 */
ItemInfo.prototype['title'] = undefined;

/**
 * @member {module:model/TradeInInfo} tradeInInfo
 */
ItemInfo.prototype['tradeInInfo'] = undefined;






export default ItemInfo;

