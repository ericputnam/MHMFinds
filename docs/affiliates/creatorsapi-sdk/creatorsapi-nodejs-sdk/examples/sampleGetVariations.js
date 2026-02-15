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

// Run `npm install` and `npm run build` before executing the following code with `node sampleGetVariations.js`

/**
 * This sample code snippet demonstrates the CreatorsAPI NodeJs SDK for GetVariations API
 * GetVariations operation retrieves variation information for a specified parent ASIN,
 * including all child variations with images, item info, offers, and variation dimensions.
 */

const { ApiClient, DefaultApi, GetVariationsRequestContent }  = require('../dist/index');

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
 * Sample function to demonstrate GetVariations API usage
 */
async function getVariations() {
    /**
     * Specify the marketplace to which you want to send the request
     * Eg- "www.amazon.com" for US marketplace
     * For more details, refer: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/common-request-headers-and-parameters#marketplace-locale-reference
     */
    const marketplace = "<YOUR MARKETPLACE>";

    // Create GetVariations request
    const getVariationsRequest = new GetVariationsRequestContent();
    
    /** Enter your partner tag (store/tracking id) */
    getVariationsRequest.partnerTag = '<YOUR PARTNER TAG>';
    
    /** Specify ASIN for which variations are desired */
    getVariationsRequest.asin = 'B0DLFMFBJW';

    /**
     * Choose resources you want from GetVariationsResource enum
     * For more details, refer: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/get-variations#resources-parameter
     */
    getVariationsRequest.resources = [
        'images.primary.medium',
        'itemInfo.title',
        'offersV2.listings.availability',
        'offersV2.listings.condition',
        'offersV2.listings.dealDetails',
        'offersV2.listings.isBuyBoxWinner',
        'offersV2.listings.loyaltyPoints',
        'offersV2.listings.merchantInfo',
        'offersV2.listings.price',
        'offersV2.listings.type',
        'variationSummary.variationDimension'
    ];

    try {
        const response = await api.getVariations(marketplace, getVariationsRequest);
        console.log('API called successfully.');
        console.log("Complete Response:\n", JSON.stringify(response, null, 2));
    } catch (error) {
        console.log('Error calling Creators API!');
        console.log('Full Error Object:\n', JSON.stringify(error, null, 2));
    }
}

getVariations();
