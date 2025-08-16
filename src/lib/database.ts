import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from './appwrite';

// Employee Service
export const employeeService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.EMPLOYEES, ID.unique(), data);
  },

  async list(userId?: string) {
    const queries = userId ? [Query.equal('authUserId', userId)] : [];
    queries.push(Query.limit(100)); // Increase limit to 100
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.EMPLOYEES, queries);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.EMPLOYEES, id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EMPLOYEES, id);
  },

  async getByStore(storeId: string) {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.EMPLOYEES, [
      Query.equal('storeId', storeId)
    ]);
  }
};

// Store Service
export const storeService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.STORES, ID.unique(), data);
  },

  async list() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.STORES);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.STORES, id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.STORES, id);
  }
};

// Customer Service
export const customerService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, ID.unique(), data);
  },

  async list() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.CUSTOMERS);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CUSTOMERS, id);
  }
};

// Task Service
export const taskService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.TASKS, ID.unique(), data);
  },

  async list(userId?: string) {
    const queries = userId ? [Query.equal('assigneeId', userId)] : [];
    queries.push(Query.orderDesc('$createdAt'));
    queries.push(Query.limit(100)); // Increase limit to 100
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASKS, queries);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.TASKS, id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TASKS, id);
  },

  async getByAssignee(assigneeId: string) {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASKS, [
      Query.equal('assigneeId', assigneeId),
      Query.orderDesc('$createdAt')
    ]);
  }
};

// Daily Report Service
export const dailyReportService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.DAILY_REPORTS, ID.unique(), data);
  },

  async list(userId?: string, storeId?: string, startDate?: string, endDate?: string) {
    const queries = [];
    if (userId) queries.push(Query.equal('userId', userId));
    if (storeId) queries.push(Query.equal('storeId', storeId));
    if (startDate) queries.push(Query.greaterThanEqual('date', startDate));
    if (endDate) queries.push(Query.lessThanEqual('date', endDate));
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.DAILY_REPORTS, queries);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.DAILY_REPORTS, id, data);
  }
};

// Credit Service
export const creditService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.CREDITS, ID.unique(), data);
  },

  async list() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.CREDITS);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.CREDITS, id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CREDITS, id);
  }
};

// Document Service
export const documentService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.DOCUMENTS, ID.unique(), data);
  },

  async list() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.DOCUMENTS);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.DOCUMENTS, id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.DOCUMENTS, id);
  }
};

// Salary Service
export const salaryService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.SALARY_RECORDS, ID.unique(), data);
  },

  async list(employeeId?: string) {
    const queries = employeeId ? [Query.equal('employeeId', employeeId)] : [];
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.SALARY_RECORDS, queries);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.SALARY_RECORDS, id, data);
  },

  async getByEmployee(employeeId: string) {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.SALARY_RECORDS, [
      Query.equal('employeeId', employeeId),
      Query.orderDesc('$createdAt')
    ]);
  },

  async getEmployeeAttendance(employeeId: string, month: string) {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.ATTENDANCE, [
      Query.equal('employeeId', employeeId),
      Query.greaterThanEqual('date', `${month}-01`),
      Query.lessThanEqual('date', `${month}-31`),
      Query.orderAsc('date')
    ]);
  },

  async getAdvancePayments(_employeeId: string, _month: string) {
    // This would be a separate collection for advance payments
    // For now, we'll return empty array
    return { documents: [] };
  }
};

// Chat Service
export const chatService = {
  async sendMessage(data: any) {
    const messageData = {
      ...data,
      timestamp: new Date().toISOString()
    };
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.CHAT_MESSAGES, ID.unique(), messageData);
  },

  async getMessages(chatType: 'direct' | 'group', limit: number = 50) {
    const queries = [
      Query.equal('chatType', chatType),
      Query.orderDesc('timestamp'),
      Query.limit(limit)
    ];
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAT_MESSAGES, queries);
  },

  async getDirectMessages(_userId1: string, _userId2: string, limit: number = 50) {
    const queries = [
      Query.equal('chatType', 'direct'),
      Query.orderAsc('timestamp'),
      Query.limit(limit)
    ];
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHAT_MESSAGES, queries);
  }
};

// Inventory Service
export const inventoryService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, COLLECTIONS.INVENTORY, ID.unique(), data);
  },

  async list() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVENTORY);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVENTORY, id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVENTORY, id);
  },

  async getByCategory(category: string) {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVENTORY, [
      Query.equal('category', category)
    ]);
  },

  async getLowStock() {
    return await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVENTORY, [
      Query.equal('status', 'Low Stock')
    ]);
  }
};

