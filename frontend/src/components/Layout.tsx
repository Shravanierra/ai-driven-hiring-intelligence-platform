import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, Users, ListChecks, MessageSquare, ClipboardList, LogOut } from 'lucide-react';

const navItems = [
  { to: '/jobs',          label: 'Jobs',           Icon: BriefcaseBusiness },
  { to: '/candidates',    label: 'Candidates',     Icon: Users },
  { to: '/shortlist',     label: 'Shortlist',      Icon: ListChecks },
  { to: '/assistant',     label: 'Assistant',      Icon: MessageSquare },
  { to: '/interview-kits',label: 'Interview Kits', Icon: ClipboardList },
];

export default function Layout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-lg font-bold text-indigo-600">AI Hiring</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut size={16} strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
