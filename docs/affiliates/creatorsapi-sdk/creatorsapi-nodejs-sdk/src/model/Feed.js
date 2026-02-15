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
 * The Feed model module.
 * @module model/Feed
 * @version 1.0.0
 */
class Feed {
    /**
     * Constructs a new <code>Feed</code>.
     * @alias module:model/Feed
     * @param feedName {String} 
     * @param size {Number} 
     * @param md5 {String} 
     * @param lastUpdated {String} 
     */
    constructor(feedName, size, md5, lastUpdated) { 
        
        Feed.initialize(this, feedName, size, md5, lastUpdated);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, feedName, size, md5, lastUpdated) { 
        obj['feedName'] = feedName;
        obj['size'] = size;
        obj['md5'] = md5;
        obj['lastUpdated'] = lastUpdated;
    }

    /**
     * Constructs a <code>Feed</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Feed} obj Optional instance to populate.
     * @return {module:model/Feed} The populated <code>Feed</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new Feed();

            if (data.hasOwnProperty('feedName')) {
                obj['feedName'] = ApiClient.convertToType(data['feedName'], 'String');
            }
            if (data.hasOwnProperty('size')) {
                obj['size'] = ApiClient.convertToType(data['size'], 'Number');
            }
            if (data.hasOwnProperty('md5')) {
                obj['md5'] = ApiClient.convertToType(data['md5'], 'String');
            }
            if (data.hasOwnProperty('lastUpdated')) {
                obj['lastUpdated'] = ApiClient.convertToType(data['lastUpdated'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>Feed</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>Feed</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of Feed.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        // ensure the json data is a string
        if (data['feedName'] && !(typeof data['feedName'] === 'string' || data['feedName'] instanceof String)) {
            throw new Error("Expected the field `feedName` to be a primitive type in the JSON string but got " + data['feedName']);
        }
        // ensure the json data is a string
        if (data['md5'] && !(typeof data['md5'] === 'string' || data['md5'] instanceof String)) {
            throw new Error("Expected the field `md5` to be a primitive type in the JSON string but got " + data['md5']);
        }
        // ensure the json data is a string
        if (data['lastUpdated'] && !(typeof data['lastUpdated'] === 'string' || data['lastUpdated'] instanceof String)) {
            throw new Error("Expected the field `lastUpdated` to be a primitive type in the JSON string but got " + data['lastUpdated']);
        }

        return true;
    }


}

Feed.RequiredProperties = ["feedName", "size", "md5", "lastUpdated"];

/**
 * @member {String} feedName
 */
Feed.prototype['feedName'] = undefined;

/**
 * @member {Number} size
 */
Feed.prototype['size'] = undefined;

/**
 * @member {String} md5
 */
Feed.prototype['md5'] = undefined;

/**
 * @member {String} lastUpdated
 */
Feed.prototype['lastUpdated'] = undefined;






export default Feed;

