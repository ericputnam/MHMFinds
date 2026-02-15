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
 * The ThrottleExceptionResponseContent model module.
 * @module model/ThrottleExceptionResponseContent
 * @version 1.0.0
 */
class ThrottleExceptionResponseContent {
    /**
     * Constructs a new <code>ThrottleExceptionResponseContent</code>.
     * Request was denied due to request throttling. Clients should implement exponential backoff and retry.
     * @alias module:model/ThrottleExceptionResponseContent
     * @param message {String} 
     */
    constructor(message) { 
        
        ThrottleExceptionResponseContent.initialize(this, message);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, message) { 
        obj['message'] = message;
    }

    /**
     * Constructs a <code>ThrottleExceptionResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ThrottleExceptionResponseContent} obj Optional instance to populate.
     * @return {module:model/ThrottleExceptionResponseContent} The populated <code>ThrottleExceptionResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ThrottleExceptionResponseContent();

            if (data.hasOwnProperty('type')) {
                obj['type'] = ApiClient.convertToType(data['type'], 'String');
            }
            if (data.hasOwnProperty('message')) {
                obj['message'] = ApiClient.convertToType(data['message'], 'String');
            }
            if (data.hasOwnProperty('serviceCode')) {
                obj['serviceCode'] = ApiClient.convertToType(data['serviceCode'], 'String');
            }
            if (data.hasOwnProperty('quotaCode')) {
                obj['quotaCode'] = ApiClient.convertToType(data['quotaCode'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ThrottleExceptionResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ThrottleExceptionResponseContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of ThrottleExceptionResponseContent.RequiredProperties) {
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
        // ensure the json data is a string
        if (data['serviceCode'] && !(typeof data['serviceCode'] === 'string' || data['serviceCode'] instanceof String)) {
            throw new Error("Expected the field `serviceCode` to be a primitive type in the JSON string but got " + data['serviceCode']);
        }
        // ensure the json data is a string
        if (data['quotaCode'] && !(typeof data['quotaCode'] === 'string' || data['quotaCode'] instanceof String)) {
            throw new Error("Expected the field `quotaCode` to be a primitive type in the JSON string but got " + data['quotaCode']);
        }

        return true;
    }


}

ThrottleExceptionResponseContent.RequiredProperties = ["message"];

/**
 * The exception type identifier for clients to programmatically identify the exception
 * @member {String} type
 */
ThrottleExceptionResponseContent.prototype['type'] = undefined;

/**
 * @member {String} message
 */
ThrottleExceptionResponseContent.prototype['message'] = undefined;

/**
 * @member {String} serviceCode
 */
ThrottleExceptionResponseContent.prototype['serviceCode'] = undefined;

/**
 * @member {String} quotaCode
 */
ThrottleExceptionResponseContent.prototype['quotaCode'] = undefined;






export default ThrottleExceptionResponseContent;

