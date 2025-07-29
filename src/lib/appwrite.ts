import { Client, Account, Databases, Storage, Query, ID } from 'appwrite';

const client = new Client();

// You need to replace these with your actual Appwrite project details
client
  .setEndpoint('https://cloud.appwrite.io/v1') // Your API Endpoint
  .setProject('684c44cb002c7271998e'); // Replace with your actual project ID

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Replace with your actual database ID
export const DATABASE_ID = '684c457200384960c942';

export const COLLECTIONS = {
  USERS: 'users',
  EMPLOYEES: 'employees',
  CUSTOMERS: 'customers', 
  STORES: 'stores',
  TASKS: 'tasks',
  DAILY_REPORTS: 'daily-reports',
  CREDITS: 'credits',
  DOCUMENTS: 'documents',
  INVOICES: 'invoices',
  STATS: 'stats',
  SALARY_RECORDS: "salary-records",
  CHAT_MESSAGES: "chat-messages",
  INVENTORY: "inventory",
  ATTENDANCE: "68877fd3000f7a0f7236",
  LAMINATION_TYPES: "68878131002b39ca4827"
};

// Helper function to create user accounts
export const createUserAccount = async (email: string, password: string, name: string) => {
  try {
    const user = await account.create(ID.unique(), email, password, name);
    return user;
  } catch (error) {
    console.error('Error creating user account:', error);
    throw error;
  }
};

export { Query, ID };
export default client;