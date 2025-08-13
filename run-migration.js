const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://npxprtixgtqfnisnjvys.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5weHBydGl4Z3RxZm5pc25qdnlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzE3NzUyMywiZXhwIjoyMDQyNzUzNTIzfQ.MIu90wRJ4FnOOSEtKFkVVqnbGWOOh7l3mXdz4bVfKmY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Reading migration file...')
    const migrationSQL = fs.readFileSync('database_enhancement_supply_chain.sql', 'utf8')
    
    console.log('Running migration...')
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      console.error('Migration failed:', error)
    } else {
      console.log('Migration completed successfully!')
      console.log('Result:', data)
    }
  } catch (err) {
    console.error('Error running migration:', err)
  }
}

runMigration()