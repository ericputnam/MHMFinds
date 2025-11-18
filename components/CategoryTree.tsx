'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  path: string;
  level: number;
  count: number;
  children: CategoryNode[];
}

interface CategoryTreeProps {
  nodes: CategoryNode[];
  selectedPath?: string;
  onSelect: (categoryId: string, categoryPath: string) => void;
  level?: number;
}

const CategoryTreeNode: React.FC<{
  node: CategoryNode;
  selectedPath?: string;
  onSelect: (categoryId: string, categoryPath: string) => void;
  level: number;
}> = ({ node, selectedPath, onSelect, level }) => {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onSelect(node.id, node.path);
  };

  return (
    <div className="select-none">
      {/* Category Item */}
      <div
        onClick={handleSelect}
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 group ${
          isSelected
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
            : 'hover:bg-gray-50 border-2 border-transparent'
        }`}
        style={{ marginLeft: `${level * 12}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={handleToggle}
              className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-600" />
              ) : (
                <ChevronRight size={16} className="text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6" /> // Spacer for alignment
          )}

          {/* Folder Icon */}
          <div className="flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen size={18} className={isSelected ? 'text-indigo-600' : 'text-gray-500'} />
              ) : (
                <Folder size={18} className={isSelected ? 'text-indigo-600' : 'text-gray-500'} />
              )
            ) : (
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
            )}
          </div>

          {/* Category Name */}
          <span
            className={`text-sm font-medium truncate transition-colors ${
              isSelected ? 'text-indigo-900' : 'text-gray-700 group-hover:text-gray-900'
            }`}
            title={node.name}
          >
            {node.name}
          </span>
        </div>

        {/* Count Badge */}
        <span
          className={`flex-shrink-0 ml-2 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
            isSelected
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }`}
        >
          {node.count}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  nodes,
  selectedPath,
  onSelect,
  level = 0,
}) => {
  if (!nodes || nodes.length === 0) {
    return <p className="text-sm text-gray-500 italic">No categories available</p>;
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <CategoryTreeNode
          key={node.id}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          level={level}
        />
      ))}
    </div>
  );
};
