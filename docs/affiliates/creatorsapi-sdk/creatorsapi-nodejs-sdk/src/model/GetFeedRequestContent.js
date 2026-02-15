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
 * The GetFeedRequestContent model module.
 * @module model/GetFeedRequestContent
 * @version 1.0.0
 */
class GetFeedRequestContent {
    /**
     * Constructs a new <code>GetFeedRequestContent</code>.
     * @alias module:model/GetFeedRequestContent
     * @param feedName {String} 
     */
    constructor(feedName) { 
        
        GetFeedRequestContent.initialize(this, feedName);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, feedName) { 
        obj['feedName'] = feedName;
    }

    /**
     * Constructs a <code>GetFeedRequestContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/GetFeedRequestContent} obj Optional instance to populate.
     * @return {module:model/GetFeedRequestContent} The populated <code>GetFeedRequestContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new GetFeedRequestContent();

            if (data.hasOwnProperty('feedName')) {
                obj['feedName'] = ApiClient.convertToType(data['feedName'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>GetFeedRequestContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>GetFeedRequestContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of GetFeedRequestContent.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        // ensure the json data is a string
        if (data['feedName'] && !(typeof data['feedName'] === 'string' || data['feedName'] instanceof String)) {
            throw new Error("Expected the field `feedName` to be a primitive type in the JSON string but got " + data['feedName']);
        }

        return true;
    }


}

GetFeedRequestContent.RequiredProperties = ["feedName"];

/**
 * @member {String} feedName
 */
GetFeedRequestContent.prototype['feedName'] = undefined;






export default GetFeedRequestContent;

