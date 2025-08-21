import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://cnihpwshsprujrhmquis.supabase.co';
export const SUPABASE_ANON_KEY =  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaWhwd3Noc3BydWpyaG1xdWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjIzMjQsImV4cCI6MjA3MTA5ODMyNH0.sFX2k9LfNxY1AwNVEdU2q_itR9qiL0_rq0yZH-ZGGjs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TABLES = {
  USERS: 'profiles',
  EMPLOYEES: 'employees',
  CUSTOMERS: 'customers',
  STORES: 'stores',
  TASKS: 'tasks',
  DAILY_REPORTS: 'daily_reports',
  CREDITS: 'credits',
  DOCUMENTS: 'documents',
  INVOICES: 'invoices',
  STATS: 'stats',
  SALARY_RECORDS: 'salary_records',
  CHAT_MESSAGES: 'chat_messages',
  INVENTORY: 'inventory',
  ATTENDANCE: 'attendance',
  LAMINATION_TYPES: 'lamination_types'
};

// Helper function to create user accounts (sign up)
export const createUserAccount = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  const user = data.user;
  if (error) throw error;
  return user;
};

export default supabase;