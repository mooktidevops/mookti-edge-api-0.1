#!/bin/bash

# Script to fix common TypeScript errors

echo "Fixing TypeScript errors..."

# Find all files with "await request.json()" that don't have type annotation
files=$(grep -r "await request.json()" api/ --include="*.ts" | grep -v " as " | cut -d: -f1 | sort -u)

for file in $files; do
  echo "Checking $file"
  
  # Check if file has specific patterns and add appropriate types
  if grep -q "role.*content.*metadata" "$file"; then
    # Message pattern
    sed -i '' 's/await request\.json()/await request.json() as { role?: string; content?: string; metadata?: any }/' "$file"
  elif grep -q "userId" "$file"; then
    # User data pattern
    sed -i '' 's/await request\.json()/await request.json() as { userId?: string; [key: string]: any }/' "$file"
  elif grep -q "message" "$file"; then
    # Chat pattern
    sed -i '' 's/await request\.json()/await request.json() as { message?: string; context?: any }/' "$file"
  else
    # Generic pattern
    sed -i '' 's/await request\.json()/await request.json() as Record<string, any>/' "$file"
  fi
done

echo "Fixed request.json() type annotations"

# Fix verifyAuth imports
echo "Fixing verifyAuth imports..."
find api/ -name "*.ts" -exec sed -i '' 's/import { verifyAuth }/import { verifyApiAuth }/' {} \;
find api/ -name "*.ts" -exec sed -i '' 's/verifyAuth(/verifyApiAuth(/' {} \;

echo "Done!"