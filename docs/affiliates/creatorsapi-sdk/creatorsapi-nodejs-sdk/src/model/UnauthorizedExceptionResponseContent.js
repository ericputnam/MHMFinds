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
import UnauthorizedExceptionReason from './UnauthorizedExceptionReason';

/**
 * The UnauthorizedExceptionResponseContent model module.
 * @module model/UnauthorizedExceptionResponseContent
 * @version 1.0.0
 */
class UnauthorizedExceptionResponseContent {
    /**
     * Constructs a new <code>UnauthorizedExceptionResponseContent</code>.
     * Exception indicating missing or bad authentication for the operation.
     * @alias module:model/UnauthorizedExceptionResponseContent
     * @param reason {module:model/UnauthorizedExceptionReason} 
     */
    constructor(reason) { 
        
        UnauthorizedExceptionResponseContent.initialize(this, reason);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, reason) { 
        obj['reason'] = reason;
    }

    /**
     * Constructs a <code>UnauthorizedExceptionResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/UnauthorizedExceptionResponseContent} obj Optional instance to populate.
     * @return {module:model/UnauthorizedExceptionResponseContent} The populated <code>UnauthorizedExceptionResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new UnauthorizedExceptionResponseContent();

            if (data.hasOwnProperty('type')) {
                obj['type'] = ApiClient.convertToType(data['type'], 'String');
            }
            if (data.hasOwnProperty('message')) {
                obj['message'] = ApiClient.convertToType(data['message'], 'String');
            }
            if (data.hasOwnProperty('reason')) {
                obj['reason'] = UnauthorizedExceptionReason.constructFromObject(data['reason']);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>UnauthorizedExceptionResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>UnauthorizedExceptionResponseContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of UnauthorizedExceptionResponseContent.RequiredProperties) {
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

UnauthorizedExceptionResponseContent.RequiredProperties = ["reason"];

/**
 * The exception type identifier for clients to programmatically identify the exception
 * @member {String} type
 */
UnauthorizedExceptionResponseContent.prototype['type'] = undefined;

/**
 * @member {String} message
 */
UnauthorizedExceptionResponseContent.prototype['message'] = undefined;

/**
 * @member {module:model/UnauthorizedExceptionReason} reason
 */
UnauthorizedExceptionResponseContent.prototype['reason'] = undefined;






export default UnauthorizedExceptionResponseContent;

