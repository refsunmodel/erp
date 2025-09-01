import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Clock, User, CheckCircle2, Circle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { taskService, employeeService } from '@/lib/database';
import { Dialog as TaskDetailDialog, DialogContent as TaskDetailDialogContent, DialogHeader as TaskDetailDialogHeader, DialogTitle as TaskDetailDialogTitle } from '@/components/ui/dialog';


interface Task { 
  $id: string;
  order_no?: string;
  title: string;
  description: string;
  task_type?: 'designing' | 'printing' | 'delivery';
  assignee_id: string;
  assignee_name: string;
  due_date: string;
  due_time?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' |  'delivered' |'not-delivered';
  priority: 'low' | 'medium' | 'high';
  created_by: string;
  file_url?: string;
  customer_phone?: string;
  printing_type?: string;
  workflow_stage?: 'designing' | 'printing' | 'delivery' | 'completed';
  original_order_id?: string;
  $createdAt: string;
  parent_task_id?: string; // Add 'parent_task_id' to Task interface for workflow linking
  last_updated?: string; // Add last_updated field
  external_id?: string; // <-- add this field
  external_parent_id?: string; // <-- add this field
}

interface Employee {
  $id: string;
  name: string;
  email: string;
  authUserId: string;
  role: string;
  pendingTasks?: number;
  inProgressTasks?: number;
}

