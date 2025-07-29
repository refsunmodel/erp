import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Search, Users, MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatService, employeeService } from '@/lib/database';

interface ChatMessage {
  $id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  chatType: 'direct' | 'group';
  message: string;
  timestamp: string;
}

interface Employee {
  $id: string;
  name: string;
  email: string;
  role: string;
  authUserId: string;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [directMessages, setDirectMessages] = useState<ChatMessage[]>([]);
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('group');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
    loadGroupMessages();
  }, [user]);

  useEffect(() => {
    if (selectedEmployee && user) {
      loadDirectMessages();
    }
  }, [selectedEmployee, user]);

  useEffect(() => {
    scrollToBottom();
  }, [directMessages, groupMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.list();
      
      // For admin, show all employees. For employees, show admin and other employees
      let filteredEmployees = response.documents.filter((emp: any) => 
        emp.authUserId && emp.authUserId !== user?.$id
      );

      // If current user is not admin, add admin to the list
      if (user?.role !== 'Admin') {
        const adminEmployee = response.documents.find((emp: any) => emp.role === 'Admin');
        if (adminEmployee && adminEmployee.authUserId !== user?.$id) {
          filteredEmployees = [adminEmployee, ...filteredEmployees.filter(emp => emp.role !== 'Admin')];
        }
      }

      setEmployees(filteredEmployees as unknown as Employee[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load employees: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDirectMessages = async () => {
    if (!selectedEmployee || !user) return;
    
    try {
      const response = await chatService.getDirectMessages(user.$id, selectedEmployee.authUserId);
      // Filter messages between these two users specifically
      const filteredMessages = response.documents.filter((msg: any) => 
        (msg.senderId === user.$id && msg.receiverId === selectedEmployee.authUserId) ||
        (msg.senderId === selectedEmployee.authUserId && msg.receiverId === user.$id)
      );
      setDirectMessages(filteredMessages as unknown as ChatMessage[]);
    } catch (error: any) {
      console.error('Failed to load direct messages:', error);
    }
  };

  const loadGroupMessages = async () => {
    try {
      const response = await chatService.getMessages('group');
      setGroupMessages(response.documents.reverse() as unknown as ChatMessage[]);
    } catch (error: any) {
      console.error('Failed to load group messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setSending(true);
    
    try {
      const messageData = {
        senderId: user.$id,
        senderName: user.name || user.email,
        message: newMessage.trim(),
        chatType: activeTab as 'direct' | 'group',
        ...(activeTab === 'direct' && selectedEmployee ? {
          receiverId: selectedEmployee.authUserId
        } : {})
      };

      await chatService.sendMessage(messageData);
      setNewMessage('');
      
      // Reload messages
      if (activeTab === 'direct' && selectedEmployee) {
        await loadDirectMessages();
      } else {
        await loadGroupMessages();
      }
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message: " + error.message,
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
        <p className="text-gray-600 mt-2">Communicate with your team members</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
        {/* Employee List - Only show for direct messages */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Members
            </CardTitle>
            <CardDescription>Select someone to chat with</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No team members found</p>
                    </div>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <div
                        key={employee.$id}
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setActiveTab('direct');
                        }}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedEmployee?.$id === employee.$id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(employee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{employee.name}</p>
                          <p className="text-xs text-gray-500 truncate">{employee.role}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="group">Group Chat</TabsTrigger>
                <TabsTrigger value="direct">Direct Messages</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} className="w-full h-full">
              <TabsContent value="group" className="m-0 h-full">
                <div className="flex flex-col h-[500px]">
                  {/* Group Chat Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">Team Group Chat</h3>
                      <Badge variant="secondary">{employees.length + 1} members</Badge>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {groupMessages.map((message) => (
                        <div
                          key={message.$id}
                          className={`flex ${message.senderId === user?.$id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.senderId === user?.$id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {message.senderId !== user?.$id && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm">{message.message}</p>
                            <p className={`text-xs mt-1 ${
                              message.senderId === user?.$id ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <form onSubmit={sendMessage} className="flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        disabled={sending}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={sending || !newMessage.trim()}>
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="direct" className="m-0 h-full">
                <div className="flex flex-col h-[500px]">
                  {selectedEmployee ? (
                    <>
                      {/* Direct Chat Header */}
                      <div className="p-4 border-b">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(selectedEmployee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">{selectedEmployee.name}</h3>
                            <p className="text-sm text-gray-500">{selectedEmployee.role}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {directMessages.map((message) => (
                            <div
                              key={message.$id}
                              className={`flex ${message.senderId === user?.$id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.senderId === user?.$id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}>
                                <p className="text-sm">{message.message}</p>
                                <p className={`text-xs mt-1 ${
                                  message.senderId === user?.$id ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {formatTime(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                      
                      {/* Message Input */}
                      <div className="p-4 border-t">
                        <form onSubmit={sendMessage} className="flex space-x-2">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Message ${selectedEmployee.name}...`}
                            disabled={sending}
                            className="flex-1"
                          />
                          <Button type="submit" disabled={sending || !newMessage.trim()}>
                            {sending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Select an employee to start chatting</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};