import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { employeeService, attendanceService, taskService, salaryService } from '@/lib/database';
import { Bell, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
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
import { playNotificationSound, updateFavicon } from '@/utils/notificationSound';

interface TaskNotification {
  $id: string;
  title: string;
  assignee_name: string;
  due_date: string;
  priority: string;
  type: 'task';
  isNew?: boolean;
}

interface NewTaskNotification {
  $id: string;
  title: string;
  due_date: string;
  due_time?: string;
  type: 'new-task';
  assignee_name: string;
}

interface SalaryNotification {
  $id: string;
  employee_name: string;
  salary_date: string;
  type: 'salary-due';
  attendance: {
    present: number;
    absent: number;
    halfDay: number;
  };
}

type Notification = SalaryNotification | TaskNotification | NewTaskNotification;

interface NotificationCenterProps {
  tasks?: any[]; // Accept tasks from parent (frontend state)
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ tasks }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);
  // Removed: const [employeeMap, setEmployeeMap] = useState<Record<string, any>>({});
  // Removed: const { toast } = useToast();

  // Track new task IDs for real-time notification
  const newTaskIdsRef = useRef<Set<string>>(new Set());
  const [lastRealtimeTaskId, setLastRealtimeTaskId] = useState<string | null>(null);

  // --- Real-time subscription for all task changes (INSERT, UPDATE, DELETE) ---
  useEffect(() => {
    if (!user) return;
    const unsubscribe = taskService.subscribe((event, payload) => {
      let task: any = null;
      if (event === 'INSERT' && payload?.new) {
        task = payload.new;
        // Only notify if assigned to current user or Admin/Manager
        const relevant =
          user.role === 'Admin' ||
          user.role === 'Manager' ||
          (user.employeeData?.auth_user_id && task.assignee_id === user.employeeData.auth_user_id);
        if (relevant) {
          if (!newTaskIdsRef.current.has(task.id)) {
            newTaskIdsRef.current.add(task.id);
            setLastRealtimeTaskId(task.id);
            setNotifications(prev => [
              {
                $id: task.id,
                title: task.title,
                due_date: task.due_date,
                due_time: task.due_time,
                type: 'new-task',
                assignee_name: task.assignee_name,
              },
              ...prev,
            ]);
            updateFavicon(true);
          }
        }
      } else if (event === 'UPDATE' && payload?.new) {
        task = payload.new;
        const relevant =
          user.role === 'Admin' ||
          user.role === 'Manager' ||
          (user.employeeData?.auth_user_id && task.assignee_id === user.employeeData.auth_user_id);
        if (relevant) {
          // Overdue task logic
          const due_date = new Date(task.due_date);
          const isOverdue = task.status !== 'completed' && due_date < new Date();
          setNotifications(prev => {
            // Remove previous notification for this task if exists
            const filtered = prev.filter(n => n.$id !== task.id);
            if (isOverdue) {
              // Add/Update overdue notification
              return [
                {
                  $id: task.id,
                  title: task.title,
                  assignee_name: task.assignee_name,
                  due_date: task.due_date,
                  priority: task.priority || 'medium',
                  type: 'task'
                },
                ...filtered,
              ];
            } else {
              // Remove overdue notification if task is no longer overdue
              return filtered;
            }
          });
          updateFavicon(true);
        }
      } else if (event === 'DELETE' && payload?.old) {
        task = payload.old;
        setNotifications(prev => prev.filter(n => n.$id !== task.id));
        updateFavicon(notifications.length > 1);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Play notification sound for new real-time task
  useEffect(() => {
    if (lastRealtimeTaskId) {
      playNotificationSound();
    }
  }, [lastRealtimeTaskId]);

  // Load notifications when user or route changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, location.pathname]);

  // Load all notifications (overdue, salary, etc)
  const loadNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const currentDate = new Date();
      const allNotifications: Notification[] = [];

      // --- TASK NOTIFICATIONS ---
      let tasksResponse;
      if (user.role === 'Admin' || user.role === 'Manager') {
        tasksResponse = await taskService.list({ limit: 100 });
      } else if (user.employeeData?.auth_user_id) {
        tasksResponse = await taskService.list({ userAuthUserId: user.employeeData.auth_user_id, limit: 100 });
      } else {
        tasksResponse = { data: [] };
      }
      const tasks = (tasksResponse.data || []).map((t: any) => ({ ...t, $id: t.id, $created_at: t.created_at }));

      // Overdue tasks
      const taskNotifications: TaskNotification[] = tasks
        .filter((task: any) => {
          const due_date = new Date(task.due_date);
          const isOverdue = task.status !== 'completed' && due_date < currentDate;
          const isAssignedToUser = user?.role === 'Admin' || task.assignee_id === user.employeeData?.auth_user_id;
          return isOverdue && isAssignedToUser;
        })
        .map((task: any) => ({
          $id: task.$id,
          title: task.title,
          assignee_name: task.assignee_name,
          due_date: task.due_date,
          priority: task.priority || 'medium',
          type: 'task'
        }));

      // --- NEW TASK NOTIFICATION (initial load, last 2 days) ---
      if (user.employeeData?.auth_user_id) {
        const newTasks = tasks
          .filter((task: any) =>
            task.assignee_id === user.employeeData.auth_user_id &&
            new Date(task.$createdAt) > new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          )
          .map((task: any) => ({
            $id: task.$id,
            title: task.title,
            due_date: task.due_date,
            due_time: task.due_time,
            type: "new-task" as const, // Fix: ensure type is literal "new-task"
            assignee_name: task.assignee_name
          }));
        // Add to ref so real-time doesn't duplicate
        newTasks.forEach(nt => newTaskIdsRef.current.add(nt.$id));
        allNotifications.push(...newTasks);
      }

      // --- SALARY DUE NOTIFICATION ---
      if (user.role === 'Admin') {
        const employeesRes = await employeeService.list(1000);
        const employees = employeesRes.data || [];
        const salaryRes = await salaryService.list(undefined, 1000);
        const salaryRecords = salaryRes.data || [];
        const monthStr = new Date().toISOString().slice(0, 7);
        const attendanceRes = await attendanceService.list(undefined, undefined, monthStr, 1000);
        const attendanceRecords = attendanceRes.data || [];

        for (const emp of employees) {
          if (!emp.salaryDate || !emp.status || emp.status !== 'Active') continue;
          const salaryDay = Number(emp.salaryDate);
          if (isNaN(salaryDay)) continue;
          const now = new Date();
          const salaryDateObj = new Date(now.getFullYear(), now.getMonth(), salaryDay);
          const daysDiff = (salaryDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

          // Only show if salary date is within next 2 days and not already paid for this month
          const alreadyPaid = salaryRecords.some((s: any) =>
            (s.employee_id === emp.$id || s.employee_id === emp.authUserId) &&
            s.month === monthStr &&
            s.status === 'Paid'
          );
          if (daysDiff >= 0 && daysDiff <= 2 && !alreadyPaid) {
            const empAttendance = attendanceRecords.filter((a: any) =>
              a.employee_id === emp.$id || a.employee_id === emp.authUserId
            );
            const present = empAttendance.filter((a: any) => a.status === 'Present').length;
            const absent = empAttendance.filter((a: any) => a.status === 'Absent').length;
            const halfDay = empAttendance.filter((a: any) => a.day_type === 'Half Day').length;
            allNotifications.push({
              $id: emp.$id,
              employee_name: emp.name,
              salary_date: emp.salaryDate, // Fix: use camelCase
              type: 'salary-due',
              attendance: { present, absent, halfDay }
            });
          }
        }
      }

      // Add overdue tasks
      allNotifications.push(...taskNotifications);

      // Play sound if notification count increased
      if (allNotifications.length > previousNotificationCount) {
        playNotificationSound();
      }
      setPreviousNotificationCount(allNotifications.length);

      setNotifications(allNotifications);
      updateFavicon(allNotifications.length > 0);
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'new-task' || notification.type === 'task') {
      window.location.assign('/tasks');
    } else if (notification.type === 'salary-due') {
      window.location.assign('/employees');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === 'salary-due') {
      return <DollarSign className="h-4 w-4 text-orange-600" />;
    }
    if (notification.type === 'new-task') {
      return <Bell className="h-4 w-4 text-green-600" />;
    }
    // task
    const priority = (notification as TaskNotification).priority;
    return priority === 'high'
      ? <AlertCircle className="h-4 w-4 text-red-600" />
      : <CheckCircle className="h-4 w-4 text-blue-600" />;
  };

  // --- Poll for new tasks every second using tasks prop ---
  useEffect(() => {
    if (!user || !tasks) return;
    let prevIds = JSON.parse(localStorage.getItem('erp_task_ids') || '[]');
    let prevCount = Number(localStorage.getItem('erp_task_count') || '0');

    const interval = setInterval(() => {
      // Only count tasks assigned to current user
      const myTasks = (user.role === 'Admin' || user.role === 'Manager')
        ? tasks
        : tasks.filter((task: any) => task.assignee_id === user.employeeData?.auth_user_id);

      // Find new tasks
      const newTasks = myTasks.filter((task: any) => !prevIds.includes(task.$id));
      if (newTasks.length > 0) {
        newTasks.forEach((task: any) => {
          setNotifications(prev => [
            {
              $id: task.$id,
              title: task.title,
              due_date: task.due_date,
              due_time: task.due_time,
              type: 'new-task',
              assignee_name: task.assignee_name,
            },
            ...prev,
          ]);
          playNotificationSound();
          updateFavicon(true);
        });
        prevIds = myTasks.map((t: any) => t.$id);
        prevCount = myTasks.length;
        localStorage.setItem('erp_task_count', String(prevCount));
        localStorage.setItem('erp_task_ids', JSON.stringify(prevIds));
      } else if (myTasks.length < prevCount) {
        prevIds = myTasks.map((t: any) => t.$id);
        prevCount = myTasks.length;
        localStorage.setItem('erp_task_count', String(prevCount));
        localStorage.setItem('erp_task_ids', JSON.stringify(prevIds));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, tasks]);

  // Backup: reload notifications from backend every 10 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadNotifications();
    }, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, [user, location.pathname]);

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
      <DropdownMenuContent align="end" className="w-80" style={{ maxHeight: 400, overflowY: 'auto' }}>
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
          notifications.map((notification, idx) => (
            <DropdownMenuItem
              key={notification.$id || `${notification.type}-${idx}`}
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
                  {/* Salary Due Notification */}
                  {notification.type === 'salary-due' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          Salary Due: {notification.employee_name}
                        </p>
                        <span className="text-xs text-orange-600">
                          Salary Date: {notification.salary_date}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Attendance this month:
                        <span className="ml-2 text-green-600">Present: {notification.attendance.present}</span>,
                        <span className="ml-2 text-red-600">Absent: {notification.attendance.absent}</span>,
                        <span className="ml-2 text-orange-600">Half Day: {notification.attendance.halfDay}</span>
                      </p>
                    </>
                  ) : notification.type === 'new-task' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          New Task Assigned
                        </p>
                        <span className="text-xs text-blue-600">
                          {notification.due_date && formatDate(notification.due_date)}
                          {notification.due_time ? `, ${notification.due_time}` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          Assigned to: {notification.assignee_name}
                        </span>
                      </div>
                    </>
                  ) : (
                    // Overdue Task
                    <>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          Overdue Task
                        </p>
                        <span className="text-xs text-red-600">
                          {formatDate((notification as TaskNotification).due_date)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {(notification as TaskNotification).title}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          Assigned to: {(notification as TaskNotification).assignee_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            (notification as TaskNotification).priority === 'high' ? 'border-red-500 text-red-700' :
                            (notification as TaskNotification).priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                            'border-green-500 text-green-700'
                          }`}
                        >
                          {(notification as TaskNotification).priority}
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