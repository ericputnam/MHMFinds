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
 * The BrowseNodeChild model module.
 * @module model/BrowseNodeChild
 * @version 1.0.0
 */
class BrowseNodeChild {
    /**
     * Constructs a new <code>BrowseNodeChild</code>.
     * Container for BrowseNode Child information which contains BrowseNodeId, DisplayName and ContextFreeName information associated with the BrowseNode Child.
     * @alias module:model/BrowseNodeChild
     */
    constructor() { 
        
        BrowseNodeChild.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>BrowseNodeChild</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BrowseNodeChild} obj Optional instance to populate.
     * @return {module:model/BrowseNodeChild} The populated <code>BrowseNodeChild</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new BrowseNodeChild();

            if (data.hasOwnProperty('contextFreeName')) {
                obj['contextFreeName'] = ApiClient.convertToType(data['contextFreeName'], 'String');
            }
            if (data.hasOwnProperty('displayName')) {
                obj['displayName'] = ApiClient.convertToType(data['displayName'], 'String');
            }
            if (data.hasOwnProperty('id')) {
                obj['id'] = ApiClient.convertToType(data['id'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>BrowseNodeChild</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>BrowseNodeChild</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['contextFreeName'] && !(typeof data['contextFreeName'] === 'string' || data['contextFreeName'] instanceof String)) {
            throw new Error("Expected the field `contextFreeName` to be a primitive type in the JSON string but got " + data['contextFreeName']);
        }
        // ensure the json data is a string
        if (data['displayName'] && !(typeof data['displayName'] === 'string' || data['displayName'] instanceof String)) {
            throw new Error("Expected the field `displayName` to be a primitive type in the JSON string but got " + data['displayName']);
        }
        // ensure the json data is a string
        if (data['id'] && !(typeof data['id'] === 'string' || data['id'] instanceof String)) {
            throw new Error("Expected the field `id` to be a primitive type in the JSON string but got " + data['id']);
        }

        return true;
    }


}



/**
 * @member {String} contextFreeName
 */
BrowseNodeChild.prototype['contextFreeName'] = undefined;

/**
 * @member {String} displayName
 */
BrowseNodeChild.prototype['displayName'] = undefined;

/**
 * @member {String} id
 */
BrowseNodeChild.prototype['id'] = undefined;






export default BrowseNodeChild;

