import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Calendar, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { employeeService, attendanceService, taskService } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { playNotificationSound, updateFavicon } from '@/utils/notificationSound';

interface SalaryNotification {
  $id: string;
  name: string;
  role: string;
  salaryDate: string;
  presentDays: number;
  totalDays: number;
  type: 'salary';
}

interface TaskNotification {
  $id: string;
  title: string;
  assigneeName: string;
  dueDate: string;
  priority: string;
  type: 'task';
  isNew?: boolean;
}

interface NewTaskNotification {
  $id: string;
  title: string;
  assigneeName: string;
  taskType: string;
  createdAt: string;
  type: 'new_task';
}

type Notification = SalaryNotification | TaskNotification | NewTaskNotification;

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<string>(() => {
    return localStorage.getItem(`lastNotificationCheck_${user?.$id}`) || new Date().toISOString();
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Set up periodic check for new notifications every 2 minutes
      const interval = setInterval(loadNotifications, 120000); // Check every 2 minutes
      return () => clearInterval(interval);
    }
  }, [user]);

  // Load notifications when route changes (tab change)
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [location.pathname, user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const currentDate = new Date();
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.toISOString().slice(0, 7);
      
      const allNotifications: Notification[] = [];

      // Load salary notifications (Admin only)
      if (user?.role === 'Admin') {
        const [employeesResponse, attendanceResponse] = await Promise.all([
          employeeService.list(),
          attendanceService.list(undefined, undefined, currentMonth)
        ]);

        const salaryNotifications: SalaryNotification[] = [];
        
        for (const employee of employeesResponse.documents) {
          // Check if salary is due (within 3 days of salary date)
          if (employee.salaryDate) {
            const salaryDay = parseInt(employee.salaryDate);
            const daysDifference = Math.abs(currentDay - salaryDay);
            
            if (daysDifference <= 3 || (salaryDay > 28 && currentDay <= 3)) { // Handle month-end cases
            const employeeAttendance = attendanceResponse.documents.filter(
              (att: any) => att.employeeId === employee.$id
            );
            const presentDays = employeeAttendance.filter((att: any) => att.status === 'Present').length;
            
            salaryNotifications.push({
              $id: employee.$id,
              name: employee.name,
              role: employee.role,
              salaryDate: employee.salaryDate,
              presentDays,
              totalDays: employeeAttendance.length,
              type: 'salary'
            });
            }
          }
        }
        
        allNotifications.push(...salaryNotifications);
      }

      // Load task notifications
      const tasksResponse = user?.role === 'Admin' 
        ? await taskService.list()
        : await taskService.getByAssignee(user?.$id || '');

      // For employees: Show new tasks assigned to them since last check
      if (user?.role !== 'Admin') {
        const newTaskNotifications: NewTaskNotification[] = tasksResponse.documents
          .filter((task: any) => {
            const taskCreatedAt = new Date(task.$createdAt);
            const lastCheck = new Date(lastCheckTime);
            return taskCreatedAt > lastCheck && task.assigneeId === user.$id && task.status === 'pending';
          })
          .map((task: any) => ({
            $id: task.$id,
            title: task.title,
            assigneeName: task.assigneeName,
            taskType: task.taskType || 'general',
            createdAt: task.$createdAt,
            type: 'new_task' as const
          }));

        allNotifications.push(...newTaskNotifications);
      }

      // For admin: Show new tasks created since last check
      if (user?.role === 'Admin') {
        const newTaskNotifications: NewTaskNotification[] = tasksResponse.documents
          .filter((task: any) => {
            const taskCreatedAt = new Date(task.$createdAt);
            const lastCheck = new Date(lastCheckTime);
            return taskCreatedAt > lastCheck;
          })
          .map((task: any) => ({
            $id: task.$id,
            title: task.title,
            assigneeName: task.assigneeName,
            taskType: task.taskType || 'general',
            createdAt: task.$createdAt,
            type: 'new_task' as const
          }));

        allNotifications.push(...newTaskNotifications);
      }

      // Overdue tasks for all users
      const taskNotifications: TaskNotification[] = tasksResponse.documents
        .filter((task: any) => {
          const dueDate = new Date(task.dueDate);
          const isOverdue = task.status !== 'completed' && dueDate < currentDate;
          const isAssignedToUser = user?.role === 'Admin' || task.assigneeId === user?.$id;
          return isOverdue && isAssignedToUser;
        })
        .map((task: any) => ({
          $id: task.$id,
          title: task.title,
          assigneeName: task.assigneeName,
          dueDate: task.dueDate,
          priority: task.priority || 'medium',
          type: 'task' as const
        }));

      allNotifications.push(...taskNotifications);
      
      // Update last check time
      const newCheckTime = new Date().toISOString();
      setLastCheckTime(newCheckTime);
      localStorage.setItem(`lastNotificationCheck_${user.$id}`, newCheckTime);
      
      setNotifications(allNotifications);
      
      // Check if there are new notifications and play sound
      const hasNewNotifications = allNotifications.some(notification => {
        if (notification.type === 'new_task') {
          const taskCreatedAt = new Date(notification.createdAt);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return taskCreatedAt > fiveMinutesAgo;
        }
        return false;
      });
      
      if (hasNewNotifications || (allNotifications.length > previousNotificationCount && previousNotificationCount >= 0)) {
        playNotificationSound();
        
        // Show toast notification for new tasks
        const newTasks = allNotifications.filter(n => n.type === 'new_task');
        if (newTasks.length > 0) {
          toast({
            title: "New Task Assigned",
            description: `You have ${newTasks.length} new task${newTasks.length > 1 ? 's' : ''} assigned to you.`,
          });
        }
      }
      setPreviousNotificationCount(allNotifications.length);
      
      // Update favicon based on notification count
      updateFavicon(allNotifications.length > 0);
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'salary') {
      // Navigate to employees page or show salary details
      window.location.assign('/employees');
    } else if (notification.type === 'task' || notification.type === 'new_task') {
      // Navigate to tasks page
      window.location.assign('/tasks');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAttendancePercentage = (present: number, total: number) => {
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === 'salary') {
      return <DollarSign className="h-4 w-4 text-green-600" />;
    } else if (notification.type === 'new_task') {
      return <CheckCircle className="h-4 w-4 text-blue-600" />;
    } else {
      const priority = (notification as TaskNotification).priority;
      return priority === 'high' 
        ? <AlertCircle className="h-4 w-4 text-red-600" />
        : <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.$id}
              className="p-3 cursor-pointer hover:bg-muted/50"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3 w-full">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    {getNotificationIcon(notification)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {notification.type === 'salary' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {notification.name}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          Salary Due
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {notification.role}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {getAttendancePercentage(notification.presentDays, notification.totalDays)}% attendance
                          </span>
                        </div>
                      </div>
                    </>
                  ) : notification.type === 'new_task' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {user?.role === 'Admin' ? 'New Task Created' : 'New Task Assigned'}
                        </p>
                        <span className="text-xs text-blue-600">
                          {formatDateTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge variant="outline" className="text-xs">
                          {notification.taskType}
                        </Badge>
                        {user?.role === 'Admin' && (
                          <span className="text-muted-foreground">
                            → {notification.assigneeName}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          Overdue Task
                        </p>
                        <span className="text-xs text-red-600">
                          {formatDate(notification.dueDate)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          Assigned to: {notification.assigneeName}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            notification.priority === 'high' ? 'border-red-500 text-red-700' :
                            notification.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                            'border-green-500 text-green-700'
                          }`}
                        >
                          {notification.priority}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};