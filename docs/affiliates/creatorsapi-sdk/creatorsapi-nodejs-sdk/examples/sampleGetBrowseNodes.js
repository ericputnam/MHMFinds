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

// Run `npm install` and `npm run build` before executing the following code with `node sampleGetBrowseNodes.js`

/**
 * This sample code snippet demonstrates the CreatorsAPI NodeJs SDK for GetBrowseNodes API
 * GetBrowseNodes operation retrieves browse node information for specified browse node IDs,
 * including browse node hierarchy, ancestors, children, and contextual information.
 */

const { ApiClient, DefaultApi, GetBrowseNodesRequestContent }  = require('../dist/index');

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
 * Sample function to demonstrate GetBrowseNodes API usage
 */
async function getBrowseNodes() {
    /**
     * Specify the marketplace to which you want to send the request
     * Eg- "www.amazon.com" for US marketplace
     * For more details, refer: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/common-request-headers-and-parameters#marketplace-locale-reference
     */
    const marketplace = "<YOUR MARKETPLACE>";

    // Create GetBrowseNodes request
    const getBrowseNodesRequest = new GetBrowseNodesRequestContent();
    
    /** Enter your partner tag (store/tracking id) */
    getBrowseNodesRequest.partnerTag = '<YOUR PARTNER TAG>';
    
    /** Specify browse node id(s) */
    getBrowseNodesRequest.browseNodeIds = ['3040', '1', '3045'];

    /**
     * Specify the language code in which you want the information to be returned.
     * For more information and valid values for each locale, refer https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/locale-reference
     */
    getBrowseNodesRequest.languagesOfPreference = ['es_US'];

    /**
     * Choose resources you want from GetBrowseNodesResource enum
     * For more details, refer: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/get-browse-nodes#resources-parameter
     */
    getBrowseNodesRequest.resources = [
        'browseNodes.ancestor',
        'browseNodes.children'
    ];

    try {
        const response = await api.getBrowseNodes(marketplace, getBrowseNodesRequest);
        console.log('API called successfully.');
        console.log("Complete Response:\n", JSON.stringify(response, null, 2));
    } catch (error) {
        console.log('Error calling Creators API!');
        console.log('Full Error Object:\n', JSON.stringify(error, null, 2));
    }
}

getBrowseNodes();
