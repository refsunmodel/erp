import React, { useState, useEffect } from 'react';
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
import { Plus, Calendar, Clock, User, CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';
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
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  fileUrl?: string;
  customerPhone?: string;
  size?: string;
  material?: string;
  printingType?: string;
  laminationType?: string;
  workflowStage?: 'designing' | 'printing' | 'delivery' | 'completed';
  originalOrderId?: string;
  $createdAt: string;
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
    size: '',
    material: '',
    printingType: '',
    laminationType: ''
  });

  useEffect(() => {
    loadTasks();
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      loadEmployees();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let response;
      
      if (user?.role === 'Admin') {
        // Admin sees all tasks
        response = await taskService.list();
      } else {
        // Employees see tasks assigned to their auth user ID
        response = await taskService.getByAssignee(user?.$id || '');
      }
      
      // Update task status based on due date
      const tasksWithUpdatedStatus = response.documents.map((task: any) => {
        const today = new Date();
        const dueDate = new Date(task.dueDate);
        
        if (task.status !== 'completed' && dueDate < today) {
          return { ...task, status: 'overdue' };
        }
        return task;
      });
      
      setTasks(tasksWithUpdatedStatus as Task[]);
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
      // Filter out employees that don't have authUserId
      const validEmployees = response.documents.filter((emp: any) => emp.authUserId);
      setEmployees(validEmployees as unknown as Employee[]);
    } catch (error: any) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const selectedEmployee = employees.find(emp => emp.$id === formData.assigneeId);
      
      if (!selectedEmployee || !selectedEmployee.authUserId) {
        throw new Error('Selected employee does not have a valid user account');
      }
      
      const taskData = {
        title: formData.title,
        description: formData.description,
        taskType: formData.taskType,
        workflowStage: formData.taskType, // Start with the first stage
        assigneeId: selectedEmployee.authUserId, // Use authUserId for task assignment
        assigneeName: selectedEmployee.name,
        dueDate: formData.dueDate,
        dueTime: formData.dueTime,
        priority: formData.priority,
        status: 'pending',
        createdBy: user?.name || user?.email || 'admin',
        fileUrl: formData.fileUrl,
        customerPhone: formData.customerPhone,
        size: formData.size,
        material: formData.material,
        printingType: formData.printingType,
        laminationType: formData.laminationType
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
      size: '',
      material: '',
      printingType: '',
      laminationType: ''
    });
    setIsAddDialogOpen(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      const task = tasks.find(t => t.$id === taskId);
      if (!task) return;

      // Update the task status
      await taskService.update(taskId, { status: newStatus });
      
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
            size: task.size,
            material: task.material,
            printingType: task.printingType,
            laminationType: task.laminationType
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
      size: task.size || '',
      material: task.material || '',
      printingType: task.printingType || '',
      laminationType: task.laminationType || ''
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
        size: formData.size,
        material: formData.material,
        printingType: formData.printingType,
        laminationType: formData.laminationType
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

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.role === 'Admin' ? 'Manage and assign tasks to your team' : 'Track your assigned tasks'}
          </p>
        </div>
        
        {(user?.role === 'Admin' || user?.role === 'Manager') && (
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
                  <div className="space-y-2">
                    <Label htmlFor="taskType">Task Type</Label>
                    <Select 
                      value={formData.taskType} 
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, taskType: value as Task['taskType'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="designing">Designing Task</SelectItem>
                        <SelectItem value="printing">Printing Task</SelectItem>
                        <SelectItem value="delivery">Delivery Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assign To</Label>
                    <Select 
                      value={formData.assigneeId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assigneeId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(emp => {
                            // Filter employees based on task type
                            if (formData.taskType === 'designing') return emp.role === 'Graphic Designer';
                            if (formData.taskType === 'printing') return emp.role === 'Printing Technician';
                            if (formData.taskType === 'delivery') return emp.role === 'Delivery Supervisor';
                            return emp.role != null;
                          })
                          .map(employee => (
                          <SelectItem key={employee.$id} value={employee.$id}>
                            <div className="flex flex-col">
                              <span>{employee.name ?? ''} ({employee.role ?? ''})</span>
                              <span className="text-xs text-gray-500">{employee.email}</span>
                              <span className="text-xs text-blue-600">
                                Pending: {employee.pendingTasks || 0} | In Progress: {employee.inProgressTasks || 0}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {employees.length === 0 && (
                      <p className="text-xs text-gray-500">No employees with user accounts found</p>
                    )}
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
                
                {/* Printing Task Specific Fields */}
                {formData.taskType === 'printing' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-medium">Printing Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Input
                          id="size"
                          value={formData.size}
                          onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                          placeholder="e.g., A4, A3, Custom"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="material">Material</Label>
                        <Input
                          id="material"
                          value={formData.material}
                          onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                          placeholder="e.g., Paper, Vinyl, Canvas"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="printingType">Type of Printing</Label>
                        <Input
                          id="printingType"
                          value={formData.printingType}
                          onChange={(e) => setFormData(prev => ({ ...prev, printingType: e.target.value }))}
                          placeholder="e.g., Digital, Offset, Screen"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="laminationType">Type of Lamination</Label>
                        <Input
                          id="laminationType"
                          value={formData.laminationType}
                          onChange={(e) => setFormData(prev => ({ ...prev, laminationType: e.target.value }))}
                          placeholder="e.g., Matte, Glossy, UV Coating"
                        />
                      </div>
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

      {/* Task Statistics - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-xl lg:text-2xl font-bold">{tasks.length}</p>
              </div>
              <Circle className="h-6 w-6 lg:h-8 lg:w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-xl lg:text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'in-progress').length}
                </p>
              </div>
              <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <CheckCircle2 className="h-6 w-6 lg:h-8 lg:w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-xl lg:text-2xl font-bold text-red-600">
                  {tasks.filter(t => t.status === 'overdue').length}
                </p>
              </div>
              <AlertCircle className="h-6 w-6 lg:h-8 lg:w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'Admin' ? 'All Tasks' : 'My Tasks'}
          </CardTitle>
          <CardDescription>
            {user?.role === 'Admin' 
              ? 'Manage all tasks across your organization'
              : 'Your assigned tasks and their current status'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
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
                  <TableHead className="w-24 sm:w-auto">Status</TableHead>
                  <TableHead className="w-32 sm:w-auto">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.$id} className="min-h-[60px]">
                    <TableCell>
                      <span className="font-mono text-xs sm:text-sm">{task.orderNo || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm sm:text-base">{task.title}</p>
                        {task.description && (
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-none">{task.description}</p>
                        )}
                        {task.taskType === 'printing' && task.size && (
                          <p className="text-xs text-blue-600 mt-1 truncate">
                            Size: {task.size}
                          </p>
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
                        <Badge className={`ml-1 text-xs ${getStatusColor(task.status || 'pending')}`}>
                          {formatStatus(task.status || 'pending')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user?.role !== 'Admin' && task.status !== 'completed' && (
                        <div className="flex flex-col space-y-1 min-w-[120px]">
                          {/* Show view details button for relevant task types */}
                          {((user?.role === 'Printing Technician' && task.taskType === 'printing') ||
                            (user?.role === 'Graphic Designer' && task.taskType === 'designing') ||
                            (user?.role === 'Delivery Supervisor' && task.taskType === 'delivery')) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs mb-1"
                              onClick={() => handleTaskClick(task)}
                            >
                              View Details
                            </Button>
                          )}
                          
                          <div className="flex flex-col space-y-1">
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
                          </div>
                        </div>
                      )}
                      {user?.role === 'Admin' && (
                        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                          <Button
                            variant="outline"
                            size="sm" 
                            className="text-xs"
                            onClick={() => handleEditTask(task)}
                          >
                            Edit
                          </Button>
                          <Badge variant="outline" className="text-xs hidden lg:inline-flex">
                            Created by {task.createdBy}
                          </Badge>
                        </div>
                      )}
                      {user?.role === 'Manager' && (
                        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                          <Button
                            variant="outline"
                            size="sm" 
                            className="text-xs"
                            onClick={() => handleEditTask(task)}
                          >
                            Edit
                          </Button>
                          <Badge variant="outline" className="text-xs hidden lg:inline-flex">
                            Created by {task.createdBy}
                          </Badge>
                        </div>
                      )}
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
  {/* Assignee Select */}
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
        {employees.map(employee => (
          <SelectItem key={employee.$id} value={employee.$id}>
            {employee.name ?? ''} ({employee.role ?? ''})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Task Type Select */}
  <div className="space-y-2">
    <Label htmlFor="editTaskType">Task Type</Label>
    <Select 
      value={formData.taskType} 
      onValueChange={(value: string) => setFormData(prev => ({ ...prev, taskType: value as Task['taskType'] }))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select task type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="designing">Designing Task</SelectItem>
        <SelectItem value="printing">Printing Task</SelectItem>
        <SelectItem value="delivery">Delivery Task</SelectItem>
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
              
              {/* Edit Printing Task Specific Fields */}
              {formData.taskType === 'printing' && (
                <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium">Printing Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editSize">Size</Label>
                      <Input
                        id="editSize"
                        value={formData.size}
                        onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                        placeholder="e.g., A4, A3, Custom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editMaterial">Material</Label>
                      <Input
                        id="editMaterial"
                        value={formData.material}
                        onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                        placeholder="e.g., Paper, Vinyl, Canvas"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="editPrintingType">Type of Printing</Label>
                      <Input
                        id="editPrintingType"
                        value={formData.printingType}
                        onChange={(e) => setFormData(prev => ({ ...prev, printingType: e.target.value }))}
                        placeholder="e.g., Digital, Offset, Screen"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editLaminationType">Type of Lamination</Label>
                      <Input
                        id="editLaminationType"
                        value={formData.laminationType}
                        onChange={(e) => setFormData(prev => ({ ...prev, laminationType: e.target.value }))}
                        placeholder="e.g., Matte, Glossy, UV Coating"
                      />
                    </div>
                  </div>
                </div>
      
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
                      <Label className="text-sm font-medium">Size</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.size || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Material</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.material || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Printing Type</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.printingType || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Lamination Type</Label>
                      <p className="text-sm text-gray-700 mt-1">{selectedTaskDetail.laminationType || 'Not specified'}</p>
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
    </div>
  );
};