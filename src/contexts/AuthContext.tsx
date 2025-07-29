import React, { createContext, useContext, useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTIONS, Query } from '@/lib/appwrite';
import { Models } from 'appwrite';

export type UserRole = 'Admin' | 'Manager' | 'Graphic Designer' | 'Printing Technician' | 'Delivery Supervisor';

interface User extends Models.User<Models.Preferences> {
  role?: UserRole;
  storeId?: string;
  employeeData?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      console.log('Current user:', currentUser);
      
      // Fetch employee data from database to get role and other info
      let employeeData = null;
      let role: UserRole = 'Graphic Designer';
      let storeId: string | undefined;

      try {
        const employeeResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.EMPLOYEES,
          [Query.equal('authUserId', currentUser.$id)]
        );

        if (employeeResponse.documents.length > 0) {
          employeeData = employeeResponse.documents[0];
          role = employeeData.role;
          storeId = employeeData.storeId;
        } else {
          // Fallback for demo purposes - assign role based on email
          if (currentUser.email === 'admin@company.com') {
            role = 'Admin';
          } else if (currentUser.email.includes('manager')) {
            role = 'Manager';
          }
        }
      } catch (error) {
        console.log('Could not fetch employee data:', error);
        // Fallback role assignment
        if (currentUser.email === 'admin@company.com') {
          role = 'Admin';
        } else if (currentUser.email.includes('manager')) {
          role = 'Manager';
        }
      }

      const userWithRole = {
        ...currentUser,
        role,
        storeId,
        employeeData
      };
      
      setUser(userWithRole);
    } catch (error) {
      console.log('No active session:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // First, try to delete any existing session
      try {
        await account.deleteSession('current');
      } catch (e) {
        // Ignore if no session exists
        console.log('No existing session to delete');
      }

      // Create new session
      const session = await account.createEmailPasswordSession(email, password);
      console.log('Login successful:', session);
      
      // Get user details
      await checkAuth();
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear the user state
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};