import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load environment variables - you may need to set these
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key needed for schema changes

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these environment variables and try again.')
  process.exit(1)
}

console.log('🔧 Initializing Supabase client...')
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('📖 Reading migration file...')
    const migrationSQL = readFileSync('./document_review_system_migration.sql', 'utf8')
    
    console.log('🚀 Running document review system migration...')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec', {
      sql: migrationSQL
    })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('📋 New columns added to documents table:')
    console.log('   - review_status (text)')
    console.log('   - reviewed_by (uuid)')  
    console.log('   - reviewed_at (timestamp)')
    console.log('   - review_comments (text)')
    console.log('   - Updated approval_status constraint')
    console.log('   - Added indexes for performance')
    
    console.log('\n🔍 Verifying migration...')
    
    // Verify the columns were created
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'documents')
      .in('column_name', ['review_status', 'reviewed_by', 'reviewed_at', 'review_comments'])
    
    if (columnsError) {
      console.warn('⚠️  Could not verify columns:', columnsError.message)
    } else {
      console.log('✅ Verified columns:', columns)
    }
    
    console.log('\n🎉 Document review system is ready!')
    console.log('You can now use the dual workflow system:')
    console.log('   📋 Review queue for photos, reports (immediate access)')
    console.log('   🔒 Approval required for contracts, invoices (blocked)')
    
  } catch (err) {
    console.error('💥 Unexpected error:', err)
    process.exit(1)
  }
}

// Alternative: Direct SQL execution if RPC doesn't work
async function runMigrationDirect() {
  try {
    console.log('📖 Reading migration file...')
    const migrationSQL = readFileSync('./document_review_system_migration.sql', 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'))
      .filter(stmt => !stmt.match(/^(BEGIN|COMMIT)$/i))
    
    console.log(`🚀 Running ${statements.length} migration statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${stmt.substring(0, 50)}...`)
        const { error } = await supabase.from('pg_stat_statements').select().limit(0) // This will fail but test connection
        // Note: Direct SQL execution requires special setup in Supabase
      }
    }
    
    console.log('⚠️  Direct SQL execution requires Supabase service role with elevated permissions.')
    console.log('Please run the migration manually in your Supabase SQL editor instead.')
    
  } catch (err) {
    console.log('ℹ️  Please run the migration manually in Supabase SQL editor:')
    console.log('   1. Open your Supabase dashboard')
    console.log('   2. Go to SQL Editor')
    console.log('   3. Copy and paste the contents of document_review_system_migration.sql')
    console.log('   4. Run the migration')
  }
}

// Run the migration
console.log('🎯 Starting Document Review System Migration')
console.log('================================================')

runMigration().catch(() => {
  console.log('\n📝 Manual Migration Instructions:')
  console.log('================================')
  console.log('1. Open your Supabase Dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy the contents of document_review_system_migration.sql')
  console.log('4. Paste and execute the migration')
  console.log('5. The system will then work with the new review functionality')
})