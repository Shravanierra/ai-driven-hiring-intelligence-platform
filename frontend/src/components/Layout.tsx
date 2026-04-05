import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, Users, ListChecks, MessageSquare, ClipboardList, LogOut } from 'lucide-react';
import loginBg from '../assets/login-bg.svg';

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
    <div
      className="flex min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <aside className="w-56 bg-white/10 backdrop-blur-md border-r border-white/10 flex flex-col">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-lg font-bold text-white">AI Hiring</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-indigo-300 hover:bg-white/10 hover:text-white"
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
