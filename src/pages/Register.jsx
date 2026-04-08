import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserPlus, Mail, Lock, User, Hash, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    enrollmentNumber: '',
    department: '',
    employeeId: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate(`/${user.role}`, { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      };

      if (formData.role === 'student') {
        payload.enrollmentNumber = formData.enrollmentNumber;
      } else {
        payload.department = formData.department;
        payload.employeeId = formData.employeeId;
      }

      const data = await register(payload);
      navigate(`/${data.user.role}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/20">
            <UserPlus className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Create an account</h2>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex rounded-xl bg-slate-800/50 p-1 ring-1 ring-slate-700">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                formData.role === 'student' ? "bg-primary-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
              onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
            >
              Student
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
                formData.role === 'faculty' ? "bg-primary-600 text-white shadow" : "text-slate-400 hover:text-white"
              )}
              onClick={() => setFormData(prev => ({ ...prev, role: 'faculty' }))}
            >
              Faculty
            </button>
          </div>

          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-400 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Full Name"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-400 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Email Address"
              />
            </div>
          </div>
          
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-400 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Password"
              />
            </div>
          </div>

          {formData.role === 'student' && (
            <div>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  name="enrollmentNumber"
                  required
                  value={formData.enrollmentNumber}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-400 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Enrollment Number"
                />
              </div>
            </div>
          )}

          {formData.role === 'faculty' && (
            <>
              <div>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-400 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="Department"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="employeeId"
                    required
                    value={formData.employeeId}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-4 text-white placeholder-slate-400 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="Employee ID"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "mt-2 group relative flex w-full justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
              isSubmitting && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
