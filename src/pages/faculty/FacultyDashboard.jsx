import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/api';
import socketService from '../../lib/socket';
import { LogOut, Play, Users, CheckCircle, Clock, Trash2, Expand, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  
  const [course, setCourse] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState(10);
  
  const [session, setSession] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  const [pastSessions, setPastSessions] = useState([]);

  const pushToast = (message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((currentToasts) => [...currentToasts, { id, message }]);
  };

  const fetchPastSessions = async () => {
    try {
      const res = await api.get('/faculty/sessions');
      if (res.data.success) {
        setPastSessions(res.data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch past sessions', err);
    }
  };

  // Fetch past sessions initially
  useEffect(() => {
    fetchPastSessions();
  }, []);

  // Join faculty room as soon as the socket is ready so backend can target us
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !user?._id) return;

    // Tell the server which faculty room we belong to
    socket.emit('faculty:join', { facultyId: user._id });

    // Handle re-connections (e.g. page refresh mid-session)
    socket.on('connect', () => {
      socket.emit('faculty:join', { facultyId: user._id });
    });

    return () => {
      socket.off('connect');
    };
  }, [user]);

  // Socket listener for real-time attendance updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !session) return;

    const handleAttendanceMarked = (event) => {
      if (event.sessionId !== session._id || !event.attendance) return;

      setAttendance((currentAttendance) => {
        const alreadyExists = currentAttendance.some(
          (record) => record._id === event.attendance._id || record.studentId?._id === event.attendance.studentId?._id
        );

        if (alreadyExists) {
          return currentAttendance.map((record) =>
            record._id === event.attendance._id || record.studentId?._id === event.attendance.studentId?._id
              ? event.attendance
              : record
          );
        }

        return [event.attendance, ...currentAttendance];
      });

      setPastSessions((currentSessions) =>
        currentSessions.map((pastSession) =>
          pastSession._id === event.sessionId
            ? {
                ...pastSession,
                attendanceCount: Math.max(
                  pastSession.attendanceCount || 0,
                  (event.attendanceCount ?? (pastSession.attendanceCount || 0) + 1)
                ),
              }
            : pastSession
        )
      );

      pushToast(event.message || `${event.attendance.studentId?.name || 'Student'} attendance has been marked`);
    };

    socket.on('attendance:marked', handleAttendanceMarked);

    return () => {
      socket.off('attendance:marked', handleAttendanceMarked);
    };
  }, [session]);

  useEffect(() => {
    if (toasts.length === 0) return undefined;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((currentToasts) => currentToasts.filter((item) => item.id !== toast.id));
      }, 3200)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  const fetchAttendance = async (sessionId) => {
    try {
      const res = await api.get(`/faculty/session/${sessionId}/attendance`);
      if (res.data.success) {
        setAttendance(res.data.attendance);
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/faculty/session', {
        course,
        subject,
        durationMinutes: duration,
      });

      if (res.data.success) {
        const newSession = res.data.session;
        setSession(newSession);
        setQrCodeDataUrl(res.data.qrCodeDataUrl);
        setAttendance([]); // reset
        fetchAttendance(newSession._id); // initial fetch

        fetchPastSessions(); // update the list

        // Join the specific session room so we receive events via that channel too
        const socket = socketService.getSocket();
        if (socket) {
          socket.emit('session:join', { sessionId: newSession._id });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSession = (pastSession) => {
    setSession(pastSession);
    setQrCodeDataUrl(''); // Or regenerate if needed, but best not to show QR for old sessions
    setIsQrExpanded(false);
    setAttendance([]);
    fetchAttendance(pastSession._id);
  };

  const handleDeleteSession = async (sessionToDelete) => {
    const confirmed = window.confirm(
      `Delete the session for ${sessionToDelete.course} - ${sessionToDelete.subject}? This will also remove its attendance records.`
    );

    if (!confirmed) return;

    setDeletingSessionId(sessionToDelete._id);
    setError('');

    try {
      const res = await api.delete(`/faculty/session/${sessionToDelete._id}`);

      if (res.data.success) {
        setPastSessions((currentSessions) =>
          currentSessions.filter((pastSession) => pastSession._id !== sessionToDelete._id)
        );

        if (session?._id === sessionToDelete._id) {
          setSession(null);
          setQrCodeDataUrl('');
          setIsQrExpanded(false);
          setAttendance([]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete session');
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl border border-emerald-500/20 bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-2xl ring-1 ring-emerald-500/10 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-500/15 p-1 text-emerald-400">
                <CheckCircle className="h-4 w-4" />
              </div>
              <p className="leading-5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {isQrExpanded && qrCodeDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl ring-1 ring-slate-700/50">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400"></span>
                <span className="h-3 w-3 rounded-full bg-amber-400"></span>
                <span className="h-3 w-3 rounded-full bg-emerald-400"></span>
              </div>
              <button
                type="button"
                onClick={() => setIsQrExpanded(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>

            <div className="flex min-h-[70vh] items-center justify-center bg-slate-100 p-6 sm:p-10">
              <img
                src={qrCodeDataUrl}
                alt="Expanded attendance QR code"
                className="h-auto max-h-[60vh] w-full max-w-[560px] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <header className="mb-8 flex items-center justify-between rounded-2xl bg-slate-900/80 p-4 shadow-lg ring-1 ring-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20 text-primary-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Faculty Dashboard</h1>
            <p className="text-sm text-slate-400">Welcome, {user?.name}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column - Create Session Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-white">
              <Play className="h-5 w-5 text-primary-500" />
              New Attendance Session
            </h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Course Name</label>
                <input
                  type="text"
                  required
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g., CS 101"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-white placeholder-slate-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Data Structures"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-white placeholder-slate-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-white placeholder-slate-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "mt-2 w-full rounded-xl bg-primary-600 p-3 text-sm font-semibold text-white transition-all hover:bg-primary-500",
                  isLoading && "opacity-70 cursor-not-allowed"
                )}
              >
                {isLoading ? 'Creating...' : 'Start Session'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">Recent Sessions (48hrs)</h2>
            {pastSessions.length === 0 ? (
              <p className="text-sm text-slate-500">No recent sessions found.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {pastSessions.map((ps) => {
                  const isExpired = new Date() > new Date(ps.expiresAt);
                  return (
                    <div 
                      key={ps._id} 
                      onClick={() => handleViewSession(ps)}
                      className={cn(
                        "cursor-pointer rounded-xl border border-slate-800/80 bg-slate-800/20 p-4 transition-colors hover:bg-slate-800/50",
                        session?._id === ps._id && "border-primary-500/50 bg-slate-800/60"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-semibold text-white text-sm truncate">
                            {ps.course} - {ps.subject}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ps.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                            !isExpired ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" : "bg-slate-500/10 text-slate-400 ring-slate-500/20"
                          )}>
                            {!isExpired ? 'Active' : 'Closed'}
                          </span>
                          <span className="text-xs text-primary-400 font-medium">
                            {ps.attendanceCount} records
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(ps);
                          }}
                          disabled={deletingSessionId === ps._id}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20",
                            deletingSessionId === ps._id && "cursor-not-allowed opacity-70"
                          )}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingSessionId === ps._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - QR Code & Live Attendance */}
        <div className="lg:col-span-8 space-y-6">
          {session ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-sm text-center">
                
                {qrCodeDataUrl ? (
                  <>
                    <div className="mb-2 flex w-full items-center justify-between gap-3">
                      <h3 className="text-xl font-bold text-white">Scan to Attend</h3>
                      <button
                        type="button"
                        onClick={() => setIsQrExpanded(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                      >
                        <Expand className="h-4 w-4" />
                        Maximize
                      </button>
                    </div>
                    <p className="mb-6 text-sm text-slate-400">Instruct students to scan this code.</p>
                    
                    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <img src={qrCodeDataUrl} alt="Attendance QR Code" className="h-48 w-48 object-contain" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                     <Clock className="h-12 w-12 mb-4 opacity-30" />
                     <h3 className="text-lg font-medium text-slate-400">Past Session</h3>
                     <p className="text-sm mt-2">QR Code is no longer available.</p>
                  </div>
                )}

                <div className="mt-6 w-full rounded-xl bg-slate-950 p-4 ring-1 ring-slate-800">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Session Code</p>
                  <p className="text-lg font-mono text-primary-400 tracking-widest">{session.sessionCode}</p>
                </div>
              </div>

              <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    Live Attendance
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                    {attendance.length} Present
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 max-h-[300px] space-y-3">
                  {attendance.length > 0 ? (
                    attendance.map((record) => (
                      <div key={record._id} className="flex items-center gap-3 rounded-xl bg-slate-800/40 p-3 ring-1 ring-slate-700/50">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-primary-500">
                          {record.studentId?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-white">{record.studentId?.name}</p>
                          <p className="truncate text-xs text-slate-400">{record.studentId?.enrollmentNumber}</p>
                        </div>
                        <div className="flex items-center text-xs text-slate-500 gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(record.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 py-10">
                      <Clock className="mb-2 h-8 w-8 opacity-20" />
                      <p>Waiting for students to join...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-800 border-dashed bg-slate-900/20 p-8 text-center text-slate-500 backdrop-blur-sm">
              <Play className="mb-4 h-12 w-12 text-slate-700" />
              <h3 className="mb-1 text-lg font-medium text-slate-400">No Active Session</h3>
              <p className="text-sm">Create a session on the left to start taking attendance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
