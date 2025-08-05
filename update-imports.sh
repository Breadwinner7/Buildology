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
