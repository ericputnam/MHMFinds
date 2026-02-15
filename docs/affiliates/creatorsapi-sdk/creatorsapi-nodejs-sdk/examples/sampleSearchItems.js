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

// Run `npm install` and `npm run build` before executing the following code with `node sampleSearchItems.js`

/**
 * Sample script demonstrating how to use the CreatorsAPI NodeJs SDK for SearchItems API
 * SearchItems operation searches for products on Amazon based on keywords and returns
 * detailed information including images, item info, offers, and other product data.
 */

const { ApiClient, DefaultApi, SearchItemsRequestContent }  = require('../dist/index');

// Initialize API client
const apiClient = new ApiClient();

// Specify your credentials here. 
// Please add your credential id here
apiClient.credentialId = "<YOUR CREDENTIAL ID>";

// Please add your credential secret here
apiClient.credentialSecret = "<YOUR CREDENTIAL SECRET>";

/**
 * Please add your credential version here
 * For eg-
 * - 2.1 for North America (NA) region
 * - 2.2 for Europe (EU) region 
 * - 2.3 for Far East (FE) region
*/
apiClient.version = "<YOUR CREDENTIAL VERSION>";

// Initialize API
const api = new DefaultApi(apiClient);

/**
 * Sample function to demonstrate SearchItems API usage
 */
async function searchItems() {
    /**
     * Specify the marketplace to which you want to send the request
     * Eg- "www.amazon.com" for US marketplace
     * For more details, refer: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/common-request-headers-and-parameters#marketplace-locale-reference
     */
    const marketplace = "<YOUR MARKETPLACE>";

    // Create SearchItems request
    const searchItemsRequest = new SearchItemsRequestContent();
    
    /** Enter your partner tag (store/tracking id) */
    searchItemsRequest.partnerTag = '<YOUR PARTNER TAG>';
    
    /** Specify Keywords */
    searchItemsRequest.keywords = 'Harry Potter';

    /**
     * Specify the category in which search request is to be made
     */
    searchItemsRequest.searchIndex = 'Books';

    /** Specify item count to be returned in search result */
    searchItemsRequest.itemCount = 2;

    /**
     * Choose resources you want from SearchItemsResource enum
     * For more details, refer: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/search-items#resources-parameter
     */
    searchItemsRequest.resources = [
        'images.primary.medium',
        'itemInfo.title',
        'offersV2.listings.availability',
        'offersV2.listings.condition',
        'offersV2.listings.dealDetails',
        'offersV2.listings.isBuyBoxWinner',
        'offersV2.listings.loyaltyPoints',
        'offersV2.listings.merchantInfo',
        'offersV2.listings.price',
        'offersV2.listings.type'
    ];

    try {
        const response = await api.searchItems(marketplace, { searchItemsRequestContent: searchItemsRequest });
        console.log('API called successfully.');
        console.log("Complete Response:\n", JSON.stringify(response, null, 2));
    } catch (error) {
        console.log('Error calling Creators API!');
        console.log('Full Error Object:\n', JSON.stringify(error, null, 2));
    }
}

searchItems();
