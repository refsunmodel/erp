import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Users, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { attendanceService, employeeService } from '@/lib/database';

interface AttendanceRecord {
  $id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  status: 'Present' | 'Absent';
  day_type: 'Full Day' | 'Half Day';
  marked_by: string;
  $createdAt: string;
}

interface Employee {
  $id: string;
  name: string;
  email: string;
  role: string;
  authUserId: string;
}


export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMarkDialogOpen, setIsMarkDialogOpen] = useState(false);
 
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [attendanceData, setAttendanceData] = useState({
    employee_id: '',
    status: 'Present' as AttendanceRecord['status'],
    day_type: 'Full Day' as AttendanceRecord['day_type']
  });

 
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Remove laminationService.list() from Promise.all
      const [attendanceResponse, employeesResponse] = await Promise.all([
        attendanceService.list(undefined, selectedDate, undefined),
        employeeService.list()
      ]);

      // Filter employees based on user role
      let filteredEmployees = employeesResponse.data || [];
      if (user?.role === 'Manager') {
        // Manager can manage all employees except other managers and admin
        filteredEmployees = filteredEmployees.filter((emp: any) => 
          emp.role !== 'Admin' && emp.role !== 'Manager'
        );
      }

      setAttendanceRecords(attendanceResponse.data as unknown as AttendanceRecord[]);
      setEmployees(filteredEmployees as unknown as Employee[]);
     
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const employee = employees.find(emp => emp.$id === attendanceData.employee_id);
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Check if attendance already marked for this date
      const existingRecord = attendanceRecords.find(record => 
        record.employee_id === attendanceData.employee_id && record.date === selectedDate
      );

      if (existingRecord) {
        // Update existing record
        await attendanceService.update(existingRecord.$id, {
          status: attendanceData.status,
          day_type: attendanceData.day_type,
          marked_by: user?.name || user?.email || 'Unknown'
        });
        toast({
          title: "Attendance Updated",
          description: `Attendance updated for ${employee.name}`,
        });
      } else {
        // Create new record
        await attendanceService.create({
          employee_id: attendanceData.employee_id,
          employee_name: employee.name,
          date: selectedDate,
          status: attendanceData.status,
          day_type: attendanceData.day_type,
          marked_by: user?.name || user?.email || 'Unknown'
        });
        toast({
          title: "Attendance Marked",
          description: `Attendance marked for ${employee.name}`,
        });
      }

      await loadData();
      setIsMarkDialogOpen(false);
      setAttendanceData({
        employee_id: '',
        status: 'Present',
        day_type: 'Full Day'
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };



  const getAttendanceForEmployee = (employee_id: string) => {
    return attendanceRecords.find(record => record.employee_id === employee_id);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = attendanceRecords.filter(record => record.status === 'Present').length;
  const absentCount = attendanceRecords.filter(record => record.status === 'Absent').length;
  const halfDayCount = attendanceRecords.filter(record => record.day_type === 'Half Day').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'Admin' ? 'Track and manage employee attendance' : 'Manage team attendance'}
          </p>
        </div>
        
        <div className="flex space-x-2">
         
          
          <Dialog open={isMarkDialogOpen} onOpenChange={setIsMarkDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark Attendance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMarkAttendance} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select 
                    value={attendanceData.employee_id} 
                    onValueChange={(value) => setAttendanceData(prev => ({ ...prev, employee_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(employee => (
                        <SelectItem key={employee.$id} value={employee.$id}>
                          <div className="flex flex-col">
                            <span>{employee.name}</span>
                            <span className="text-xs text-gray-500">{employee.role}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={attendanceData.status} 
                      onValueChange={(value: AttendanceRecord['status']) => 
                        setAttendanceData(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="day_type">Day Type</Label>
                    <Select 
                      value={attendanceData.day_type} 
                      onValueChange={(value: AttendanceRecord['day_type']) => 
                        setAttendanceData(prev => ({ ...prev, day_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full Day">Full Day</SelectItem>
                        <SelectItem value="Half Day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsMarkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !attendanceData.employee_id}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Mark Attendance
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Absent Today</p>
                <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Half Day</p>
                <p className="text-2xl font-bold text-orange-600">{halfDayCount}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Attendance</CardTitle>
          <CardDescription>
            Attendance for {new Date(selectedDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="date">Select Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Day Type</TableHead>
                <TableHead>Marked By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => {
                const attendance = getAttendanceForEmployee(employee.$id);
                return (
                  <TableRow key={employee.$id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {attendance ? (
                        <Badge className={attendance.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {attendance.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Marked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {attendance ? (
                        <Badge variant="outline">{attendance.day_type}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {attendance ? (
                        <span className="text-sm text-gray-600">{attendance.marked_by}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAttendanceData({
                            employee_id: employee.$id,
                            status: attendance?.status || 'Present',
                            day_type: attendance?.day_type || 'Full Day'
                          });
                          setIsMarkDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    
    </div>
  );
};