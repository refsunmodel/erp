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
  orderNo?: string;
  title: string;
  description: string;
  taskType?: 'designing' | 'printing' | 'delivery';
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  dueTime?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue' |  'delivered' |'not-delivered';
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  fileUrl?: string;
  customerPhone?: string;
  printingType?: string;
  workflowStage?: 'designing' | 'printing' | 'delivery' | 'completed';
  originalOrderId?: string;
  $createdAt: string;
  parentTaskId?: string; // Add 'parentTaskId' to Task interface for workflow linking
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
  const [filter, setFilter] = useState('monthly'); // Add filter state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [assignType, setAssignType] = useState<'printing' | 'delivery' | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    orderNo: '',
    title: '',
    description: '',
    taskType: 'designing' as Task['taskType'],
    assigneeId: '',
    assigneeName: '',
    dueDate: '',
    dueTime: '',
    priority: 'medium' as Task['priority'],
    fileUrl: '',
    customerPhone: '',
    printingType: ''
  });

  const [searchTerm, setSearchTerm] = useState(""); // <-- Add search state

  // Add canCreateTask logic
  // Admin, Manager, and Graphic Designer can create tasks
  const canCreateTask =
    user?.role === 'Admin' ||
    user?.role === 'Manager' ||
    user?.role === 'Graphic Designer';

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

    // Set default taskType and filter for Graphic Designer
    if (user?.role === 'Graphic Designer') {
      setFormData(prev => ({
        ...prev,
        taskType: 'printing',
        assigneeId: user.$id // Only allow self-assignment
      }));
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let response;
      if (user?.role === 'Admin' || user?.role === 'Manager') {
        response = await taskService.list();
      } else {
        response = await taskService.getByAssignee(user?.$id || '');
      }
      // Update task status based on due date
      const tasksWithUpdatedStatus = response.documents.map((task: any) => {
        const today = new Date();
        const dueDate = new Date(task.dueDate);
        if (task.status !== 'completed' && task.status !== 'delivered' && dueDate < today) {
          return { ...task, status: 'overdue' };
        }
        return task;
      });
      // Remove delivered/not-delivered tasks for Delivery Supervisor
      let filteredTasks = tasksWithUpdatedStatus;
      if (user?.role === 'Delivery Supervisor') {
        filteredTasks = filteredTasks.filter((t: any) =>
          t.taskType === 'delivery' &&
          (t.status === 'pending' || t.status === 'in-progress')
        );
      }
      setTasks(filteredTasks as Task[]);
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
      let validEmployees = response.documents.filter((emp: any) => emp.authUserId);

      // Count pending/in-progress tasks for each employee
      const allTasks = await taskService.list();
      validEmployees = validEmployees.map((emp: any) => {
        const empTasks = allTasks.documents.filter(
          (t: any) => t.assigneeId === emp.authUserId
        );
        const pendingTasks = empTasks.filter((t: any) => t.status === 'pending').length;
        const inProgressTasks = empTasks.filter((t: any) => t.status === 'in-progress').length;
        return { ...emp, pendingTasks, inProgressTasks };
      });

      setEmployees(validEmployees as unknown as Employee[]);
    } catch (error: any) {
      console.error('Failed to load employees:', error);
    }
  };

  // Filtering logic (filter by createdAt, not dueDate)
  const filterTasksByDate = (tasks: Task[]) => {
    if (!filter || filter === 'lifetime') return tasks;
    const now = new Date();
    return tasks.filter(task => {
      const created = new Date(task.$createdAt);
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
      // Check for duplicate orderNo if provided
      // if (formData.orderNo) {
      //   const allTasks = await taskService.list();
      //   const exists = allTasks.documents.some((t: any) => t.orderNo === formData.orderNo);
      //   if (exists) {
      //     window.alert("This order number already exists. Please use a different one.");
      //     setSubmitting(false);
      //     return;
      //   }
      // }
      const selectedEmployee = employees.find(emp => emp.$id === formData.assigneeId);

      if (!selectedEmployee || !selectedEmployee.authUserId) {
        throw new Error('Selected employee does not have a valid user account');
      }

      const taskData = {
        orderNo: formData.orderNo || undefined,
        title: formData.title,
        description: formData.description,
        taskType: formData.taskType,
        workflowStage: formData.taskType,
        assigneeId: selectedEmployee.authUserId,
        assigneeName: selectedEmployee.name,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        status: 'pending',
        createdBy: user?.name || user?.email || 'admin',
        fileUrl: formData.fileUrl,
        customerPhone: formData.customerPhone,
        printingType: formData.printingType
      };

      await taskService.create(taskData);

      toast({
        title: "Task Created",
        description: `Task "${taskData.title}" assigned to ${taskData.assigneeName}`,
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
      orderNo: '',
      title: '',
      description: '',
      taskType: 'designing',
      assigneeId: '',
      assigneeName: '',
      dueDate: '',
      dueTime: '',
      priority: 'medium',
      fileUrl: '',
      customerPhone: '',
      printingType: ''
    });
    setIsAddDialogOpen(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const task = tasks.find(t => t.$id === taskId);
      if (!task) return;

      // Update the task status
      await taskService.update(taskId, { status: newStatus });

      // If delivered or not-delivered, remove from list for Delivery Supervisor
      if (
        (newStatus === 'delivered' || newStatus === 'not-delivered') &&
        user?.role === 'Delivery Supervisor'
      ) {
        setTasks(prev => prev.filter(t => t.$id !== taskId));
        return; // Don't reload all tasks, just remove from UI
      }

      // If delivered, remove from list for Delivery Supervisor (legacy)
      if (newStatus === 'delivered' && user?.role === 'Delivery Supervisor') {
        setTasks(prev => prev.filter(t => t.$id !== taskId));
      }

      // If task is being completed and it's a printing task, create delivery task
      if (newStatus === 'completed' && task.taskType === 'printing') {
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
      // Don't create new tasks if this is already a delivery task being completed
      if (task.taskType === 'delivery') {
        return;
      }
      
      // Find available delivery supervisors
      const deliverySupervisors = employees.filter(emp => emp.role === 'Delivery Supervisor');
      
      if (deliverySupervisors.length > 0) {
        let nextAssignee;
        
        if (deliverySupervisors.length === 1) {
          nextAssignee = deliverySupervisors[0];
        } else {
          // Find the delivery supervisor with least pending tasks
          const supervisorWorkloads = await Promise.all(
            deliverySupervisors.map(async (supervisor) => {
              const supervisorTasks = await taskService.getByAssignee(supervisor.authUserId);
              const pendingCount = supervisorTasks.documents.filter((t: any) => 
                t.status === 'pending' || t.status === 'in-progress'
              ).length;
              return { supervisor, pendingCount };
            })
          );
          
          // Sort by workload and pick the one with least tasks
          supervisorWorkloads.sort((a, b) => a.pendingCount - b.pendingCount);
          nextAssignee = supervisorWorkloads[0].supervisor;
        }
        
        if (nextAssignee && nextAssignee.authUserId) {
          // Create delivery task
          const deliveryTaskData = {
            title: `Delivery - ${task.title}`,
            description: task.description,
            taskType: 'delivery' as Task['taskType'],
            workflowStage: 'delivery' as Task['workflowStage'],
            assigneeId: nextAssignee.authUserId,
            assigneeName: nextAssignee.name,
            status: 'pending' as Task['status'],
            priority: task.priority,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            createdBy: user?.name || user?.email || 'System',
            originalOrderId: task.originalOrderId || task.$id,
            parentTaskId: task.$id, // Link to parent task
            fileUrl: task.fileUrl,
            customerPhone: task.customerPhone,
            printingType: task.printingType
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
      const nextEmp = employees.find(emp => emp.$id === assignEmployeeId);
      if (!nextEmp || !nextEmp.authUserId) throw new Error('Select a valid employee');
      const updateData: Partial<Task> = {
        taskType: assignType,
        workflowStage: assignType,
        assigneeId: nextEmp.authUserId,
        assigneeName: nextEmp.name,
        status: 'pending',
        parentTaskId: assignTask.$id,
      };
      if (assignType === 'delivery') {
        updateData.dueDate = '';
        updateData.dueTime = '';
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
    const assignedEmployee = employees.find(emp => emp.authUserId === task.assigneeId);
    
    setFormData({
      orderNo: task.orderNo || '',
      title: task.title,
      description: task.description,
      taskType: task.taskType || 'designing',
      assigneeId: assignedEmployee?.$id || '',
      assigneeName: task.assigneeName,
      dueDate: task.dueDate,
      dueTime: task.dueTime || '',
      priority: task.priority || 'medium',
      fileUrl: task.fileUrl || '',
      customerPhone: task.customerPhone || '',
      printingType: task.printingType || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    
    setSubmitting(true);
    
    try {
      const selectedEmployee = employees.find(emp => emp.$id === formData.assigneeId);
      
      if (!selectedEmployee || !selectedEmployee.authUserId) {
        throw new Error('Selected employee does not have a valid user account');
      }
      
      const updateData = {
        title: formData.title,
        description: formData.description,
        taskType: formData.taskType,
        workflowStage: formData.taskType, // Update workflow stage to match task type
        assigneeId: selectedEmployee.authUserId,
        assigneeName: selectedEmployee.name,
        status: 'pending', // Reset status to pending when reassigning
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        fileUrl: formData.fileUrl,
        customerPhone: formData.customerPhone,
        printingType: formData.printingType
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
        (task.orderNo || "").toLowerCase().includes(term) ||
        (task.title || "").toLowerCase().includes(term) ||
        (task.assigneeName || "").toLowerCase().includes(term) ||
        (task.description || "").toLowerCase().includes(term) ||
        (task.customerPhone || "").toLowerCase().includes(term)
      );
    })
    // For Delivery Supervisor, only show pending/in-progress delivery tasks
    .filter(task => {
      if (user?.role === 'Delivery Supervisor') {
        return task.taskType === 'delivery' && (
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
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
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
                  <Label htmlFor="orderNo">Order No</Label>
                  <Input
                    id="orderNo"
                    value={formData.orderNo}
                    onChange={(e) => setFormData(prev => ({ ...prev, orderNo: e.target.value }))}
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
                    <Label htmlFor="taskType">Task Type</Label>
                    <Select
                      value={formData.taskType}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, taskType: value as Task['taskType'] }))}
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
                      value={formData.assigneeId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}
                      // Only disable for designer+printing if you want to restrict assignment to self
                     
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(emp => {
                            // Filter by task type for all roles
                            if (formData.taskType === 'designing') return emp.role === 'Graphic Designer';
                            if (formData.taskType === 'printing') return emp.role === 'Printing Technician';
                            if (formData.taskType === 'delivery') return emp.role === 'Delivery Supervisor';
                            return true;
                          })
                          // Only restrict to self for designer+printing if you want to enforce that
                         
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
                        {employees.length === 0 && (
                          <SelectItem value="" disabled>No employees found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueTime">Due Time</Label>
                    <Input
                      id="dueTime"
                      type="time"
                      value={formData.dueTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
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
                {formData.taskType === 'printing' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium">Printing Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="printingType">Printing Type</Label>
                      <Select
                        value={formData.printingType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, printingType: value }))}
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
                  <Label htmlFor="fileUrl">File/Google Drive Link (Optional)</Label>
                  <Input
                    id="fileUrl"
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Customer Phone Number (Optional)</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="Enter customer number"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !formData.assigneeId}>
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
                    <TableHead className="w-24 sm:w-auto">Type</TableHead>
                    <TableHead className="w-24 sm:w-auto">Priority</TableHead>
                    <TableHead className="w-32 sm:w-auto">Due Date</TableHead>
                    <TableHead className="w-32 sm:w-auto">File Link</TableHead>
                    <TableHead className="w-24 sm:w-auto">Status</TableHead>
                    <TableHead className="w-32 sm:w-auto">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.$id} className="min-h-[60px]">
                      <TableCell>
                        <span className="font-mono text-xs sm:text-sm">{task.orderNo || task.$id.slice(-6).toUpperCase()}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm sm:text-base">{task.title}</p>
                          {task.description && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-none">{task.description}</p>
                          )}
                          {task.fileUrl && (
                            <a 
                              href={task.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-1 block hidden sm:inline"
                            >
                              📎 View Attached File
                            </a>
                          )}
                          {task.customerPhone && (
                            <p className="text-xs text-green-600 mt-1 truncate">
                              📞 Customer: {task.customerPhone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      {user?.role === 'Admin' && (
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate max-w-[100px]">{task.assigneeName}</span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        {task.taskType ? (
                          <Badge variant="outline" className={`text-xs ${
                            task.taskType === 'designing' ? 'border-blue-500 text-blue-700' :
                            task.taskType === 'printing' ? 'border-green-500 text-green-700' :
                            'border-orange-500 text-orange-700'
                          }`}>
                            {task.taskType.charAt(0).toUpperCase() + task.taskType.slice(1)}
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
                            <div className="text-xs sm:text-sm whitespace-nowrap">{new Date(task.dueDate).toLocaleDateString()}</div>
                            {task.dueTime && (
                              <div className="text-xs text-gray-500 hidden sm:block">{task.dueTime}</div>
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
                              {task.taskType === 'designing' && (user?.role === 'Graphic Designer' || user?.role === 'Manager' || user?.role === 'Admin') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs mb-1"
                                  onClick={() => handleAssignWorkflow(task, 'printing')}
                                >
                                  Assign to Printing
                                </Button>
                              )}
                              {task.taskType === 'printing' && (user?.role === 'Printing Technician' || user?.role === 'Manager' || user?.role === 'Admin') && (
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
                                Created by {task.createdBy}
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
                      value={formData.assigneeId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(emp => {
                            if (formData.taskType === 'designing') return emp.role === 'Graphic Designer';
                            if (formData.taskType === 'printing') return emp.role === 'Printing Technician';
                            if (formData.taskType === 'delivery') return emp.role === 'Delivery Supervisor';
                            return true;
                          })
                          .map(employee => (
                            <SelectItem key={employee.$id} value={employee.$id}>
                              {employee.name ?? ''} ({employee.role ?? ''})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editTaskType">Task Type</Label>
                    <Select
                      value={formData.taskType}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, taskType: value as Task['taskType'] }))}
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
                  <Label htmlFor="editDueDate">Due Date</Label>
                  <Input
                    id="editDueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </div>
                {/* Printing Task Specific Fields: Only Printing Type */}
                {formData.taskType === 'printing' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium">Printing Details</h4>
                    <div className="space-y-2">
                      <Label htmlFor="editPrintingType">Printing Type</Label>
                      <Select
                        value={formData.printingType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, printingType: value }))}
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
                  <Label htmlFor="editFileUrl">File/Google Drive Link</Label>
                  <Input
                    id="editFileUrl"
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCustomerPhone">Customer Phone Number</Label>
                  <Input
                    id="editCustomerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="Enter customer number"
                  />
                </div>
              </>
            ) : (
              // For other roles, show only fileUrl and customerPhone (no edit for Printing Technician)
              <>
                <div className="space-y-2">
                  <Label htmlFor="editFileUrl">File/Google Drive Link</Label>
                  <Input
                    id="editFileUrl"
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCustomerPhone">Customer Phone Number</Label>
                  <Input
                    id="editCustomerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
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
                  <p className="text-sm text-gray-700 mt-1 capitalize">{selectedTaskDetail.taskType}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.description || 'No description provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="text-sm text-gray-700 mt-1">{new Date(selectedTaskDetail.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge className={`mt-1 ${getPriorityColor(selectedTaskDetail.priority || 'medium')}`}>
                    {(selectedTaskDetail.priority || 'medium').charAt(0).toUpperCase() + (selectedTaskDetail.priority || 'medium').slice(1)}
                  </Badge>
                </div>
              </div>
              
              {selectedTaskDetail.taskType === 'printing' && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium">Printing Specifications</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Printing Type</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.printingType || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedTaskDetail.fileUrl && (
                <div>
                  <Label className="text-sm font-medium">Attached File</Label>
                  <div className="mt-1">
                    <a 
                      href={selectedTaskDetail.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📎 View Attached File
                    </a>
                  </div>
                </div>
              )}
              
              {selectedTaskDetail.customerPhone && (
                <div>
                  <Label className="text-sm font-medium">Customer Contact</Label>
                  <p className="text-sm text-gray-700 mt-1">📞 {selectedTaskDetail.customerPhone}</p>
                </div>
              )}
              
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