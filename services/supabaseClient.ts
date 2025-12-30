
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ylmparxlvpjnpotoopeb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsbXBhcnhsdnBqbnBvdG9vcGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTYwMTEsImV4cCI6MjA4MTgzMjAxMX0.lnxNFF2-O8J10uSyCG7eULNawz7huKdySD3XtGbvo6c'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  }
})
