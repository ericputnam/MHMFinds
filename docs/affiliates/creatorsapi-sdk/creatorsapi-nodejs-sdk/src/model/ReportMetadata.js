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
 * The ReportMetadata model module.
 * @module model/ReportMetadata
 * @version 1.0.0
 */
class ReportMetadata {
    /**
     * Constructs a new <code>ReportMetadata</code>.
     * @alias module:model/ReportMetadata
     * @param filename {String} 
     * @param md5 {String} 
     * @param size {Number} 
     * @param lastModified {String} 
     */
    constructor(filename, md5, size, lastModified) { 
        
        ReportMetadata.initialize(this, filename, md5, size, lastModified);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, filename, md5, size, lastModified) { 
        obj['filename'] = filename;
        obj['md5'] = md5;
        obj['size'] = size;
        obj['lastModified'] = lastModified;
    }

    /**
     * Constructs a <code>ReportMetadata</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ReportMetadata} obj Optional instance to populate.
     * @return {module:model/ReportMetadata} The populated <code>ReportMetadata</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ReportMetadata();

            if (data.hasOwnProperty('filename')) {
                obj['filename'] = ApiClient.convertToType(data['filename'], 'String');
            }
            if (data.hasOwnProperty('md5')) {
                obj['md5'] = ApiClient.convertToType(data['md5'], 'String');
            }
            if (data.hasOwnProperty('size')) {
                obj['size'] = ApiClient.convertToType(data['size'], 'Number');
            }
            if (data.hasOwnProperty('lastModified')) {
                obj['lastModified'] = ApiClient.convertToType(data['lastModified'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ReportMetadata</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ReportMetadata</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of ReportMetadata.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        // ensure the json data is a string
        if (data['filename'] && !(typeof data['filename'] === 'string' || data['filename'] instanceof String)) {
            throw new Error("Expected the field `filename` to be a primitive type in the JSON string but got " + data['filename']);
        }
        // ensure the json data is a string
        if (data['md5'] && !(typeof data['md5'] === 'string' || data['md5'] instanceof String)) {
            throw new Error("Expected the field `md5` to be a primitive type in the JSON string but got " + data['md5']);
        }
        // ensure the json data is a string
        if (data['lastModified'] && !(typeof data['lastModified'] === 'string' || data['lastModified'] instanceof String)) {
            throw new Error("Expected the field `lastModified` to be a primitive type in the JSON string but got " + data['lastModified']);
        }

        return true;
    }


}

ReportMetadata.RequiredProperties = ["filename", "md5", "size", "lastModified"];

/**
 * @member {String} filename
 */
ReportMetadata.prototype['filename'] = undefined;

/**
 * @member {String} md5
 */
ReportMetadata.prototype['md5'] = undefined;

/**
 * @member {Number} size
 */
ReportMetadata.prototype['size'] = undefined;

/**
 * @member {String} lastModified
 */
ReportMetadata.prototype['lastModified'] = undefined;






export default ReportMetadata;

