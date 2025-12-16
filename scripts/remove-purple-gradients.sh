#!/bin/bash

# Remove all purple gradients from the codebase

# Replace gradient buttons with solid pink
find . -type f -name "*.tsx" -o -name "*.ts" | while read file; do
  # Skip node_modules and newapp
  if [[ $file == *"node_modules"* ]] || [[ $file == *"newapp_musthavemods"* ]]; then
    continue
  fi

  # Replace common gradient patterns
  sed -i '' 's/bg-gradient-to-r from-sims-pink to-purple-600/bg-sims-pink/g' "$file"
  sed -i '' 's/bg-gradient-to-br from-sims-pink\/10 to-purple-600\/10/bg-sims-pink\/10/g' "$file"
  sed -i '' 's/bg-gradient-to-r from-sims-pink\/20 to-purple-600\/20/bg-sims-pink\/20/g' "$file"

  # Replace gradient text
  sed -i '' 's/text-transparent bg-clip-text bg-gradient-to-r from-sims-pink via-purple-400 to-sims-blue/text-white/g' "$file"
  sed -i '' 's/text-transparent bg-clip-text bg-gradient-to-r from-sims-pink to-sims-purple/text-sims-pink/g' "$file"

  # Replace hover effects
  sed -i '' 's/hover:brightness-110/hover:bg-sims-pink\/90/g' "$file"
done

echo "Purple gradients removed!"