export const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('lifetime'); // Add filter state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [assignType, setAssignType] = useState<'printing' | 'delivery' | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    order_no: '',
    title: '',
    description: '',
    task_type: 'designing' as Task['task_type'],
    assignee_id: '',
    assignee_name: '',
    due_date: '',
    due_time: '',
    priority: 'medium' as Task['priority'],
    file_url: '',
    customer_phone: '',
    printing_type: ''
  });

  const [searchTerm, setSearchTerm] = useState(""); // <-- Add search state
  const [task_typeFilter, settask_typeFilter] = useState<string>('all'); // Add filter for task type

  // Add canCreateTask logic
  // Admin, Manager, and Graphic Designer can create tasks
  const canCreateTask =
    user?.role === 'Admin' ||
    user?.role === 'Manager' ||
    user?.role === 'Graphic Designer';

  // Add a map of userId (UUID) to employee name/email for quick lookup
  const [userIdToName, setUserIdToName] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTasks();
    if (
      user?.role === 'Admin' ||
      user?.role === 'Manager' ||
      user?.role === 'Delivery Supervisor' ||
      user?.role === 'Printing Technician' ||
      user?.role === 'Graphic Designer'
    ) {
      loadEmployees();
    }

    // Set default task_type and filter for Graphic Designer
    if (user?.role === 'Graphic Designer') {
      setFormData(prev => ({
        ...prev,
        task_type: 'printing',
        assignee_id: user.employeeData?.auth_user_id || '' // Use auth_user_id for self-assignment
      }));
    }

    // --- Real-time subscription for tasks ---
    const unsubscribe = taskService.subscribe((event, payload) => {
      if (!payload || !payload.new && !payload.old) return;
      setTasks(prevTasks => {
        if (event === 'INSERT') {
          // Add new task if not present
          const exists = prevTasks.some(t => t.$id === payload.new.id);
          if (!exists) {
            return [{ ...payload.new, $id: payload.new.id, $createdAt: payload.new.created_at }, ...prevTasks];
          }
        } else if (event === 'UPDATE') {
          // Update the task in the list
          return prevTasks.map(t =>
            t.$id === payload.new.id
              ? { ...t, ...payload.new, $id: payload.new.id, $createdAt: payload.new.created_at }
              : t
          );
        } else if (event === 'DELETE') {
          // Remove the deleted task
          return prevTasks.filter(t => t.$id !== payload.old.id);
        }
        return prevTasks;
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let response;
      // Admin/Manager: show all tasks, others: only assigned tasks
      if (user?.role === 'Admin' || user?.role === 'Manager') {
        response = await taskService.list({ limit: 300 });
      } else if (user?.employeeData?.auth_user_id) {
        response = await taskService.list({ userAuthUserId: user.employeeData.auth_user_id, limit: 300 });
      } else {
        response = { data: [] };
      }
      const tasks = (response.data || []).map((t: any) => ({
        ...t,
        $id: t.$id,
        $createdAt: t.$createdAt,
      }));
      setTasks(tasks);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load tasks: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeeService.list();
      let validEmployees = (response.data || []).filter((emp: any) => emp.authUserId);

      // Count pending/in-progress tasks for each employee
      const allTasks = await taskService.list();
      validEmployees = validEmployees.map((emp: any) => {
        const empTasks = (allTasks.data || []).filter(
          (t: any) => t.assignee_id === emp.authUserId
        );
        const pendingTasks = empTasks.filter((t: any) => t.status === 'pending').length;
        const inProgressTasks = empTasks.filter((t: any) => t.status === 'in-progress').length;
        return { ...emp, pendingTasks, inProgressTasks };
      });

      setEmployees(validEmployees as unknown as Employee[]);

      // Load all employees for mapping UUID to name/email
      employeeService.list(1000).then(res => {
        const map: Record<string, string> = {};
        (res.data || []).forEach((emp: any) => {
          map[emp.authUserId] = emp.name || emp.email || emp.authUserId;
        });
        setUserIdToName(map);
      });
    } catch (error: any) {
      console.error('Failed to load employees:', error);
    }
  };

  // Filtering logic (filter by createdAt, not due_date)
  const filterTasksByDate = (tasks: Task[]) => {
    if (!filter || filter === 'lifetime') return tasks;
    const now = new Date();
    return tasks.filter(task => {
      const created = new Date(task.$createdAt);
      if (filter === 'daily') {
        return created.toDateString() === now.toDateString();
      }
      if (filter === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return created >= weekAgo && created <= now;
      }
      if (filter === 'monthly') {
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }
      if (filter === 'yearly') {
        return created.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskService.delete(taskId);
      toast({ title: "Task Deleted", description: "Task has been deleted." });
      await loadTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Always use authUserId for assignee_id (never email or $id)
      const selectedEmployee = employees.find(emp => emp.$id === formData.assignee_id);

      if (!selectedEmployee || !selectedEmployee.authUserId) {
        throw new Error('Selected employee does not have a valid user account');
      }

      // Validate due_date to ensure it's a valid date
      let due_date = formData.due_date;
      if (due_date) {
        const [year, month, day] = due_date.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        if (day > lastDay) {
          due_date = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }
      }

      const taskData = {
        order_no: formData.order_no || undefined,
        title: formData.title,
        description: formData.description,
        task_type: formData.task_type,
        workflow_stage: formData.task_type,
        assignee_id: selectedEmployee.authUserId, // <-- must be a UUID
        assignee_name: selectedEmployee.name,
        due_date: formData.due_date,
        due_time: formData.due_time,
        priority: formData.priority,
        status: 'pending',
        created_by: user?.id, // <-- Use UUID, not email
        file_url: formData.file_url,
        customer_phone: formData.customer_phone,
        printing_type: formData.printing_type,
        last_updated: new Date().toISOString(),
      };

      await taskService.create(taskData);

      toast({
        title: "Task Created",
        description: `Task "${taskData.title}" assigned to ${taskData.assignee_name}`,
      });

      await loadTasks();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      order_no: '',
      title: '',
      description: '',
      task_type: 'designing',
      assignee_id: '',
      assignee_name: '',
      due_date: '',
      due_time: '',
      priority: 'medium',
      file_url: '',
      customer_phone: '',
      printing_type: ''
    });
    setIsAddDialogOpen(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const task = tasks.find(t => t.$id === taskId);
      if (!task) return;

      const prevStatus = task.status;

      // If task is a delivery and being marked as delivered, delete it from DB (including from database)
      if (task.task_type === 'delivery' && newStatus === 'delivered') {
        await taskService.delete(taskId); // Remove from database
        setTasks(prev => prev.filter(t => t.$id !== taskId)); // Remove from UI state
        toast({
          title: "Task Delivered",
          description: "Delivery task has been marked as delivered and deleted from the database.",
        });
        return;
      }

      // Update the task status and last_updated
      await taskService.update(taskId, { status: newStatus, last_updated: new Date().toISOString() });

      // --- Update tasks_completed count on employee record ---
      if (prevStatus !== 'completed' && newStatus === 'completed') {
        await employeeService.incrementTasksCompleted(task.assignee_id);
      } else if (prevStatus === 'completed' && newStatus !== 'completed') {
        await employeeService.decrementTasksCompleted(task.assignee_id);
      }
      // --- end update ---

      // If delivered or not-delivered, remove from list for Delivery Supervisor
      if (
        (newStatus === 'delivered' || newStatus === 'not-delivered') &&
        user?.role === 'Delivery Supervisor'
      ) {
        setTasks(prev => prev.filter(t => t.$id !== taskId));
        return;
      }

      // If delivered, remove from list for Delivery Supervisor (legacy)
      if (newStatus === 'delivered' && user?.role === 'Delivery Supervisor') {
        setTasks(prev => prev.filter(t => t.$id !== taskId));
      }

      // If task is being completed and it's a printing task, create delivery task
      if (newStatus === 'completed' && task.task_type === 'printing') {
        await handleWorkflowProgression(task);
      }

      toast({
        title: "Task Updated",
        description: `Task status changed to ${newStatus.replace('-', ' ')}`,
      });

      await loadTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update task: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleWorkflowProgression = async (task: Task) => {
    try {
      if (task.task_type === 'delivery') {
        return;
      }
      const deliverySupervisors = employees.filter(emp => emp.role === 'Delivery Supervisor');
      if (deliverySupervisors.length > 0) {
        let nextAssignee;
        if (deliverySupervisors.length === 1) {
          nextAssignee = deliverySupervisors[0];
        } else {
          const supervisorWorkloads = await Promise.all(
            deliverySupervisors.map(async (supervisor) => {
              // Use authUserId for getByAssignee
              const supervisorTasks = await taskService.getByAssignee(supervisor.authUserId);
              const pendingCount = (supervisorTasks.data || []).filter((t: any) =>
                t.status === 'pending' || t.status === 'in-progress'
              ).length;
              return { supervisor, pendingCount };
            })
          );
          supervisorWorkloads.sort((a, b) => a.pendingCount - b.pendingCount);
          nextAssignee = supervisorWorkloads[0].supervisor;
        }
        if (nextAssignee && nextAssignee.authUserId) {
          // Fix: show user name/email, not auth id
          const createdBy =
            user?.employeeData?.name ||
            user?.name ||
            user?.email ||
            '';

          const deliveryTaskData = {
            title: `Delivery - ${task.title}`,
            description: task.description,
            task_type: 'delivery' as Task['task_type'],
            workflow_stage: 'delivery' as Task['workflow_stage'],
            assignee_id: nextAssignee.authUserId,
            assignee_name: nextAssignee.name,
            status: 'pending' as Task['status'],
            priority: task.priority,
            due_date: task.due_date,
            due_time: task.due_time,
            created_by: createdBy, // Show name/email, not auth id
            original_order_id: task.original_order_id || task.$id,
            parent_task_id: task.$id,
            file_url: task.file_url,
            customer_phone: task.customer_phone,
            printing_type: task.printing_type,
            last_updated: new Date().toISOString(),
            external_parent_id: (task as any).external_id || task.$id, // Use type assertion to avoid TS error
          };
          await taskService.create(deliveryTaskData);
          toast({
            title: "Task Auto-Assigned",
            description: `Delivery task automatically assigned to ${nextAssignee.name}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to progress workflow: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleAssignWorkflow = useCallback((task: Task, nextType: 'printing' | 'delivery') => {
    setAssignTask(task);
    setAssignType(nextType);
    setAssignDialogOpen(true);
    setAssignEmployeeId('');
  }, []);

  const handleAssignConfirm = async () => {
    if (!assignTask || !assignType || !assignEmployeeId) return;
    try {
      // Find employee by $id, but use authUserId for assignment
      const nextEmp = employees.find(emp => emp.$id === assignEmployeeId);
      if (!nextEmp || !nextEmp.authUserId) throw new Error('Select a valid employee');
      let updateData: Partial<Task> = {
        task_type: assignType,
        workflow_stage: assignType,
        assignee_id: nextEmp.authUserId,
        assignee_name: nextEmp.name,
        status: 'pending',
        parent_task_id: assignTask.$id,
      };

      // Set external_id for printing (designer's authUserId)
      // Set external_parent_id for delivery (printing technician's authUserId)
      if (assignType === 'printing') {
        if (!(assignTask as any).external_id) {
          (updateData as any).external_id = assignTask.assignee_id;
        } else {
          (updateData as any).external_id = (assignTask as any).external_id;
        }
        // Do NOT set external_parent_id for printing
      } else if (assignType === 'delivery') {
        (updateData as any).external_id = (assignTask as any).external_id;
        (updateData as any).external_parent_id = assignTask.assignee_id;

        // Fix: Only clear due_date if previous due_date is empty or invalid, otherwise keep the admin-assigned date
        if (!assignTask.due_date || assignTask.due_date === '1970-01-01') {
          updateData.due_date = '';
          updateData.due_time = '';
        } else {
          updateData.due_date = assignTask.due_date;
          updateData.due_time = assignTask.due_time;
        }
      }

      await taskService.update(assignTask.$id, updateData);
      toast({
        title: "Task Assigned",
        description: `Task assigned to ${nextEmp.name}`,
      });
      setAssignDialogOpen(false);
      setAssignTask(null);
      setAssignType(null);
      setAssignEmployeeId('');
      await loadTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    // Find the employee by authUserId (not by $id)
    const assignedEmployee = employees.find(emp => emp.authUserId === task.assignee_id);
    setFormData({
      order_no: task.order_no || '',
      title: task.title,
      description: task.description,
      task_type: task.task_type || 'designing',
      assignee_id: assignedEmployee?.$id || '', // UI uses $id, DB uses authUserId
      assignee_name: task.assignee_name,
      due_date: task.due_date,
      due_time: task.due_time || '',
      priority: task.priority || 'medium',
      file_url: task.file_url || '',
      customer_phone: task.customer_phone || '',
      printing_type: task.printing_type || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSubmitting(true);
    try {
      const selectedEmployee = employees.find(emp => emp.$id === formData.assignee_id);
      if (!selectedEmployee || !selectedEmployee.authUserId) {
        throw new Error('Selected employee does not have a valid user account');
      }
      const updateData = {
        title: formData.title,
        description: formData.description,
        task_type: formData.task_type,
        workflow_stage: formData.task_type,
        assignee_id: selectedEmployee.authUserId, // Use authUserId for assignment
        assignee_name: selectedEmployee.name,
        status: 'pending',
        due_date: formData.due_date,
        due_time: formData.due_time,
        priority: formData.priority,
        file_url: formData.file_url,
        customer_phone: formData.customer_phone,
        printing_type: formData.printing_type,
        last_updated: new Date().toISOString(),
        created_by: editingTask.created_by, // keep original creator UUID
      };

      await taskService.update(editingTask.$id, updateData);

      toast({
        title: "Task Updated",
        description: `Task "${updateData.title}" has been updated successfully`,
      });

      await loadTasks();
      setIsEditDialogOpen(false);
      setEditingTask(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskDetail(task);
    setIsTaskDetailOpen(true);
  };

  const getStatusIcon = (status: Task['status']) => {
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

  const getStatusColor = (status: Task['status']) => {
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

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const formatStatus = (status: Task['status']) => {
    return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Memoized function to get creator name/email from UUID
  const getCreatorName = useCallback((uuid: string) => {
    return userIdToName[uuid] || uuid;
  }, [userIdToName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Filtered tasks for display
  const filteredTasks = filterTasksByDate(tasks)
    .filter(task => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      return (
        (task.order_no || "").toLowerCase().includes(term) ||
        (task.title || "").toLowerCase().includes(term) ||
        (task.assignee_name || "").toLowerCase().includes(term) ||
        (task.description || "").toLowerCase().includes(term) ||
        (task.customer_phone || "").toLowerCase().includes(term)
      );
    })
    // Admin: filter by task type if selected
    .filter(task => {
      if (user?.role === 'Admin' && task_typeFilter !== 'all') {
        return task.task_type === task_typeFilter;
      }
      return true;
    })
    // For Delivery Supervisor, only show pending/in-progress delivery tasks
    .filter(task => {
      if (user?.role === 'Delivery Supervisor') {
        return task.task_type === 'delivery' && (
          task.status === 'pending' ||
          task.status === 'in-progress'
        );
      }
      return true;
    });

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Filter for Admin/Manager */}
      {(user?.role === 'Admin' || user?.role === 'Manager') && (
        <div className="flex gap-2 mb-2">
          <Label>Filter:</Label>
          <Select
            value={filter}
            onValueChange={setFilter}
            defaultValue="monthly"
          >
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lifetime">Lifetime</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {/* Task type filter for Admin only */}
          {user?.role === 'Admin' && (
            <Select
              value={task_typeFilter}
              onValueChange={settask_typeFilter}
              defaultValue="all"
            >
              <SelectTrigger className="w-40 ml-2">
                <SelectValue placeholder="Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="designing">Designing</SelectItem>
                <SelectItem value="printing">Printing</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2 mb-4">
        <Input
          type="text"
          placeholder="Search by Order No, Title, Assignee, Description, Customer..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.role === 'Admin'
              ? 'Manage and assign tasks to your team'
              : user?.role === 'Manager'
              ? 'Manage and assign tasks to your team'
              : 'Track your assigned tasks'}
          </p>
        </div>

        {/* Create Task for Admin, Manager, Designer (Designer: only printing, only self) */}
        {canCreateTask && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="order_no">Order No</Label>
                  <Input
                    id="order_no"
                    value={formData.order_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_no: e.target.value }))}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    placeholder="Enter task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Describe the task details..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {/* Task Type: Designer can only select printing and cannot change */}
                  <div className="space-y-2">
                    <Label htmlFor="task_type">Task Type</Label>
                    <Select
                      value={formData.task_type}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, task_type: value as Task['task_type'] }))}
                      disabled={user?.role === 'Graphic Designer'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(user?.role === 'Graphic Designer') ? (
                          <SelectItem value="printing">Printing Task</SelectItem>
                        ) : (
                          <>
                            <SelectItem value="designing">Designing Task</SelectItem>
                            <SelectItem value="printing">Printing Task</SelectItem>
                            <SelectItem value="delivery">Delivery Task</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Assignee: Show filtered list for all roles, restrict to self for printing if designer */}
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assign To</Label>
                    <Select
                      value={formData.assignee_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assignee_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(emp => {
                            // Filter by task type for all roles
                            if (formData.task_type === 'designing') return emp.role === 'Graphic Designer';
                            if (formData.task_type === 'printing') return emp.role === 'Printing Technician';
                            if (formData.task_type === 'delivery') return emp.role === 'Delivery Supervisor';
                            return true;
                          })
                          .filter(employee => !!employee.$id) // Only employees with a non-empty $id
                          .map(employee => (
                            <SelectItem key={employee.$id} value={employee.$id}>
                              <div className="flex flex-col">
                                <span>
                                  {employee.name ?? ''} ({employee.role ?? ''})
                                  {typeof employee.pendingTasks === 'number' || typeof employee.inProgressTasks === 'number'
                                    ? ` - Pending: ${employee.pendingTasks || 0}, In Progress: ${employee.inProgressTasks || 0}`
                                    : ''}
                                </span>
                                <span className="text-xs text-gray-500">{employee.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="due_time">Due Time</Label>
                    <Input
                      id="due_time"
                      type="time"
                      value={formData.due_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value: Task['priority']) =>
                      setFormData(prev => ({ ...prev, priority: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Printing Task Specific Fields: Only Printing Type */}
                {formData.task_type === 'printing' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium">Printing Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="printing_type">Printing Type</Label>
                      <Select
                        value={formData.printing_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, printing_type: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select printing type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Offset Printing">Offset Printing</SelectItem>
                          <SelectItem value="Digital Printing">Digital Printing</SelectItem>
                          <SelectItem value="Flex Printing">Flex Printing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="file_url">File/Google Drive Link (Optional)</Label>
                  <Input
                    id="file_url"
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Customer Phone Number (Optional)</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="Enter customer number"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !formData.assignee_id}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Task'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'Admin' ? 'All Tasks' : user?.role === 'Manager' ? 'All Tasks' : user?.role === 'Delivery Supervisor' ? 'Delivery Tasks' : 'My Tasks'}
          </CardTitle>
          <CardDescription>
            {user?.role === 'Admin' || user?.role === 'Manager'
              ? 'Manage all tasks across your organization'
              : user?.role === 'Delivery Supervisor'
              ? 'Your assigned delivery tasks and their current status'
              : 'Your assigned tasks and their current status'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <Circle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {user?.role === 'Admin' ? 'No tasks created yet' : 'No tasks assigned to you yet'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {user?.role === 'Admin' 
                  ? 'Create your first task to get started'
                  : 'Tasks assigned to you will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[600px] sm:min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24 sm:w-auto">Order No</TableHead>
                    <TableHead className="min-w-[200px] sm:min-w-0">Task</TableHead>
                    {user?.role === 'Admin' && <TableHead className="w-32 sm:w-auto">Assignee</TableHead>}
                    <TableHead className="w-32 sm:w-auto">Type</TableHead>
                    <TableHead className="w-24 sm:w-auto">Priority</TableHead>
                    <TableHead className="w-32 sm:w-auto">Due Date</TableHead>
                    <TableHead className="w-32 sm:w-auto">File Link</TableHead>
                    <TableHead className="w-24 sm:w-auto">Status</TableHead>
                    {/* Show Created By for Admin/Manager */}
                    <TableHead className="w-32 sm:w-auto">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.$id} className="min-h-[60px]">
                      <TableCell>
                        <span className="font-mono text-xs sm:text-sm">{task.order_no || task.$id.slice(-6).toUpperCase()}</span>
                      </TableCell>
                      <TableCell>
                        <div style={{ maxWidth: 220, overflow: 'visible', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          <p className="font-medium text-sm sm:text-base">{task.title}</p>
                          {task.description && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-1" style={{ maxWidth: 200, overflow: 'visible', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              {task.description}
                            </p>
                          )}
                          {task.file_url && (
                            <a 
                              href={task.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 block hidden sm:inline"
                            >
                              📎 View Attached File
                            </a>
                          )}
                          {task.customer_phone && (
                            <p className="text-xs text-green-600 mt-1 truncate">
                              📞 Customer: {task.customer_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      {user?.role === 'Admin' && (
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate max-w-[100px]">{task.assignee_name}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
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
                      <TableCell>
                        <Badge className={`text-xs ${getPriorityColor(task.priority || 'medium')}`}>
                          {(task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400 hidden sm:block" />
                          <div className={task.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                            <div className="text-xs sm:text-sm whitespace-nowrap">{new Date(task.due_date).toLocaleDateString()}</div>
                            {task.due_time && (
                              <div className="text-xs text-gray-500 hidden sm:block">{task.due_time}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          {getStatusIcon(task.status || 'pending')}
                          <Badge className={`ml-1 text-xs ${
                            task.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : task.status === 'not-delivered'
                              ? 'bg-red-100 text-red-800'
                              : getStatusColor(task.status || 'pending')
                          }`}>
                            {formatStatus(task.status || 'pending')}
                          </Badge>
                        </div>
                      </TableCell>
          
                      <TableCell>
                        {/* Actions column logic */}
                        <div className="flex flex-col space-y-1 min-w-[120px]">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs mb-1"
                            onClick={() => handleTaskClick(task)}
                          >
                            View Details
                          </Button>
                          {/* Assign to Printing/Delivery buttons */}
                          {task.status === 'completed' && (
                            <>
                              {task.task_type === 'designing' && (user?.role === 'Graphic Designer' || user?.role === 'Manager' || user?.role === 'Admin') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs mb-1"
                                  onClick={() => handleAssignWorkflow(task, 'printing')}
                                >
                                  Assign to Printing
                                </Button>
                              )}
                              {task.task_type === 'printing' && (user?.role === 'Printing Technician' || user?.role === 'Manager' || user?.role === 'Admin') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs mb-1"
                                  onClick={() => handleAssignWorkflow(task, 'delivery')}
                                >
                                  Assign to Delivery
                                </Button>
                              )}
                            </>
                          )}
                          {/* Delete icon for Admin/Manager */}
                          {(user?.role === 'Admin' || user?.role === 'Manager') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-xs mt-1 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteTask(task.$id)}
                              title="Delete Task"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          )}
                          {/* Status select for Delivery Supervisor: only delivered */}
                          {(user?.role === 'Delivery Supervisor') ? (
                            <Select
                              value={task.status}
                              onValueChange={(value: Task['status']) => updateTaskStatus(task.$id, value)}
                            >
                              <SelectTrigger className="w-full sm:w-32 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delivered">Delivered</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (user?.role !== 'Admin') && (
                            // For manager, disable status select for designing tasks
                            (user?.role === 'Manager' && task.task_type === 'designing') ? (
                              <Select value={task.status || 'pending'} disabled>
                                <SelectTrigger className="w-full sm:w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select
                                value={task.status || 'pending'}
                                onValueChange={(value: Task['status']) => updateTaskStatus(task.$id, value)}
                              >
                                <SelectTrigger className="w-full sm:w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            )
                          )}
                          {/* Edit button for Admin/Manager/Designer only */}
                          {(user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Graphic Designer') && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs mt-1"
                                onClick={() => handleEditTask(task)}
                              >
                                Edit
                              </Button>
                              <Badge variant="outline" className="text-xs hidden lg:inline-flex">
                                Created by                            {getCreatorName(task.created_by)}
                              </Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl w-full sm:w-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Show full form for Admin/Manager/Designer */}
            {(user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Graphic Designer') ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="editTitle">Task Title</Label>
                  <Input
                    id="editTitle"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDescription">Description</Label>
                  <Textarea
                    id="editDescription"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editAssignee">Assign To</Label>
                    <Select
                      value={formData.assignee_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assignee_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(emp => {
                            if (formData.task_type === 'designing') return emp.role === 'Graphic Designer';
                            if (formData.task_type === 'printing') return emp.role === 'Printing Technician';
                            if (formData.task_type === 'delivery') return emp.role === 'Delivery Supervisor';
                            return true;
                          })
                          .filter(employee => !!employee.$id) // Only employees with a non-empty $id
                          .map(employee => (
                            <SelectItem key={employee.$id} value={employee.$id}>
                              {employee.name ?? ''} ({employee.role ?? ''})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edittask_type">Task Type</Label>
                    <Select
                      value={formData.task_type}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, task_type: value as Task['task_type'] }))}
                      disabled={user?.role === 'Graphic Designer'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select task type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(user?.role === 'Graphic Designer') ? (
                          <SelectItem value="printing">Printing Task</SelectItem>
                        ) : (
                          <>
                            <SelectItem value="designing">Designing Task</SelectItem>
                            <SelectItem value="printing">Printing Task</SelectItem>
                            <SelectItem value="delivery">Delivery Task</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editdue_date">Due Date</Label>
                  <Input
                    id="editdue_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    required
                  />
                </div>
                {/* Printing Task Specific Fields: Only Printing Type */}
                {formData.task_type === 'printing' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium">Printing Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="editprinting_type">Printing Type</Label>
                      <Select
                        value={formData.printing_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, printing_type: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select printing type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Offset Printing">Offset Printing</SelectItem>
                          <SelectItem value="Digital Printing">Digital Printing</SelectItem>
                          <SelectItem value="Flex Printing">Flex Printing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="editfile_url">File/Google Drive Link</Label>
                  <Input
                    id="editfile_url"
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editcustomer_phone">Customer Phone Number</Label>
                  <Input
                    id="editcustomer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="Enter customer number"
                  />
                </div>
              </>
            ) : (
              // For other roles, show only file_url and customer_phone (no edit for Printing Technician)
              <>
                <div className="space-y-2">
                  <Label htmlFor="editfile_url">File/Google Drive Link</Label>
                  <Input
                    id="editfile_url"
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, file_url: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editcustomer_phone">Customer Phone Number</Label>
                  <Input
                    id="editcustomer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                    placeholder="Enter customer number"
                  />
                </div>
              </>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingTask(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Task'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Modal */}
      <TaskDetailDialog open={isTaskDetailOpen} onOpenChange={setIsTaskDetailOpen}>
        <TaskDetailDialogContent className="max-w-2xl w-full sm:w-auto">
          <TaskDetailDialogHeader>
            <TaskDetailDialogTitle>Task Details</TaskDetailDialogTitle>
          </TaskDetailDialogHeader>
          {selectedTaskDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Task Title</Label>
                  <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Task Type</Label>
                  <p className="text-sm text-gray-700 mt-1 capitalize">{selectedTaskDetail.task_type}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.description || 'No description provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-sm text-gray-700 mt-1">{new Date(selectedTaskDetail.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge className={`mt-1 ${getPriorityColor(selectedTaskDetail.priority || 'medium')}`}>
                    {(selectedTaskDetail.priority || 'medium').charAt(0).toUpperCase() + (selectedTaskDetail.priority || 'medium').slice(1)}
                  </Badge>
                </div>
              </div>
              
              {/* Show last updated and assignee */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Last Updated</Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {selectedTaskDetail.last_updated && selectedTaskDetail.last_updated !== 'N/A'
                      ? new Date(selectedTaskDetail.last_updated).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Assignee</Label>
                  <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.assignee_name}</p>
                </div>
              </div>
              
              {selectedTaskDetail.task_type === 'printing' && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium">Printing Specifications</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Printing Type</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.printing_type || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedTaskDetail.file_url && (
                <div>
                  <Label className="text-sm font-medium">Attached File</Label>
                  <div className="mt-1">
                    <a 
                      href={selectedTaskDetail.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📎 View Attached File
                    </a>
                  </div>
                </div>
              )}
              
              {selectedTaskDetail.customer_phone && (
                <div>
                  <Label className="text-sm font-medium">Customer Contact</Label>
                  <p className="text-sm text-gray-700 mt-1">📞 {selectedTaskDetail.customer_phone}</p>
                </div>
              )}
              
              {/* Show designer and printing technician for completed tasks */}
              {selectedTaskDetail.status === 'completed' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Designer</Label>
                  <p className="text-sm text-gray-700 mt-1">
                    {
                      (() => {
                        // Traverse parent_task_id chain to find designer and printing technician
                        let designer = null, printingTech = null;
                        let t: Task | null = selectedTaskDetail;
                        // Traverse up to find designer and printing technician
                        for (let i = 0; i < 3 && t; i++) {
                          if (t.task_type === 'designing' && !designer) designer = t.assignee_name;
                          if (t.task_type === 'printing' && !printingTech) printingTech = t.assignee_name;
                          t = t?.parent_task_id
    ? (() => {
        const parent = tasks.find(x => x.$id === t?.parent_task_id);
        return parent ? parent : null;
      })()
    : null;
                        }
                        return (
                          <>
                            <span>{designer || '-'}</span>
                            <br />
                            <Label className="text-sm font-medium">Printing Technician</Label>
                            <span>{printingTech || '-'}</span>
                          </>
                        );
                      })()
                    }
                  </p>
                </div>
              )}
              {/* Always show workflow assignees chain */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Workflow Assignees</Label>
                <div className="text-sm text-gray-700 mt-1">
                  {
                    (() => {
                      // Designer: external_id (designer's authUserId)
                      let designer = null, printingTech = null, deliverySup = null;
                      if (selectedTaskDetail.external_id) {
                        const designerEmp = employees.find(emp => emp.authUserId === selectedTaskDetail.external_id);
                        designer = designerEmp?.name || null;
                      }
                      // Printing Technician: external_parent_id (printing technician's authUserId)
                      if (selectedTaskDetail.external_parent_id) {
                        const printingEmp = employees.find(emp => emp.authUserId === selectedTaskDetail.external_parent_id);
                        printingTech = printingEmp?.name || null;
                      }
                      // Delivery Supervisor: just use assignee_name for delivery tasks
                      if (selectedTaskDetail.task_type === 'delivery') {
                        deliverySup = selectedTaskDetail.assignee_name;
                      }
                      // Fallback: Traverse parent_task_id chain for any missing info
                      let t: Task | null = selectedTaskDetail;
                      let safety = 0;
                      while (t && safety < 5) {
                        if (!designer && t.task_type === 'designing') designer = t.assignee_name;
                        if (!printingTech && t.task_type === 'printing') printingTech = t.assignee_name;
                        if (!deliverySup && t.task_type === 'delivery') deliverySup = t.assignee_name;
                        t = t?.parent_task_id
    ? (() => {
        const parent = tasks.find(x => x.$id === t?.parent_task_id);
        return parent ? parent : null;
      })()
    : null;
                        safety++;
                      }
                      return (
                        <div>
                          <div>
                            <span className="font-semibold">Designer: </span>
                            {designer || <span className="text-gray-400">No past assignee</span>}
                          </div>
                          <div>
                            <span className="font-semibold">Printing Technician: </span>
                            {printingTech || <span className="text-gray-400">No past assignee</span>}
                          </div>
                          <div>
                            <span className="font-semibold">Delivery Supervisor: </span>
                            {deliverySup || <span className="text-gray-400">No past assignee</span>}
                          </div>
                        </div>
                      );
                    })()
                  }
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsTaskDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </TaskDetailDialogContent>
      </TaskDetailDialog>

      {/* Assign Workflow Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Assign to {assignType === 'printing' ? 'Printing Technician' : 'Delivery Supervisor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Select Employee</Label>
            <Select
              value={assignEmployeeId}
              onValueChange={setAssignEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees
                  .filter(emp => assignType === 'printing'
                    ? emp.role === 'Printing Technician'
                    : emp.role === 'Delivery Supervisor'
                  )
                  .map(emp => (
                    <SelectItem key={emp.$id} value={emp.$id}>
                      {emp.name} ({emp.email})
                      {typeof emp.pendingTasks === 'number' || typeof emp.inProgressTasks === 'number'
                        ? ` - Pending: ${emp.pendingTasks || 0}, In Progress: ${emp.inProgressTasks || 0}`
                        : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignConfirm}
                disabled={!assignEmployeeId}
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};