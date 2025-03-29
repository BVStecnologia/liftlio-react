import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://suqjifkhmekcdflwowiw.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cWppZmtobWVrY2RmbHdvd2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjUwOTM0NCwiZXhwIjoyMDQyMDg1MzQ0fQ.O-RO8VMAjfxZzZmDcyJeKABJJ2cn9OfIpapuxDENH8c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)