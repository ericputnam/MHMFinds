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
/**
* Enum class GetVariationsResource.
* @enum {}
* @readonly
*/
export default class GetVariationsResource {
    
        /**
         * value: "browseNodeInfo.browseNodes"
         * @const
         */
        "browseNodeInfo.browseNodes" = "browseNodeInfo.browseNodes";

    
        /**
         * value: "browseNodeInfo.browseNodes.ancestor"
         * @const
         */
        "browseNodeInfo.browseNodes.ancestor" = "browseNodeInfo.browseNodes.ancestor";

    
        /**
         * value: "browseNodeInfo.browseNodes.salesRank"
         * @const
         */
        "browseNodeInfo.browseNodes.salesRank" = "browseNodeInfo.browseNodes.salesRank";

    
        /**
         * value: "browseNodeInfo.websiteSalesRank"
         * @const
         */
        "browseNodeInfo.websiteSalesRank" = "browseNodeInfo.websiteSalesRank";

    
        /**
         * value: "customerReviews.count"
         * @const
         */
        "customerReviews.count" = "customerReviews.count";

    
        /**
         * value: "customerReviews.starRating"
         * @const
         */
        "customerReviews.starRating" = "customerReviews.starRating";

    
        /**
         * value: "images.primary.small"
         * @const
         */
        "images.primary.small" = "images.primary.small";

    
        /**
         * value: "images.primary.medium"
         * @const
         */
        "images.primary.medium" = "images.primary.medium";

    
        /**
         * value: "images.primary.large"
         * @const
         */
        "images.primary.large" = "images.primary.large";

    
        /**
         * value: "images.primary.highRes"
         * @const
         */
        "images.primary.highRes" = "images.primary.highRes";

    
        /**
         * value: "images.variants.small"
         * @const
         */
        "images.variants.small" = "images.variants.small";

    
        /**
         * value: "images.variants.medium"
         * @const
         */
        "images.variants.medium" = "images.variants.medium";

    
        /**
         * value: "images.variants.large"
         * @const
         */
        "images.variants.large" = "images.variants.large";

    
        /**
         * value: "images.variants.highRes"
         * @const
         */
        "images.variants.highRes" = "images.variants.highRes";

    
        /**
         * value: "itemInfo.byLineInfo"
         * @const
         */
        "itemInfo.byLineInfo" = "itemInfo.byLineInfo";

    
        /**
         * value: "itemInfo.contentInfo"
         * @const
         */
        "itemInfo.contentInfo" = "itemInfo.contentInfo";

    
        /**
         * value: "itemInfo.contentRating"
         * @const
         */
        "itemInfo.contentRating" = "itemInfo.contentRating";

    
        /**
         * value: "itemInfo.classifications"
         * @const
         */
        "itemInfo.classifications" = "itemInfo.classifications";

    
        /**
         * value: "itemInfo.externalIds"
         * @const
         */
        "itemInfo.externalIds" = "itemInfo.externalIds";

    
        /**
         * value: "itemInfo.features"
         * @const
         */
        "itemInfo.features" = "itemInfo.features";

    
        /**
         * value: "itemInfo.manufactureInfo"
         * @const
         */
        "itemInfo.manufactureInfo" = "itemInfo.manufactureInfo";

    
        /**
         * value: "itemInfo.productInfo"
         * @const
         */
        "itemInfo.productInfo" = "itemInfo.productInfo";

    
        /**
         * value: "itemInfo.technicalInfo"
         * @const
         */
        "itemInfo.technicalInfo" = "itemInfo.technicalInfo";

    
        /**
         * value: "itemInfo.title"
         * @const
         */
        "itemInfo.title" = "itemInfo.title";

    
        /**
         * value: "itemInfo.tradeInInfo"
         * @const
         */
        "itemInfo.tradeInInfo" = "itemInfo.tradeInInfo";

    
        /**
         * value: "parentASIN"
         * @const
         */
        "parentASIN" = "parentASIN";

    
        /**
         * value: "offersV2.listings.availability"
         * @const
         */
        "offersV2.listings.availability" = "offersV2.listings.availability";

    
        /**
         * value: "offersV2.listings.condition"
         * @const
         */
        "offersV2.listings.condition" = "offersV2.listings.condition";

    
        /**
         * value: "offersV2.listings.dealDetails"
         * @const
         */
        "offersV2.listings.dealDetails" = "offersV2.listings.dealDetails";

    
        /**
         * value: "offersV2.listings.isBuyBoxWinner"
         * @const
         */
        "offersV2.listings.isBuyBoxWinner" = "offersV2.listings.isBuyBoxWinner";

    
        /**
         * value: "offersV2.listings.loyaltyPoints"
         * @const
         */
        "offersV2.listings.loyaltyPoints" = "offersV2.listings.loyaltyPoints";

    
        /**
         * value: "offersV2.listings.merchantInfo"
         * @const
         */
        "offersV2.listings.merchantInfo" = "offersV2.listings.merchantInfo";

    
        /**
         * value: "offersV2.listings.price"
         * @const
         */
        "offersV2.listings.price" = "offersV2.listings.price";

    
        /**
         * value: "offersV2.listings.type"
         * @const
         */
        "offersV2.listings.type" = "offersV2.listings.type";

    
        /**
         * value: "variationSummary.price.highestPrice"
         * @const
         */
        "variationSummary.price.highestPrice" = "variationSummary.price.highestPrice";

    
        /**
         * value: "variationSummary.price.lowestPrice"
         * @const
         */
        "variationSummary.price.lowestPrice" = "variationSummary.price.lowestPrice";

    
        /**
         * value: "variationSummary.variationDimension"
         * @const
         */
        "variationSummary.variationDimension" = "variationSummary.variationDimension";

    

    /**
    * Returns a <code>GetVariationsResource</code> enum value from a Javascript object name.
    * @param {Object} data The plain JavaScript object containing the name of the enum value.
    * @return {module:model/GetVariationsResource} The enum <code>GetVariationsResource</code> value.
    */
    static constructFromObject(object) {
        return object;
    }
}

