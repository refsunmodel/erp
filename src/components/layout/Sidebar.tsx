import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  TrendingUp,
  MessageCircle,
  Bot,
  Calendar,
  DollarSign,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const menuItems = {
  Admin: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Employees', href: '/employees', icon: Users },
    { title: 'Tasks', href: '/tasks', icon: CheckSquare },
    { title: 'Attendance', href: '/attendance', icon: Calendar },
    { title: 'Stats & Trends', href: '/stats', icon: TrendingUp },
    { title: 'Chat', href: '/chat', icon: MessageCircle },
  ],
  Manager: [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    // { title: 'Employees', href: '/employees', icon: Users },
    { title: 'Tasks', href: '/tasks', icon: CheckSquare },
    { title: 'Attendance', href: '/attendance', icon: Calendar },
    { title: 'Stats & Trends', href: '/stats', icon: TrendingUp },
    { title: 'Chat', href: '/chat', icon: MessageCircle },
    { title: 'Salary Info', href: '/salary', icon: DollarSign },

  ],
  'Graphic Designer': [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Tasks', href: '/tasks', icon: CheckSquare },
    { title: 'Salary Info', href: '/salary', icon: DollarSign },
    { title: 'Chat', href: '/chat', icon: MessageCircle },
  ],
  'Printing Technician': [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Tasks', href: '/tasks', icon: CheckSquare },
    { title: 'Salary Info', href: '/salary', icon: DollarSign },
    { title: 'Chat', href: '/chat', icon: MessageCircle },
  ],
  'Delivery Supervisor': [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Tasks', href: '/tasks', icon: CheckSquare },
    { title: 'Salary Info', href: '/salary', icon: DollarSign },
    { title: 'Chat', href: '/chat', icon: MessageCircle },
  ],
};

const placeholderItems = [
  { title: 'AI Assistant', icon: Bot, placeholder: true },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const userMenuItems = menuItems[user.role as keyof typeof menuItems] || [];

  const handlePlaceholderClick = (title: string) => {
    alert(`${title} - Coming Soon...`);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 z-40 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out',
          'w-64 max-w-full md:w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b px-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Edgesync ERP</h1>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="space-y-1">
              {userMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)} // Close mobile menu on navigation
                    className={cn(
                      'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
              
              <Separator className="my-4" />
              
              {/* Placeholder Items */}
              {placeholderItems.map((item) => {
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.title}
                    onClick={() => handlePlaceholderClick(item.title)}
                    className="flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 flex-shrink-0"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};