import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, TABLES } from '@/lib/appwrite';

type UserRole =
  | 'Admin'
  | 'Manager'
  | 'Graphic Designer'
  | 'Printing Technician'
  | 'Delivery Supervisor';

interface User {
  id: string;
  email: string;
  name?: string; // <-- Add name property
  role: UserRole;
  storeId?: string;
  employeeData?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: async () => {},
  loading: false,
});

export const useAuth = () => useContext(AuthContext);

const LOCAL_STORAGE_KEY = 'cerp_user'; // just for caching user profile, not session

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth on mount
    checkAuth();

    // Subscribe to Supabase auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, _session) => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Keep user cached in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [user]);

  const checkAuth = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Supabase getSession error:', sessionError);
      }

      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const supaUser = session.user;

      // Look for employee record
      let { data: employees, error: profileError } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('*')
        .eq('auth_user_id', supaUser.id)
        .limit(1);

      if (profileError) {
        console.error('Supabase profile fetch error:', profileError);
      }

      let employeeData = null;
      let role: UserRole = 'Graphic Designer';
      let storeId: string | undefined;

      if (employees && employees.length > 0) {
        employeeData = employees[0];
        role = employeeData.role;
        storeId = employeeData.store_id;
      } else {
        // fallback: assign role by email if known
        const adminEmails = ['admin@arunoffset.com', 'admin@company.com'];
        const managerEmails = ['reception@arunoffset.com', 'manager@arunoffset.com'];

        if (adminEmails.includes(supaUser.email ?? '')) {
          role = 'Admin';
        } else if (managerEmails.includes(supaUser.email ?? '')) {
          role = 'Manager';
        } else {
          role = 'Graphic Designer';
        }
      }

      const userObj: User = {
        id: supaUser.id,
        email: supaUser.email ?? '',
        name: employeeData?.name || supaUser.user_metadata?.name || '', // <-- Set name if available
        role,
        storeId,
        employeeData,
      };

      setUser(userObj);
      console.log('AuthContext: setUser', userObj);
    } catch (error) {
      setUser(null);
      console.error('AuthContext checkAuth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        await checkAuth(); // refresh user object
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('AuthContext logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
