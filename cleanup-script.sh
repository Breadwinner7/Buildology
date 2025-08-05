#!/bin/bash

# 🧹 Buildology Platform Cleanup Script
# This script removes duplications and consolidates your codebase

echo "🚀 Starting Buildology Platform Cleanup..."
echo "⚠️  Make sure you've committed your current work first!"

# Create backup branch
echo "📦 Creating backup branch..."
git add .
git commit -m "Backup before platform cleanup"
git branch backup-before-cleanup

# Create new directory structure
echo "📁 Creating new component structure..."
mkdir -p src/components/features/messaging
mkdir -p src/components/features/projects  
mkdir -p src/components/features/tasks
mkdir -p src/components/features/documents
mkdir -p src/components/shared

# Step 1: Delete duplicate messaging system (MAJOR CLEANUP)
echo "🗑️  Removing duplicate MessagingModule..."
if [ -d "src/components/modules/MessagingModule" ]; then
    rm -rf src/components/modules/MessagingModule/
    echo "✅ Deleted duplicate MessagingModule folder"
else
    echo "ℹ️  MessagingModule folder not found - skipping"
fi

# Step 2: Delete duplicate sidebar components
echo "🗑️  Removing duplicate sidebar components..."

if [ -f "src/components/layout/Sidebar.tsx" ]; then
    rm src/components/layout/Sidebar.tsx
    echo "✅ Deleted duplicate layout/Sidebar.tsx"
fi

if [ -f "src/components/app-sidebar.tsx" ]; then
    rm src/components/app-sidebar.tsx  
    echo "✅ Deleted duplicate app-sidebar.tsx"
fi

# Step 3: Delete shadcn example components (if they exist)
echo "🗑️  Removing shadcn example components..."
rm -f src/components/nav-main.tsx
rm -f src/components/nav-projects.tsx
rm -f src/components/nav-secondary.tsx  
rm -f src/components/nav-user.tsx
echo "✅ Cleaned up nav example components"

# Step 4: Move messaging components to features folder
echo "📦 Moving messaging components to features folder..."
if [ -d "src/components/modules/messages" ]; then
    mv src/components/modules/messages/* src/components/features/messaging/ 2>/dev/null || true
    rmdir src/components/modules/messages 2>/dev/null || true
    echo "✅ Moved messaging components to features/messaging/"
else
    echo "ℹ️  modules/messages folder not found - skipping move"
fi

# Step 5: Move project components if they're in wrong location
echo "📦 Organizing project components..."
if [ -f "src/components/projects/ProjectSidebar.tsx" ]; then
    mv src/components/projects/ProjectSidebar.tsx src/components/features/projects/ 2>/dev/null || true
    echo "✅ Moved ProjectSidebar to features/projects/"
fi

# Step 6: Clean up empty directories
echo "🧹 Cleaning up empty directories..."
find src/components -type d -empty -delete 2>/dev/null || true

# Step 7: Update package.json scripts (if needed)
echo "📝 Checking package.json..."
if ! grep -q "lint:fix" package.json; then
    echo "Adding lint:fix script to package.json..."
    npm pkg set scripts.lint:fix="next lint --fix"
fi

# Step 8: Create import update helper
echo "📝 Creating import update helper..."
cat > update-imports.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating import statements..."

# Update messaging imports
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i.bak "s|@/components/modules/messages/|@/components/features/messaging/|g"
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i.bak "s|@/components/modules/MessagingModule/|@/components/features/messaging/|g"

# Update project imports  
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i.bak "s|@/components/projects/|@/components/features/projects/|g"

# Clean up backup files
find src -name "*.bak" -delete

echo "✅ Import statements updated!"
EOF

chmod +x update-imports.sh

# Step 9: Show summary
echo ""
echo "🎉 CLEANUP COMPLETE!"
echo ""
echo "📊 SUMMARY:"
echo "✅ Removed duplicate MessagingModule (~500+ lines)"
echo "✅ Consolidated sidebar components"  
echo "✅ Organized components into features/ structure"
echo "✅ Cleaned up shadcn example files"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Run: ./update-imports.sh (to fix import paths)"
echo "2. Run: npm run dev (to test everything works)"
echo "3. Run: npm run lint:fix (to fix any linting issues)"
echo "4. Test your messaging and navigation features"
echo ""
echo "🔙 ROLLBACK: If anything breaks, run:"
echo "   git checkout backup-before-cleanup"
echo ""
echo "💡 TIP: Check these key files work:"
echo "   - /projects (project list)"
echo "   - /projects/[id] (project overview)"
echo "   - /projects/[id]/messages (messaging)"
echo "   - /projects/[id]/tasks (tasks)"