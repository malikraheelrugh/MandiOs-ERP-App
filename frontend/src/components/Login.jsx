import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Shield, Key, Mail, UserCheck, Sun, Moon, Hash, Users, Crown, ShoppingBag, Sprout } from 'lucide-react';
import SpokeSpinner from './common/SpokeSpinner.jsx';

export default function Login() {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isKhataRole = role === 'Customer' || role === 'Supplier';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(identifier.trim(), password, role);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative transition-colors duration-200">
      
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button 
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] text-slate-700 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all shadow-sm"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-white dark:bg-[#1E293B] rounded-3xl shadow-xl border border-emerald-500/20 ring-4 ring-emerald-500/10 flex items-center justify-center">
            <img 
              src="/mandi_logo.jpg" 
              alt="Mandi OS Logo" 
              referrerPolicy="no-referrer"
              className="h-16 w-16 object-contain rounded-2xl" 
            />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white font-display uppercase">
          {t("Mandi Broker Management")}
        </h2>
        <p className="mt-1.5 text-center text-xs text-[#64748B] dark:text-slate-400 font-medium text-wrap">
          {t("Sabzi & Fruit Commission Trade Engine")}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#1E293B] py-8 px-4 border border-[#E2E8F0] dark:border-slate-800 shadow-xl rounded-3xl sm:px-10">
          <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            {/* 3 Small Active Role Cards (Upper to Email / Khata ID) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-[#475569] dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                  {t("Select System Role")}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {role === 'Admin' && '👑 Business Owner'}
                  {role === 'Clerk' && '📝 Desk Operator'}
                  {role === 'Customer' && '🛒 Buyer Khata'}
                  {role === 'Supplier' && '🌾 Farmer Khata'}
                  {role === 'super_admin' && '⚡ Master Super Admin'}
                </span>
              </div>

              {/* Three Small Role Cards */}
              <div className="grid grid-cols-3 gap-2">
                {/* Card 1: Admin */}
                <button
                  type="button"
                  onClick={() => {
                    setRole('Admin');
                    setIdentifier('');
                  }}
                  className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                    role === 'Admin'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-sm'
                      : 'bg-[#F8FAFC] dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl mb-1 transition-colors ${
                    role === 'Admin'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500'
                  }`}>
                    <Shield size={16} />
                  </div>
                  <span className="font-bold text-[11px] leading-tight">
                    {t("Admin")}
                  </span>
                  <span className="text-[9px] opacity-75 font-medium mt-0.5">
                    Arthi / Owner
                  </span>
                </button>

                {/* Card 2: Clerk */}
                <button
                  type="button"
                  onClick={() => {
                    setRole('Clerk');
                    setIdentifier('');
                  }}
                  className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                    role === 'Clerk'
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30 shadow-sm'
                      : 'bg-[#F8FAFC] dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl mb-1 transition-colors ${
                    role === 'Clerk'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-500'
                  }`}>
                    <UserCheck size={16} />
                  </div>
                  <span className="font-bold text-[11px] leading-tight">
                    {t("Clerk")}
                  </span>
                  <span className="text-[9px] opacity-75 font-medium mt-0.5">
                    Desk Operator
                  </span>
                </button>

                {/* Card 3: Khata Party */}
                <button
                  type="button"
                  onClick={() => {
                    if (role !== 'Customer' && role !== 'Supplier') {
                      setRole('Customer');
                    }
                    setIdentifier('');
                  }}
                  className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer text-center group ${
                    isKhataRole
                      ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/30 shadow-sm'
                      : 'bg-[#F8FAFC] dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl mb-1 transition-colors ${
                    isKhataRole
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-amber-500'
                  }`}>
                    <Users size={16} />
                  </div>
                  <span className="font-bold text-[11px] leading-tight">
                    {t("Khata Party")}
                  </span>
                  <span className="text-[9px] opacity-75 font-medium mt-0.5">
                    {role === 'Supplier' ? 'Supplier' : 'Customer'}
                  </span>
                </button>
              </div>

              {/* Sub-selector pills if Khata Party card is active */}
              {isKhataRole && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1.5 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setRole('Customer');
                      setIdentifier('');
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'Customer'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/30'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <ShoppingBag size={12} />
                    <span>Customer (Buyer)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole('Supplier');
                      setIdentifier('');
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      role === 'Supplier'
                        ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-500/30'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sprout size={12} />
                    <span>Supplier (Farmer)</span>
                  </button>
                </div>
              )}

              {/* Super Admin indicator badge if super_admin is active */}
              {role === 'super_admin' && (
                <div className="flex items-center justify-between bg-purple-500/10 border border-purple-400/40 rounded-xl p-2 px-3 text-purple-700 dark:text-purple-300 text-xs">
                  <div className="flex items-center gap-2">
                    <Crown size={14} className="text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-[11px]">Super Admin Master Portal</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRole('Admin')}
                    className="text-[10px] underline font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 cursor-pointer"
                  >
                    Switch to Business
                  </button>
                </div>
              )}
            </div>

            {/* Identifier Field (Email for Staff / Khata ID for Parties) */}
            <div className="space-y-1">
              <label className="block text-[#475569] dark:text-slate-300 font-bold uppercase tracking-wider flex items-center justify-between text-[11px]">
                <span>{isKhataRole ? t("Khata ID (Required)") : t("Email Address (Required)")}</span>
                {isKhataRole && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-normal normal-case">
                    Format: {role === 'Customer' ? 'ARTHI-C-#' : 'ARTHI-S-#'}
                  </span>
                )}
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {isKhataRole ? <Hash size={16} className="text-emerald-500" /> : <Mail size={16} />}
                </div>
                <input
                  required
                  type={isKhataRole ? "text" : "email"}
                  value={identifier}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIdentifier(isKhataRole ? val.toUpperCase() : val);
                    if (val.trim().toLowerCase().includes('superadmin')) {
                      setRole('super_admin');
                    }
                  }}
                  placeholder={
                    role === 'Customer' ? 'e.g. SFM-C-1' :
                    role === 'Supplier' ? 'e.g. SFM-S-1' :
                    role === 'super_admin' ? 'e.g. superadmin@mandios.com' :
                    'e.g. admin@mandi.com'
                  }
                  className={`block w-full pl-10 pr-4 py-3 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-slate-800 rounded-xl outline-none text-[#1E293B] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all text-xs ${
                    isKhataRole ? 'font-mono font-bold tracking-wider uppercase' : 'font-medium'
                  }`}
                />
              </div>
              {isKhataRole && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Customer & Supplier accounts must log in with their assigned Khata ID.
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="block text-[#475569] dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                {t("Password Key")}
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key size={16} />
                </div>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-slate-800 rounded-xl outline-none text-[#1E293B] dark:text-slate-100 placeholder:text-slate-400 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all text-xs"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-xs font-black uppercase tracking-widest text-white bg-[#4F46E5] hover:bg-[#4338CA] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <SpokeSpinner size={16} color="#FFFFFF" />
                    <span>{t("Authenticating Trade Access...")}</span>
                  </>
                ) : (
                  <span>{t("Sign In To Mandi")}</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick info credentials */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">{t("Click Demo Credentials to Auto-fill:")}</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2.5 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
              <button
                type="button"
                onClick={() => {
                  setIdentifier('superadmin@mandios.com');
                  setPassword('super123');
                  setRole('super_admin');
                }}
                className="bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all text-left cursor-pointer"
              >
                <p className="font-bold text-indigo-600 dark:text-indigo-400">SUPER ADMIN</p>
                <p className="mt-0.5 truncate text-[9px] text-slate-600 dark:text-slate-300">superadmin@mandios.com</p>
                <p className="mt-0.5 text-slate-400 font-medium">super123</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier('admin@mandi.com');
                  setPassword('admin123');
                  setRole('Admin');
                }}
                className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-all text-left cursor-pointer"
              >
                <p className="font-bold text-slate-600 dark:text-slate-300">BUSINESS ADMIN</p>
                <p className="mt-0.5 truncate text-[9px] text-slate-600 dark:text-slate-300">admin@mandi.com</p>
                <p className="mt-0.5 text-slate-400 font-medium">admin123</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier('clerk@mandi.com');
                  setPassword('clerk123');
                  setRole('Clerk');
                }}
                className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-all text-left cursor-pointer"
              >
                <p className="font-bold text-slate-600 dark:text-slate-300">MANDI CLERK</p>
                <p className="mt-0.5 truncate text-[9px] text-slate-600 dark:text-slate-300">clerk@mandi.com</p>
                <p className="mt-0.5 text-slate-400 font-medium">clerk123</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier('SFM-C-1');
                  setPassword('customer123');
                  setRole('Customer');
                }}
                className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 p-2 rounded-xl border border-blue-200 dark:border-blue-800 transition-all text-left cursor-pointer"
              >
                <p className="font-bold text-blue-600 dark:text-blue-400">CUSTOMER (KHATA)</p>
                <p className="mt-0.5 font-mono text-[9px] text-blue-600 dark:text-blue-300 font-bold">SFM-C-1</p>
                <p className="mt-0.5 text-slate-400 font-medium">customer123</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIdentifier('SFM-S-1');
                  setPassword('supplier123');
                  setRole('Supplier');
                }}
                className="bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 p-2 rounded-xl border border-purple-200 dark:border-purple-800 transition-all text-left cursor-pointer col-span-2 sm:col-span-1"
              >
                <p className="font-bold text-purple-600 dark:text-purple-400">SUPPLIER (KHATA)</p>
                <p className="mt-0.5 font-mono text-[9px] text-purple-600 dark:text-purple-300 font-bold">SFM-S-1</p>
                <p className="mt-0.5 text-slate-400 font-medium">supplier123</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


