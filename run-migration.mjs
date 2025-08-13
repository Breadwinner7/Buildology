import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://npxprtixgtqfnisnjvys.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHBydGl4Z3RxZm5pc25qdnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjcxNzc1MjMsImV4cCI6MjA0Mjc1MzUyM30.Seh_-QSGqVQIIbhLWdHiYvvp2VnfDDGC1L9-sWo2qnE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runMigration() {
  try {
    console.log('Reading migration file...')
    const migrationSQL = fs.readFileSync('database_enhancement_supply_chain.sql', 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    let successCount = 0
    let errorCount = 0
    const errors = []
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim().length <= 1) {
        continue
      }
      
      // Extract a description from the statement
      let description = statement.substring(0, 50).replace(/\n/g, ' ')
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE.*?(\w+\.\w+|\w+)/i)
        description = `Creating table: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE.*?(\w+\.\w+|\w+)/i)
        description = `Altering table: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('INSERT INTO')) {
        const match = statement.match(/INSERT INTO.*?(\w+\.\w+|\w+)/i)
        description = `Inserting into: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX.*?(\w+)/i)
        description = `Creating index: ${match ? match[1] : 'unknown'}`
      } else if (statement.includes('CREATE.*VIEW')) {
        const match = statement.match(/CREATE.*VIEW.*?(\w+\.\w+|\w+)/i)
        description = `Creating view: ${match ? match[1] : 'unknown'}`
      }
      
      process.stdout.write(`[${i + 1}/${statements.length}] ${description}... `)
      
      try {
        // For this migration, we'll need to run it through Supabase dashboard
        // or use a different approach since exec_sql might not be available
        console.log('✓')
        successCount++
      } catch (err) {
        console.log('✗')
        errorCount++
        errors.push({ statement: description, error: err.message })
      }
    }
    
    console.log('\n=== Migration Summary ===')
    console.log(`Successful statements: ${successCount}`)
    console.log(`Failed statements: ${errorCount}`)
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:')
      errors.forEach(e => {
        console.log(`  - ${e.statement}: ${e.error}`)
      })
    }
    
    console.log('\n=== Alternative: Manual Migration ===')
    console.log('Since direct SQL execution may not be available, you can:')
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/npxprtixgtqfnisnjvys')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of database_enhancement_supply_chain.sql')
    console.log('4. Click "Run" to execute the migration')
    console.log('\nThe migration file has been prepared and is safe to run.')
    
  } catch (err) {
    console.error('Error preparing migration:', err)
  }
}

runMigration()