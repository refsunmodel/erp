import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Store, 
  CheckSquare, 
  TrendingUp, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  Circle,
  CheckCircle2
} from 'lucide-react';
import { employeeService, storeService, taskService, dailyReportService, customerService } from '@/lib/database';

interface DashboardStats {
  totalEmployees: number;
  totalStores: number;
  totalCustomers: number;
  pendingTasks: number;
  completedTasks: number;
  monthlyRevenue: number;
  totalSales: number;
  totalExpenses: number;
  recentActivities: Array<{
    id: string;
    type: string;
    message: string;
    time: string;
  }>;
}

interface TaskStats {
  designingPending: number;
  designingInProgress: number;
  designingCompleted: number;
  printingPending: number;
  printingInProgress: number;
  printingCompleted: number;
  deliveryPending: number;
  deliveryInProgress: number;
  deliveryCompleted: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats>({
    designingPending: 0,
    designingInProgress: 0,
    designingCompleted: 0,
    printingPending: 0,
    printingInProgress: 0,
    printingCompleted: 0,
    deliveryPending: 0,
    deliveryInProgress: 0,
    deliveryCompleted: 0
  });
  const [loading, setLoading] = useState(true);
  const [statsFilter, setStatsFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadDashboardData();
  }, [statsFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [employees, stores, customers, tasks, reports] = await Promise.all([
        employeeService.list(1000),
        storeService.list(1000),
        customerService.list(1000),
        taskService.list({ limit: 1000 }),
        dailyReportService.list(undefined, undefined, undefined, undefined, 1000)
      ]);
      const employeesData = (employees.data || []);
      const storesData = (stores.data || []);
      const customersData = (customers.data || []);
      const tasksData = (tasks.data || []);
      const reportsData = (reports.data || []);

      const totalSales = reportsData.reduce((sum: number, report: any) => sum + (report.sales || 0), 0);
      const totalExpenses = reportsData.reduce((sum: number, report: any) => sum + (report.expenses || 0), 0);

      const calculatedTaskStats = {
        designingPending: tasksData.filter((t: any) => t.task_type === 'designing' && t.status === 'pending').length,
        designingInProgress: tasksData.filter((t: any) => t.task_type === 'designing' && t.status === 'in-progress').length,
        designingCompleted: tasksData.filter((t: any) => t.task_type === 'designing' && (t.status === 'completed' || (t.workflow_stage === 'designing' && t.status === 'completed'))).length,
        printingPending: tasksData.filter((t: any) => t.task_type === 'printing' && t.status === 'pending').length,
        printingInProgress: tasksData.filter((t: any) => t.task_type === 'printing' && t.status === 'in-progress').length,
        printingCompleted: tasksData.filter((t: any) => t.task_type === 'printing' && (t.status === 'completed' || (t.workflow_stage === 'printing' && t.status === 'completed'))).length,
        deliveryPending: tasksData.filter((t: any) => t.task_type === 'delivery' && t.status === 'pending').length,
        deliveryInProgress: tasksData.filter((t: any) => t.task_type === 'delivery' && t.status === 'in-progress').length,
        deliveryCompleted: tasksData.filter((t: any) => t.task_type === 'delivery' && t.status === 'completed').length
      };

      const recentActivities = [
        {
          id: '1',
          type: 'employee',
          message: `${employeesData.length} employees in system`,
          time: '2 hours ago'
        },
        {
          id: '2',
          type: 'task',
          message: `${tasksData.filter((t: any) => t.status === 'completed').length} tasks completed today`,
          time: '4 hours ago'
        },
        {
          id: '3',
          type: 'report',
          message: `${reportsData.length} daily reports submitted`,
          time: '6 hours ago'
        }
      ];

      setStats({
        totalEmployees: employeesData.length,
        totalStores: storesData.length,
        totalCustomers: customersData.length,
        pendingTasks: tasksData.filter((t: any) => t.status === 'pending').length,
        completedTasks: tasksData.filter((t: any) => t.status === 'completed').length,
        monthlyRevenue: totalSales - totalExpenses,
        totalSales,
        totalExpenses,
        recentActivities
      });

      setTaskStats(calculatedTaskStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Stats Filter for Admin */}
      <div className="flex gap-2 mb-2">
        <Label>Stats Filter:</Label>
        <Select value={statsFilter} onValueChange={v => setStatsFilter(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Welcome back! Here's what's happening with your business.</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">Active in system</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStores || 0}</div>
            <p className="text-xs text-muted-foreground">All operational</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingTasks || 0}</div>
            <p className="text-xs text-muted-foreground">{stats?.completedTasks || 0} completed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.monthlyRevenue.toLocaleString() || '0'}</div>
            <p className="text-xs text-muted-foreground">Net profit this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Task Analytics</CardTitle>
          <CardDescription>Current status of all task types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-blue-700">Designing Tasks</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-medium">{taskStats.designingPending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="font-medium">{taskStats.designingInProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium">{taskStats.designingCompleted}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span className="text-sm">Total</span>
                    <span>{taskStats.designingPending + taskStats.designingInProgress + taskStats.designingCompleted}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-green-700">Printing Tasks</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-medium">{taskStats.printingPending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="font-medium">{taskStats.printingInProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium">{taskStats.printingCompleted}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span className="text-sm">Total</span>
                    <span>{taskStats.printingPending + taskStats.printingInProgress + taskStats.printingCompleted}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-orange-700">Delivery Tasks</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-medium">{taskStats.deliveryPending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="font-medium">{taskStats.deliveryInProgress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-medium">{taskStats.deliveryCompleted}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span className="text-sm">Total</span>
                    <span>{taskStats.deliveryPending + taskStats.deliveryInProgress + taskStats.deliveryCompleted}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you might want to perform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => window.location.assign('/employees')}
            >
              <Users className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => window.location.assign('/tasks')}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              Assign Task
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => window.location.assign('/stats')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Add filter for stats
  const [statsFilter, setStatsFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime'>('monthly');

  useEffect(() => {
    if (user) {
      loadMyTasks();
    }
  }, [user]);

  const loadMyTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getByAssignee(user?.id || '');
      const myTasks = (response.data || []).map((task: any) => ({
        ...task,
        $id: task.id,
        $createdAt: task.created_at,
      }));
      setMyTasks(myTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load your tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Task statistics by filter ---
  const now = new Date();
  const filterFn = (task: any) => {
    const completed = task.status === 'completed';
    if (!completed) return false;
    const created = new Date(task.$createdAt);
    if (statsFilter === 'daily') {
      return created.toDateString() === now.toDateString();
    }
    if (statsFilter === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return created >= weekAgo && created <= now;
    }
    if (statsFilter === 'monthly') {
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }
    if (statsFilter === 'yearly') {
      return created.getFullYear() === now.getFullYear();
    }
    // lifetime
    return true;
  };
  const completedStatsCount = myTasks.filter(filterFn).length;

  // Recent completed tasks (last 5)
  const recentCompletedTasks = myTasks
    .filter(t => t.status === 'completed')
    .sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingTasks = myTasks.filter(task => task.status === 'pending');
  const inProgressTasks = myTasks.filter(task => task.status === 'in-progress');
  const completedTasks = myTasks.filter(task => task.status === 'completed');
  const overdueTasks = myTasks.filter(task => {
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    return task.status !== 'completed' && dueDate < today;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Stats Filter for Employee */}
      <div className="flex gap-2 mb-2">
        <Label>Stats Filter:</Label>
        <Select value={statsFilter} onValueChange={v => setStatsFilter(v as any)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="lifetime">Lifetime</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Welcome back, {user?.employeeData?.name || user?.email}! Here's your task overview.</p>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.length}</div>
            <p className="text-xs text-muted-foreground">All assigned tasks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting start</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground">Finished tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Overdue Tasks ({overdueTasks.length})
            </CardTitle>
            <CardDescription className="text-red-600">
              These tasks are past their due date and need immediate attention.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>Your assigned tasks and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {myTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tasks assigned to you yet</p>
              <p className="text-sm text-gray-400 mt-2">Tasks assigned to you will appear here</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <ScrollArea className="h-96 w-full min-w-[600px]">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[350px] min-w-[350px]">Task</TableHead>
                        <TableHead className="w-[120px] min-w-[120px]">Type</TableHead>
                        <TableHead className="w-[100px] min-w-[100px]">Priority</TableHead>
                        <TableHead className="w-[140px] min-w-[140px]">Due Date</TableHead>
                        <TableHead className="w-[120px] min-w-[120px]">Status</TableHead>
                        <TableHead className="w-[180px] min-w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myTasks.map((task) => {
                        const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();
                        const taskStatus = isOverdue ? 'overdue' : task.status;
                        
                        return (
                          <TableRow key={task.$id}>
                            <TableCell className="w-[350px] min-w-[350px]">
                              <div>
                                <p className="font-medium text-sm truncate">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                )}
                                {task.fileUrl && (
                                  <a 
                                    href={task.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline mt-1 block"
                                  >
                                    📎 View File
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-[120px] min-w-[120px]">
                              {task.task_type ? (
                                <Badge variant="outline" className={`text-xs ${
                                  task.task_type === 'designing' ? 'border-blue-500 text-blue-700' :
                                  task.task_type === 'printing' ? 'border-green-500 text-green-700' :
                                  'border-orange-500 text-orange-700'
                                }`}>
                                  {task.task_type.charAt(0).toUpperCase() + task.task_type.slice(1)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">General</Badge>
                              )}
                            </TableCell>
                            <TableCell className="w-[100px] min-w-[100px]">
                              <Badge className={`text-xs ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="w-[140px] min-w-[140px]">
                              <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                {new Date(task.dueDate).toLocaleDateString()}
                                {task.dueTime && (
                                  <div className="text-xs text-gray-500">{task.dueTime}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="w-[120px] min-w-[120px]">
                              <div className="flex items-center text-sm">
                                {getStatusIcon(taskStatus)}
                                <Badge className={`ml-1 text-xs ${getStatusColor(taskStatus)}`}>
                                  {taskStatus.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="w-[180px] min-w-[180px]">
                              {task.status !== 'completed' && (
                                <div className="flex flex-col space-y-1">
                                  {task.status === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs px-2 py-1 w-full"
                                      onClick={() => updateTaskStatus(task.$id, 'in-progress')}
                                    >
                                      Start
                                    </Button>
                                  )}
                                  {task.status === 'in-progress' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs px-2 py-1 w-full"
                                      onClick={() => updateTaskStatus(task.$id, 'completed')}
                                    >
                                      Complete
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Task Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks ({statsFilter.charAt(0).toUpperCase() + statsFilter.slice(1)})</CardTitle>
          <CardDescription>
            You have completed <span className="font-bold">{completedStatsCount}</span> tasks {statsFilter === 'daily' ? 'today' : `this ${statsFilter}`}.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Recent Completed Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Tasks</CardTitle>
          <CardDescription>Last 5 tasks you completed</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCompletedTasks.length === 0 ? (
            <div className="text-gray-500 text-sm">No completed tasks yet.</div>
          ) : (
            <ul className="space-y-2">
              {recentCompletedTasks.map(task => (
                <li key={task.$id} className="border-b pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{task.title}</span>
                      <span className="ml-2 text-xs text-gray-500">{task.task_type}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(task.$createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-600">{task.description}</div>
                  {/* View Detail Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={() => window.location.assign(`/tasks?view=${task.$id}`)}
                  >
                    View Detail
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks you might want to perform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => window.location.assign('/tasks')}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            View All Tasks
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => window.location.assign('/salary')}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            View Salary Info
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => window.location.assign('/chat')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Team Chat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const ManagerDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManagerData();
  }, []);

  const loadManagerData = async () => {
    try {
      setLoading(true);
      const [employees, tasks] = await Promise.all([
        employeeService.list(1000),
        taskService.list({ limit: 1000 })
      ]);
      const employeesData = (employees.data || []);
      const tasksData = (tasks.data || []);
      const teamEmployees = employeesData.filter((emp: any) => emp.role !== 'Admin' && emp.role !== 'Manager');
      const teamTasks = tasksData.filter((task: any) => {
        const assignee = teamEmployees.find((emp: any) => emp.authUserId === task.assigneeId);
        return assignee;
      });
      setStats({
        teamSize: teamEmployees.length,
        totalTasks: teamTasks.length,
        pendingTasks: teamTasks.filter((t: any) => t.status === 'pending').length,
        completedTasks: teamTasks.filter((t: any) => t.status === 'completed').length,
        inProgressTasks: teamTasks.filter((t: any) => t.status === 'in-progress').length
      });
    } catch (error) {
      console.error('Failed to load manager data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your team and oversee operations</p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.teamSize || 0}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground">All team tasks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.inProgressTasks || 0}</div>
            <p className="text-xs text-muted-foreground">Active tasks</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completedTasks || 0}</div>
            <p className="text-xs text-muted-foreground">Finished tasks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common management tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => window.location.assign('/tasks')}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Manage Tasks
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => window.location.assign('/attendance')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Track Attendance
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            onClick={() => window.location.assign('/chat')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Team Communication
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'Admin':
      return <AdminDashboard />;
    case 'Manager':
      return <ManagerDashboard />;
    case 'Graphic Designer':
    case 'Printing Technician':
    case 'Delivery Supervisor':
      return <EmployeeDashboard />;
    default:
      // Accept any other string role, including 'Staff'
      return <EmployeeDashboard />;
  }
};