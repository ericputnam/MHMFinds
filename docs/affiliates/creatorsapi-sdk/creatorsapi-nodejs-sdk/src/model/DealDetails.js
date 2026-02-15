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
 * The DealDetails model module.
 * @module model/DealDetails
 * @version 1.0.0
 */
class DealDetails {
    /**
     * Constructs a new <code>DealDetails</code>.
     * Specifies deal information about an offer.
     * @alias module:model/DealDetails
     */
    constructor() { 
        
        DealDetails.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>DealDetails</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/DealDetails} obj Optional instance to populate.
     * @return {module:model/DealDetails} The populated <code>DealDetails</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new DealDetails();

            if (data.hasOwnProperty('accessType')) {
                obj['accessType'] = ApiClient.convertToType(data['accessType'], 'String');
            }
            if (data.hasOwnProperty('badge')) {
                obj['badge'] = ApiClient.convertToType(data['badge'], 'String');
            }
            if (data.hasOwnProperty('earlyAccessDurationInMilliseconds')) {
                obj['earlyAccessDurationInMilliseconds'] = ApiClient.convertToType(data['earlyAccessDurationInMilliseconds'], 'Number');
            }
            if (data.hasOwnProperty('endTime')) {
                obj['endTime'] = ApiClient.convertToType(data['endTime'], 'String');
            }
            if (data.hasOwnProperty('percentClaimed')) {
                obj['percentClaimed'] = ApiClient.convertToType(data['percentClaimed'], 'Number');
            }
            if (data.hasOwnProperty('startTime')) {
                obj['startTime'] = ApiClient.convertToType(data['startTime'], 'String');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>DealDetails</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>DealDetails</code>.
     */
    static validateJSON(data) {
        // ensure the json data is a string
        if (data['accessType'] && !(typeof data['accessType'] === 'string' || data['accessType'] instanceof String)) {
            throw new Error("Expected the field `accessType` to be a primitive type in the JSON string but got " + data['accessType']);
        }
        // ensure the json data is a string
        if (data['badge'] && !(typeof data['badge'] === 'string' || data['badge'] instanceof String)) {
            throw new Error("Expected the field `badge` to be a primitive type in the JSON string but got " + data['badge']);
        }
        // ensure the json data is a string
        if (data['endTime'] && !(typeof data['endTime'] === 'string' || data['endTime'] instanceof String)) {
            throw new Error("Expected the field `endTime` to be a primitive type in the JSON string but got " + data['endTime']);
        }
        // ensure the json data is a string
        if (data['startTime'] && !(typeof data['startTime'] === 'string' || data['startTime'] instanceof String)) {
            throw new Error("Expected the field `startTime` to be a primitive type in the JSON string but got " + data['startTime']);
        }

        return true;
    }


}



/**
 * @member {String} accessType
 */
DealDetails.prototype['accessType'] = undefined;

/**
 * @member {String} badge
 */
DealDetails.prototype['badge'] = undefined;

/**
 * @member {Number} earlyAccessDurationInMilliseconds
 */
DealDetails.prototype['earlyAccessDurationInMilliseconds'] = undefined;

/**
 * @member {String} endTime
 */
DealDetails.prototype['endTime'] = undefined;

/**
 * @member {Number} percentClaimed
 */
DealDetails.prototype['percentClaimed'] = undefined;

/**
 * @member {String} startTime
 */
DealDetails.prototype['startTime'] = undefined;






export default DealDetails;

