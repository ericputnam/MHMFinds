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
 * The ResourceNotFoundExceptionResponseContent model module.
 * @module model/ResourceNotFoundExceptionResponseContent
 * @version 1.0.0
 */
class ResourceNotFoundExceptionResponseContent {
    /**
     * Constructs a new <code>ResourceNotFoundExceptionResponseContent</code>.
     * Request references a resource which does not exist.
     * @alias module:model/ResourceNotFoundExceptionResponseContent
     * @param message {String} 
     * @param resourceId {String} 
     * @param resourceType {String} 
     */
    constructor(message, resourceId, resourceType) { 
        
        ResourceNotFoundExceptionResponseContent.initialize(this, message, resourceId, resourceType);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, message, resourceId, resourceType) { 
        obj['message'] = message;
        obj['resourceId'] = resourceId;
        obj['resourceType'] = resourceType;
    }

    /**
     * Constructs a <code>ResourceNotFoundExceptionResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ResourceNotFoundExceptionResponseContent} obj Optional instance to populate.
     * @return {module:model/ResourceNotFoundExceptionResponseContent} The populated <code>ResourceNotFoundExceptionResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ResourceNotFoundExceptionResponseContent();

            if (data.hasOwnProperty('type')) {
                obj['type'] = ApiClient.convertToType(data['type'], 'String');
            }
            if (data.hasOwnProperty('message')) {
                obj['message'] = ApiClient.convertToType(data['message'], 'String');
            }
            if (data.hasOwnProperty('resourceId')) {
                obj['resourceId'] = ApiClient.convertToType(data['resourceId'], 'String');
            }
            if (data.hasOwnProperty('resourceType')) {
                obj['resourceType'] = ApiClient.convertToType(data['resourceType'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ResourceNotFoundExceptionResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ResourceNotFoundExceptionResponseContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of ResourceNotFoundExceptionResponseContent.RequiredProperties) {
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
        if (data['resourceId'] && !(typeof data['resourceId'] === 'string' || data['resourceId'] instanceof String)) {
            throw new Error("Expected the field `resourceId` to be a primitive type in the JSON string but got " + data['resourceId']);
        }
        // ensure the json data is a string
        if (data['resourceType'] && !(typeof data['resourceType'] === 'string' || data['resourceType'] instanceof String)) {
            throw new Error("Expected the field `resourceType` to be a primitive type in the JSON string but got " + data['resourceType']);
        }

        return true;
    }


}

ResourceNotFoundExceptionResponseContent.RequiredProperties = ["message", "resourceId", "resourceType"];

/**
 * The exception type identifier for clients to programmatically identify the exception
 * @member {String} type
 */
ResourceNotFoundExceptionResponseContent.prototype['type'] = undefined;

/**
 * @member {String} message
 */
ResourceNotFoundExceptionResponseContent.prototype['message'] = undefined;

/**
 * @member {String} resourceId
 */
ResourceNotFoundExceptionResponseContent.prototype['resourceId'] = undefined;

/**
 * @member {String} resourceType
 */
ResourceNotFoundExceptionResponseContent.prototype['resourceType'] = undefined;






export default ResourceNotFoundExceptionResponseContent;