// Attendance Service
export const attendanceService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, '68877fd3000f7a0f7236', ID.unique(), data);
  },

  async list(employeeId?: string, date?: string, month?: string) {
    const queries = [];
    if (employeeId) queries.push(Query.equal('employeeId', employeeId));
    if (date) queries.push(Query.equal('date', date));
    if (month) {
      queries.push(Query.greaterThanEqual('date', `${month}-01`));
      queries.push(Query.lessThanEqual('date', `${month}-31`));
    }
    queries.push(Query.orderDesc('date'));
    return await databases.listDocuments(DATABASE_ID, '68877fd3000f7a0f7236', queries);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, '68877fd3000f7a0f7236', id, data);
  },

  async getByEmployeeAndMonth(employeeId: string, month: string) {
    return await databases.listDocuments(DATABASE_ID, '68877fd3000f7a0f7236', [
      Query.equal('employeeId', employeeId),
      Query.greaterThanEqual('date', `${month}-01`),
      Query.lessThanEqual('date', `${month}-31`),
      Query.orderAsc('date')
    ]);
  }
};

// Lamination Types Service
export const laminationService = {
  async create(data: any) {
    return await databases.createDocument(DATABASE_ID, '68878131002b39ca4827', ID.unique(), data);
  },

  async list() {
    return await databases.listDocuments(DATABASE_ID, '68878131002b39ca4827', [
      Query.equal('isActive', true),
      Query.orderAsc('name')
    ]);
  },

  async update(id: string, data: any) {
    return await databases.updateDocument(DATABASE_ID, '68878131002b39ca4827', id, data);
  },

  async delete(id: string) {
    return await databases.deleteDocument(DATABASE_ID, '68878131002b39ca4827', id);
  }
};

// Stats Service
export const statsService = {
  async getOverallStats() {
    try {
      const [employees, stores, customers, tasks, reports] = await Promise.all([
        employeeService.list(),
        storeService.list(),
        customerService.list(),
        taskService.list(),
        dailyReportService.list()
      ]);

      const totalSales = reports.documents.reduce((sum: number, report: any) => sum + (report.sales || 0), 0);
      const totalExpenses = reports.documents.reduce((sum: number, report: any) => sum + (report.expenses || 0), 0);

      return {
        employees: employees.documents.length,
        stores: stores.documents.length,
        customers: customers.documents.length,
        totalSales,
        totalExpenses,
        totalRevenue: totalSales,
        netProfit: totalSales - totalExpenses,
        completedTasks: tasks.documents.filter((t: any) => t.status === 'completed').length,
        pendingTasks: tasks.documents.filter((t: any) => t.status === 'pending').length
      };
    } catch (error) {
      console.error('Error getting overall stats:', error);
      return {
        employees: 0,
        stores: 0,
        customers: 0,
        totalSales: 0,
        totalExpenses: 0,
        totalRevenue: 0,
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

      const totalSales = reports.documents.reduce((sum: number, report: any) => sum + (report.sales || 0), 0);
      const totalExpenses = reports.documents.reduce((sum: number, report: any) => sum + (report.expenses || 0), 0);

      return {
        employees: employees.documents.length,
        stores: 1,
        customers: 0, // Store-specific customers would need additional logic
        totalSales,
        totalExpenses,
        totalRevenue: totalSales,
        netProfit: totalSales - totalExpenses,
        completedTasks: 0, // Would need store-specific task filtering
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
        totalRevenue: 0,
        netProfit: 0,
        completedTasks: 0,
        pendingTasks: 0
      };
    }
  },

  async getSalesData(storeId?: string, startDate?: string, endDate?: string) {
    try {
      const reports = await dailyReportService.list(undefined, storeId, startDate, endDate);

      // Group by month
      const monthlyData: { [key: string]: { sales: number; expenses: number; count: number } } = {};
      
      reports.documents.forEach((report: any) => {
        const date = new Date(report.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { sales: 0, expenses: 0, count: 0 };
        }
        
        monthlyData[monthKey].sales += report.sales || 0;
        monthlyData[monthKey].expenses += report.expenses || 0;
        monthlyData[monthKey].count += 1;
      });

      // Convert to array and sort
      return Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          sales: data.sales,
          expenses: data.expenses,
          revenue: data.sales,
          profit: data.sales - data.expenses
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6); // Last 6 months
    } catch (error) {
      console.error('Error getting sales data:', error);
      return [];
    }
  }
};