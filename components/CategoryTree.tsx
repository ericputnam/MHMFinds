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
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  // Check if any child is selected (to auto-expand the path)
  const hasSelectedChild = React.useMemo(() => {
    if (!selectedPath || !hasChildren) return false;
    return selectedPath.startsWith(node.path + '/');
  }, [selectedPath, node.path, hasChildren]);

  // Start collapsed unless it's root level, selected, or has a selected child
  const [isExpanded, setIsExpanded] = useState(level === 0 || isSelected || hasSelectedChild);

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
        className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-all duration-150 group ${
          isSelected
            ? 'bg-indigo-50 border-l-3 border-indigo-500'
            : 'hover:bg-gray-50 border-l-3 border-transparent'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={handleToggle}
              className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown size={14} className={isSelected ? 'text-indigo-600' : 'text-gray-500'} />
              ) : (
                <ChevronRight size={14} className={isSelected ? 'text-indigo-600' : 'text-gray-500'} />
              )}
            </button>
          ) : (
            <div className="w-4" /> // Spacer for alignment
          )}

          {/* Folder Icon */}
          <div className="flex-shrink-0">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen size={16} className={isSelected ? 'text-indigo-600' : 'text-gray-400'} />
              ) : (
                <Folder size={16} className={isSelected ? 'text-indigo-600' : 'text-gray-400'} />
              )
            ) : (
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            )}
          </div>

          {/* Category Name */}
          <span
            className={`text-sm font-medium truncate transition-colors ${
              isSelected ? 'text-indigo-900 font-semibold' : 'text-gray-700 group-hover:text-gray-900'
            }`}
            title={node.name}
          >
            {node.name}
          </span>
        </div>

        {/* Count Badge */}
        {node.count > 0 && (
          <span
            className={`flex-shrink-0 ml-2 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
              isSelected
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
            }`}
          >
            {node.count}
          </span>
        )}
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
