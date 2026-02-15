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
import BrowseNodeAncestor from './BrowseNodeAncestor';
import BrowseNodeChild from './BrowseNodeChild';

/**
 * The BrowseNode model module.
 * @module model/BrowseNode
 * @version 1.0.0
 */
class BrowseNode {
    /**
     * Constructs a new <code>BrowseNode</code>.
     * Container for BrowseNode information which includes BrowseNodeId, DisplayName, ContextFreeName, IsRoot, Ancestor, Children, SalesRank associated, etc.
     * @alias module:model/BrowseNode
     */
    constructor() { 
        
        BrowseNode.initialize(this);
    }

    /**
     * Initializes the fields of this object.
     * This method is used by the constructors of any subclasses, in order to implement multiple inheritance (mix-ins).
     * Only for internal use.
     */
    static initialize(obj) { 
    }

    /**
     * Constructs a <code>BrowseNode</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/BrowseNode} obj Optional instance to populate.
     * @return {module:model/BrowseNode} The populated <code>BrowseNode</code> instance.
     */
    static constructFromObject(data, obj) {
        if (data) {
            obj = obj || new BrowseNode();

            if (data.hasOwnProperty('ancestor')) {
                obj['ancestor'] = BrowseNodeAncestor.constructFromObject(data['ancestor']);
            }
            if (data.hasOwnProperty('children')) {
                obj['children'] = ApiClient.convertToType(data['children'], [BrowseNodeChild]);
            }
            if (data.hasOwnProperty('contextFreeName')) {
                obj['contextFreeName'] = ApiClient.convertToType(data['contextFreeName'], 'String');
            }
            if (data.hasOwnProperty('displayName')) {
                obj['displayName'] = ApiClient.convertToType(data['displayName'], 'String');
            }
            if (data.hasOwnProperty('id')) {
                obj['id'] = ApiClient.convertToType(data['id'], 'String');
            }
            if (data.hasOwnProperty('isRoot')) {
                obj['isRoot'] = ApiClient.convertToType(data['isRoot'], 'Boolean');
            }
            if (data.hasOwnProperty('salesRank')) {
                obj['salesRank'] = ApiClient.convertToType(data['salesRank'], 'Number');
            }
        }
        return obj;
    }

    /**
     * Validates the JSON data with respect to <code>BrowseNode</code>.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @return {boolean} to indicate whether the JSON data is valid with respect to <code>BrowseNode</code>.
     */
    static validateJSON(data) {
        // validate the optional field `ancestor`
        if (data['ancestor']) { // data not null
          BrowseNodeAncestor.validateJSON(data['ancestor']);
        }
        if (data['children']) { // data not null
            // ensure the json data is an array
            if (!Array.isArray(data['children'])) {
                throw new Error("Expected the field `children` to be an array in the JSON data but got " + data['children']);
            }
            // validate the optional field `children` (array)
            for (const item of data['children']) {
                BrowseNodeChild.validateJSON(item);
            };
        }
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
 * @member {module:model/BrowseNodeAncestor} ancestor
 */
BrowseNode.prototype['ancestor'] = undefined;

/**
 * List of BrowseNode Children for a particular BrowseNode.
 * @member {Array.<module:model/BrowseNodeChild>} children
 */
BrowseNode.prototype['children'] = undefined;

/**
 * Indicates a displayable name for a BrowseNode that is fully context free. For e.g. DisplayName of BrowseNodeId: 3060 in US marketplace is 'Orphans & Foster Homes'. One can not infer which root category this browse node belongs to unless we have the ancestry ladder for this browse node i.e. it requires a 'context' for being intuitive. However, the ContextFreeName of this browse node is 'Children's Orphans & Foster Homes Books'. Note that, for a BrowseNode whose DisplayName is already context free will have the same ContextFreeName as DisplayName.
 * @member {String} contextFreeName
 */
BrowseNode.prototype['contextFreeName'] = undefined;

/**
 * The display name of the BrowseNode as visible on the Amazon retail website.
 * @member {String} displayName
 */
BrowseNode.prototype['displayName'] = undefined;

/**
 * Indicates the unique identifier of the BrowseNode
 * @member {String} id
 */
BrowseNode.prototype['id'] = undefined;

/**
 * Indicates if the current BrowseNode is a root category.
 * @member {Boolean} isRoot
 */
BrowseNode.prototype['isRoot'] = undefined;

/**
 * @member {Number} salesRank
 */
BrowseNode.prototype['salesRank'] = undefined;






export default BrowseNode;

