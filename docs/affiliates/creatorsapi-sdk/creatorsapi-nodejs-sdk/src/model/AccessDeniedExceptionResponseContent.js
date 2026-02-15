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
import AccessDeniedReason from './AccessDeniedReason';

/**
 * The AccessDeniedExceptionResponseContent model module.
 * @module model/AccessDeniedExceptionResponseContent
 * @version 1.0.0
 */
class AccessDeniedExceptionResponseContent {
    /**
     * Constructs a new <code>AccessDeniedExceptionResponseContent</code>.
     * User does not have sufficient access to perform this action.
     * @alias module:model/AccessDeniedExceptionResponseContent
     * @param message {String} 
     * @param reason {module:model/AccessDeniedReason} 
     */
    constructor(message, reason) { 
        
        AccessDeniedExceptionResponseContent.initialize(this, message, reason);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, message, reason) { 
        obj['message'] = message;
        obj['reason'] = reason;
    }

    /**
     * Constructs a <code>AccessDeniedExceptionResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/AccessDeniedExceptionResponseContent} obj Optional instance to populate.
     * @return {module:model/AccessDeniedExceptionResponseContent} The populated <code>AccessDeniedExceptionResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new AccessDeniedExceptionResponseContent();

            if (data.hasOwnProperty('type')) {
                obj['type'] = ApiClient.convertToType(data['type'], 'String');
            }
            if (data.hasOwnProperty('message')) {
                obj['message'] = ApiClient.convertToType(data['message'], 'String');
            }
            if (data.hasOwnProperty('reason')) {
                obj['reason'] = AccessDeniedReason.constructFromObject(data['reason']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>AccessDeniedExceptionResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>AccessDeniedExceptionResponseContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of AccessDeniedExceptionResponseContent.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        // ensure the json data is a string
        if (data['type'] && !(typeof data['type'] === 'string' || data['type'] instanceof String)) {
            throw new Error("Expected the field `type` to be a primitive type in the JSON string but got " + data['type']);
        }
        // ensure the json data is a string
        if (data['message'] && !(typeof data['message'] === 'string' || data['message'] instanceof String)) {
            throw new Error("Expected the field `message` to be a primitive type in the JSON string but got " + data['message']);
        }

        return true;
    }


}

AccessDeniedExceptionResponseContent.RequiredProperties = ["message", "reason"];

/**
 * The exception type identifier for clients to programmatically identify the exception
 * @member {String} type
 */
AccessDeniedExceptionResponseContent.prototype['type'] = undefined;

/**
 * @member {String} message
 */
AccessDeniedExceptionResponseContent.prototype['message'] = undefined;

/**
 * @member {module:model/AccessDeniedReason} reason
 */
AccessDeniedExceptionResponseContent.prototype['reason'] = undefined;






export default AccessDeniedExceptionResponseContent;

