#!/bin/bash

# Apply the client-specific budget fixes

# 1. Backup original files
echo "Backing up original files..."
cp client/src/components/budget/UnifiedBudgetManager.tsx client/src/components/budget/UnifiedBudgetManager.tsx.bak
cp client/src/components/budget/BudgetFeatureContext.tsx client/src/components/budget/BudgetFeatureContext.tsx.bak

# 2. Apply fixed versions
echo "Applying fixed versions..."
cp client/src/components/budget/UnifiedBudgetManager.fixed.tsx client/src/components/budget/UnifiedBudgetManager.tsx
cp client/src/components/budget/BudgetFeatureContext.fixed.tsx client/src/components/budget/BudgetFeatureContext.tsx

echo "Updates applied successfully!"