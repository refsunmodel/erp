// services.ts
import { supabase, TABLES } from './appwrite';

/**
 * Retry helper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      console.warn(`Retry ${i + 1} failed: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay * (i + 1))); // backoff
      }
    }
  }
  throw lastError;
}

// ---------------------- Employee Service ----------------------
export const employeeService = {
  async create(data: any) {
    return await supabase.from(TABLES.EMPLOYEES).insert([data]);
  },

  // Only fetch needed columns, cache in state in UI
  list: async (limit = 100) => {
    return await withRetry(async () => {
      const { data, error } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('id,name,role,store_id,email,auth_user_id,status,annual_salary,mode_of_payment,salary_date,created_at,advance_payment,password,last_payment_date')
        .limit(limit);

      if (error) {
        console.error('Supabase employees fetch error:', error);
        return { data: [], error };
      }
      // Map DB fields to app fields
      const mapped = (data || []).map((emp: any) => ({
        $id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        storeId: emp.store_id,
        status: emp.status,
        authUserId: emp.auth_user_id,
        annualSalary: emp.annual_salary,
        modeOfPayment: emp.mode_of_payment,
        salaryDate: emp.salary_date,
        $createdAt: emp.created_at,
        advancePayment: emp.advance_payment,
        password: emp.password,
        lastPaymentDate: emp.last_payment_date,
      }));
      return { data: mapped, error: null };
    });
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.EMPLOYEES).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.EMPLOYEES).delete().eq('id', id);
  },

  async getByStore(storeId: string, limit = 100) {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('id,name,role,email,auth_user_id,status,annual_salary,mode_of_payment,salary_date,created_at,advance_payment')
      .eq('store_id', storeId)
      .limit(limit);

    const mapped = (data || []).map((emp: any) => ({
      $id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      storeId: emp.store_id,
      status: emp.status,
      authUserId: emp.auth_user_id,
      annualSalary: emp.annual_salary,
      modeOfPayment: emp.mode_of_payment,
      salaryDate: emp.salary_date,
      $createdAt: emp.created_at,
      advancePayment: emp.advance_payment,
    }));

    if (error) console.error('Supabase getByStore error:', error);
    return { data: mapped, error };
  }
};

// ---------------------- Store Service ----------------------
export const storeService = {
  async create(data: any) {
    return await supabase.from(TABLES.STORES).insert([data]);
  },

  async list(limit: number = 100) {
    const { data, error } = await supabase
      .from(TABLES.STORES)
      .select('id,name,address')
      .limit(limit);

    if (error) {
      console.error('Supabase stores fetch error:', error);
      return { data: [], error };
    }
    return { data: data || [], error: null };
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.STORES).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.STORES).delete().eq('id', id);
  }
};

// ---------------------- Customer Service ----------------------
export const customerService = {
  async create(data: any) {
    return await supabase.from(TABLES.CUSTOMERS).insert([data]);
  },

  async list(limit: number = 500) {
    return await supabase
      .from(TABLES.CUSTOMERS)
      .select('id,name,email,phone')
      .limit(limit);
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.CUSTOMERS).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.CUSTOMERS).delete().eq('id', id);
  }
};

// ---------------------- Task Service ----------------------
export const taskService = {
  async create(data: any) {
    return await supabase.from(TABLES.TASKS).insert([data]);
  },

  // Use pagination, column selection, and push filtering to Supabase
  list: async (
    { 
      userAuthUserId, 
      limit = 20, 
      page = 0, 
      search, 
      status, 
      taskType 
    }: { 
      userAuthUserId?: string, 
      limit?: number, 
      page?: number, 
      search?: string, 
      status?: string, 
      taskType?: string 
    } = {}
  ) => {
    return await withRetry(async () => {
      let query = supabase
        .from(TABLES.TASKS)
        .select('id,order_no,title,description,task_type,assignee_id,assignee_name,due_date,due_time,status,priority,created_by,file_url,customer_phone,printing_type,workflow_stage,original_order_id,parent_task_id,last_updated,created_at')
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (userAuthUserId && /^[0-9a-f\-]{36}$/.test(userAuthUserId)) {
        query = query.eq('assignee_id', userAuthUserId);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (taskType) {
        query = query.eq('task_type', taskType);
      }
      if (search) {
        query = query.ilike('description', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Supabase tasks fetch error:', error);
        return { data: [], error };
      }
      // Map DB fields to app fields
      const mapped = (data || []).map((t: any) => ({
        $id: t.id,
        order_no: t.order_no,
        title: t.title,
        description: t.description,
        task_type: t.task_type,
        assignee_id: t.assignee_id,
        assignee_name: t.assignee_name,
        due_date: t.due_date,
        due_time: t.due_time,
        status: t.status,
        priority: t.priority,
        created_by: t.created_by,
        file_url: t.file_url,
        customer_phone: t.customer_phone,
        printing_type: t.printing_type,
        workflow_stage: t.workflow_stage,
        original_order_id: t.original_order_id,
        parent_task_id: t.parent_task_id,
        last_updated: t.last_updated,
        $createdAt: t.created_at,
      }));
      return { data: mapped, error: null };
    });
  },

  // Batch update: status + assignee in one call
  async update(id: string, data: any) {
    return await supabase.from(TABLES.TASKS).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.TASKS).delete().eq('id', id);
  },

  // Use pagination and column selection for assignee queries
  async getByAssignee(assigneeAuthUserId: string, limit = 20, page = 0) {
    let query = supabase
      .from(TABLES.TASKS)
      .select('id,order_no,title,description,task_type,assignee_id,assignee_name,due_date,due_time,status,priority,created_by,file_url,customer_phone,printing_type,workflow_stage,original_order_id,parent_task_id,last_updated,created_at')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (assigneeAuthUserId && /^[0-9a-f\-]{36}$/.test(assigneeAuthUserId)) {
      query = query.eq('assignee_id', assigneeAuthUserId);
    }

    const { data, error } = await query;
    const mapped = (data || []).map((t: any) => ({
      $id: t.id,
      order_no: t.order_no,
      title: t.title,
      description: t.description,
      task_type: t.task_type,
      assignee_id: t.assignee_id,
      assignee_name: t.assignee_name,
      due_date: t.due_date,
      due_time: t.due_time,
      status: t.status,
      priority: t.priority,
      created_by: t.created_by,
      file_url: t.file_url,
      customer_phone: t.customer_phone,
      printing_type: t.printing_type,
      workflow_stage: t.workflow_stage,
      original_order_id: t.original_order_id,
      parent_task_id: t.parent_task_id,
      last_updated: t.last_updated,
      $createdAt: t.created_at,
    }));

    return { data: mapped, error };
  }
};

// ---------------------- Daily Report Service ----------------------
export const dailyReportService = {
  async create(data: any) {
    return await supabase.from(TABLES.DAILY_REPORTS).insert([data]);
  },

  async list(userId?: string, storeId?: string, startDate?: string, endDate?: string, limit = 500) {
    let query = supabase.from(TABLES.DAILY_REPORTS).select('id,date,sales,expenses').limit(limit);
    if (userId) query = query.eq('user_id', userId);
    if (storeId) query = query.eq('store_id', storeId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    return await query;
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.DAILY_REPORTS).update(data).eq('id', id);
  }
};

// ---------------------- Credit Service ----------------------
export const creditService = {
  async create(data: any) {
    return await supabase.from(TABLES.CREDITS).insert([data]);
  },

  async list() {
    return await supabase.from(TABLES.CREDITS).select('id,amount,customer_id,date');
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.CREDITS).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.CREDITS).delete().eq('id', id);
  }
};

// ---------------------- Document Service ----------------------
export const documentService = {
  async create(data: any) {
    return await supabase.from(TABLES.DOCUMENTS).insert([data]);
  },

  async list() {
    return await supabase.from(TABLES.DOCUMENTS).select('id,title,created_at');
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.DOCUMENTS).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.DOCUMENTS).delete().eq('id', id);
  }
};

// ---------------------- Salary Service ----------------------
export const salaryService = {
  async create(data: any) {
    return await supabase.from(TABLES.SALARY_RECORDS).insert([data]);
  },

  // Only add .eq('employee_id', ...) if employeeId is defined and truthy
  async list(employeeId?: string, limit = 20, page = 0) {
    let query = supabase
      .from(TABLES.SALARY_RECORDS)
      .select('id,net_salary,created_at,employee_id,month,base_salary,overtime,bonus,deductions,advance_salary,status,pay_date')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (employeeId && employeeId !== 'undefined') {
      query = query.eq('employee_id', employeeId);
    }
    return await query;
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.SALARY_RECORDS).update(data).eq('id', id);
  },

  async getByEmployee(employeeId: string, limit = 20, page = 0) {
    let query = supabase
      .from(TABLES.SALARY_RECORDS)
      .select('id,net_salary,created_at,employee_id,month,base_salary,overtime,bonus,deductions,advance_salary,status,pay_date')
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (employeeId && employeeId !== 'undefined') {
      query = query.eq('employee_id', employeeId);
    }
    return await query;
  },

  async getEmployeeAttendance(employeeId: string, month: string) {
    return await supabase
      .from(TABLES.ATTENDANCE)
      .select('id,date,status')
      .eq('employee_id', employeeId)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`)
      .order('date', { ascending: true });
  }
};

// ---------------------- Chat Service ----------------------
export const chatService = {
  async sendMessage(data: any) {
    const messageData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    return await supabase.from(TABLES.CHAT_MESSAGES).insert([messageData]);
  },

  async getMessages(chatType: 'direct' | 'group', limit = 50) {
    return await supabase
      .from(TABLES.CHAT_MESSAGES)
      .select('id,sender_id,message,timestamp')
      .eq('chat_type', chatType)
      .order('timestamp', { ascending: false })
      .limit(limit);
  },

  async getDirectMessages(userId1: string, userId2: string, limit = 50) {
    return await supabase
      .from(TABLES.CHAT_MESSAGES)
      .select('id,sender_id,receiver_id,message,timestamp')
      .eq('chat_type', 'direct')
      .or(`sender_id.eq.${userId1},receiver_id.eq.${userId2}`)
      .order('timestamp', { ascending: true })
      .limit(limit);
  }
};

// ---------------------- Inventory Service ----------------------
export const inventoryService = {
  async create(data: any) {
    return await supabase.from(TABLES.INVENTORY).insert([data]);
  },

  async list() {
    return await supabase.from(TABLES.INVENTORY).select('id,name,quantity,category,status');
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.INVENTORY).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.INVENTORY).delete().eq('id', id);
  },

  async getByCategory(category: string) {
    return await supabase.from(TABLES.INVENTORY).select('id,name,quantity').eq('category', category);
  },

  async getLowStock() {
    return await supabase.from(TABLES.INVENTORY).select('id,name,quantity').eq('status', 'Low Stock');
  }
};

// ---------------------- Attendance Service ----------------------
export const attendanceService = {
  async create(data: any) {
    return await supabase.from(TABLES.ATTENDANCE).insert([data]);
  },

  async list(employeeId?: string, date?: string, month?: string, limit = 100, page = 0) {
    let query = supabase
      .from(TABLES.ATTENDANCE)
      .select('id,date,status,employee_id')
      .order('date', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (employeeId) query = query.eq('employee_id', employeeId);
    if (date) query = query.eq('date', date);
    if (month) query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
    return await query;
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.ATTENDANCE).update(data).eq('id', id);
  }
};

// ---------------------- Lamination Types Service ----------------------
export const laminationService = {
  async create(data: any) {
    return await supabase.from(TABLES.LAMINATION_TYPES).insert([data]);
  },

  async list() {
    return await supabase.from(TABLES.LAMINATION_TYPES).select('id,name').order('name', { ascending: true });
  },

  async update(id: string, data: any) {
    return await supabase.from(TABLES.LAMINATION_TYPES).update(data).eq('id', id);
  },

  async delete(id: string) {
    return await supabase.from(TABLES.LAMINATION_TYPES).delete().eq('id', id);
  }
};

// ---------------------- Stats Service ----------------------
export const statsService = {
  async getOverallStats() {
    try {
      const [employees, stores, customers, tasks, reports] = await Promise.all([
        supabase.from(TABLES.EMPLOYEES).select('id', { count: 'exact', head: true }),
        supabase.from(TABLES.STORES).select('id', { count: 'exact', head: true }),
        supabase.from(TABLES.CUSTOMERS).select('id', { count: 'exact', head: true }),
        supabase.from(TABLES.TASKS).select('id,status', { count: 'exact' }).limit(1000),
        supabase.from(TABLES.DAILY_REPORTS).select('sales,expenses').order('date', { ascending: false }).limit(20)
      ]);

      const totalSales = (reports.data || []).reduce((sum: number, r: any) => sum + (r.sales || 0), 0);
      const totalExpenses = (reports.data || []).reduce((sum: number, r: any) => sum + (r.expenses || 0), 0);

      const completedTasks = (tasks.data || []).filter((t: any) => t.status === 'completed').length;
      const pendingTasks = (tasks.data || []).filter((t: any) => t.status === 'pending').length;

      return {
        employees: employees.count || 0,
        stores: stores.count || 0,
        customers: customers.count || 0,
        totalSales,
        totalExpenses,
        netProfit: totalSales - totalExpenses,
        completedTasks,
        pendingTasks
      };
    } catch (error) {
      console.error('Error getting overall stats:', error);
      return {
        employees: 0,
        stores: 0,
        customers: 0,
        totalSales: 0,
        totalExpenses: 0,
        netProfit: 0,
        completedTasks: 0,
        pendingTasks: 0
      };
    }
  },

  async getStoreStats(storeId: string) {
    try {
      const [employees, reports] = await Promise.all([
        employeeService.getByStore(storeId),
        dailyReportService.list(undefined, storeId)
      ]);

      const totalSales = (reports.data || []).reduce((sum: number, r: any) => sum + (r.sales || 0), 0);
      const totalExpenses = (reports.data || []).reduce((sum: number, r: any) => sum + (r.expenses || 0), 0);

      return {
        employees: (employees.data || []).length,
        stores: 1,
        customers: 0,
        totalSales,
        totalExpenses,
        netProfit: totalSales - totalExpenses,
        completedTasks: 0,
        pendingTasks: 0
      };
    } catch (error) {
      console.error('Error getting store stats:', error);
      return {
        employees: 0,
        stores: 0,
        customers: 0,
        totalSales: 0,
        totalExpenses: 0,
        netProfit: 0,
        completedTasks: 0,
        pendingTasks: 0
      };
    }
  },

  async getSalesData(storeId?: string, startDate?: string, endDate?: string) {
    try {
      let query = supabase.from(TABLES.DAILY_REPORTS).select('date,sales,expenses');
      if (storeId) query = query.eq('store_id', storeId);
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data: reports } = await query;

      const monthlyData: Record<string, { sales: number; expenses: number }> = {};
      (reports || []).forEach((r: any) => {
        const date = new Date(r.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { sales: 0, expenses: 0 };
        monthlyData[key].sales += r.sales || 0;
        monthlyData[key].expenses += r.expenses || 0;
      });

      return Object.entries(monthlyData)
        .map(([month, d]) => ({
          month,
          sales: d.sales,
          expenses: d.expenses,
          profit: d.sales - d.expenses
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);
    } catch (error) {
      console.error('Error getting sales data:', error);
      return [];
    }
  }
};
