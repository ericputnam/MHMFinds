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
import ReportMetadata from './ReportMetadata';

/**
 * The ListReportsResponseContent model module.
 * @module model/ListReportsResponseContent
 * @version 1.0.0
 */
class ListReportsResponseContent {
    /**
     * Constructs a new <code>ListReportsResponseContent</code>.
     * @alias module:model/ListReportsResponseContent
     * @param reports {Array.<module:model/ReportMetadata>} 
     */
    constructor(reports) { 
        
        ListReportsResponseContent.initialize(this, reports);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj, reports) { 
        obj['reports'] = reports;
    }

    /**
     * Constructs a <code>ListReportsResponseContent</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ListReportsResponseContent} obj Optional instance to populate.
     * @return {module:model/ListReportsResponseContent} The populated <code>ListReportsResponseContent</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new ListReportsResponseContent();

            if (data.hasOwnProperty('reports')) {
                obj['reports'] = ApiClient.convertToType(data['reports'], [ReportMetadata]);
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>ListReportsResponseContent</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>ListReportsResponseContent</code>.
     */
    static validateJSON(data) {
        // check to make sure all required properties are present in the JSON string
        for (const property of ListReportsResponseContent.RequiredProperties) {
            if (!data.hasOwnProperty(property)) {
                throw new Error("The required field `" + property + "` is not found in the JSON data: " + JSON.stringify(data));
            }
        }
        if (data['reports']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['reports'])) {
                throw new Error("Expected the field `reports` to be an array in the JSON data but got " + data['reports']);
            }
            // validate the optional field `reports` (array)
            for (const item of data['reports']) {
                ReportMetadata.validateJSON(item);
            };
        }

        return true;
    }


}

ListReportsResponseContent.RequiredProperties = ["reports"];

/**
 * @member {Array.<module:model/ReportMetadata>} reports
 */
ListReportsResponseContent.prototype['reports'] = undefined;






export default ListReportsResponseContent;

