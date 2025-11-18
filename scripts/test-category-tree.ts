import { aiCategorizer } from '../lib/services/aiCategorizer';

async function testCategoryTree() {
  console.log('🏷️  Category Tree Structure:\n');

  const tree = await aiCategorizer.getCategoryTree();

  function printTree(nodes: any[], indent = '') {
    for (const node of nodes) {
      console.log(`${indent}📁 ${node.name} (${node.path})`);
      if (node.children && node.children.length > 0) {
        printTree(node.children, indent + '  ');
      }
    }
  }

  printTree(tree);

  console.log('\n✅ Category tree displayed successfully\n');
}

testCategoryTree().catch(console.error);
