import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect } from 'react';
import { LogOut, QrCode, CheckCircle, Keyboard, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [sessionCode, setSessionCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/student/attendance');
      if (res.data.success) {
        setAttendanceHistory(res.data.attendance);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    let scanner = null;

    if (status === 'scanning') {
      // Configuration for scanner
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1
      }, false);

      scanner.render(
        (decodedText) => {
          // Attempt to parse JSON payload {"sessionCode":"..."} from backend
          try {
            const data = JSON.parse(decodedText);
            if (data.sessionCode) {
              setSessionCode(data.sessionCode);
              scanner.clear(); // Stop scanning on success
            } else {
              throw new Error("Invalid QR code format");
            }
          } catch (e) {
            // Fallback just in case they used raw text
            setSessionCode(decodedText);
            scanner.clear();
          }
        },
        (error) => {
          // ignore scan noise
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
    };
  }, [status]);

  // Handle API submission when code is acquired
  useEffect(() => {
    if (sessionCode) {
      submitAttendance(sessionCode);
    }
  }, [sessionCode]);

  const submitAttendance = async (code) => {
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await api.post('/student/attend', { sessionCode: code });
      if (res.data.success) {
        setStatus('success');
        fetchHistory(); // refresh the history list
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to mark attendance');
      setStatus('error');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      submitAttendance(manualCode.trim());
    }
  };

  const resetScanner = () => {
    setSessionCode('');
    setManualCode('');
    setErrorMsg('');
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center">
      <header className="mb-12 w-full max-w-2xl flex items-center justify-between rounded-2xl bg-slate-900/80 p-4 shadow-lg ring-1 ring-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20 text-primary-500">
            <span className="text-xl font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Student Dashboard</h1>
            <p className="text-sm text-slate-400">{user?.enrollmentNumber}</p>
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

      <div className="w-full max-w-md">
        {status === 'success' && (
          <div className="text-center rounded-3xl bg-slate-900/50 border border-emerald-500/20 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Attendance Marked!</h2>
            <p className="text-slate-400 mb-8">You have successfully checked in to the class.</p>
            <button
              onClick={resetScanner}
              className="w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              Mark Another
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center rounded-3xl bg-slate-900/50 border border-red-500/20 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 text-red-500 ring-2 ring-red-500/40">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check-in Failed</h2>
            <p className="text-red-400 mb-8">{errorMsg}</p>
            <button
              onClick={resetScanner}
              className="w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {(status === 'idle' || status === 'scanning') && (
          <div className="rounded-3xl bg-slate-900/50 border border-slate-800 p-8 shadow-2xl backdrop-blur-xl">
            
            {status === 'idle' ? (
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/20">
                  <QrCode className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Mark Attendance</h2>
                <p className="text-slate-400 mb-6 text-sm">Scan the QR code displayed by your faculty to mark your presence.</p>
                <button
                  onClick={() => setStatus('scanning')}
                  className="w-full flex justify-center items-center gap-2 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary-500 transition shadow-primary-600/20"
                >
                  <QrCode className="h-4 w-4" />
                  Open Scanner
                </button>
              </div>
            ) : (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-white">Scan QR Code</h3>
                        <button onClick={() => setStatus('idle')} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                    </div>
                    {/* The QR Reader Container div */}
                    <div id="reader" className="w-full !rounded-xl overflow-hidden [&>*]:!border-0 bg-slate-950"></div>
                </div>
            )}

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-800"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950 px-2 text-slate-500 rounded-full border border-slate-800">Or use code</span>
              </div>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Keyboard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter session code"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        )}

        {/* History Section */}
        <div className="mt-8 rounded-3xl bg-slate-900/50 border border-slate-800 p-6 shadow-2xl backdrop-blur-xl w-full">
          <h3 className="text-lg font-bold text-white mb-4">Recent Attendance (48hrs)</h3>
          
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
            </div>
          ) : attendanceHistory.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">No recent attendance records found.</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {attendanceHistory.map(record => (
                <div key={record._id} className="rounded-xl border border-slate-800/80 bg-slate-800/20 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-white text-sm">
                        {record.sessionId?.course} - {record.sessionId?.subject}
                      </p>
                      <p className="text-xs text-slate-400">
                        {record.sessionId?.facultyId?.name ? `Prof. ${record.sessionId?.facultyId?.name}` : 'Faculty Session'}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
                      <CheckCircle className="h-3 w-3" />
                      Present
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <AlertCircle className="mr-1 h-3 w-3 opacity-50" />
                    Marked at: {new Date(record.attendedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    
      {/* Dirty styling overrides for html5-qrcode standard messy UI overlaying standard text and buttons */}
      <style dangerouslySetInnerHTML={{__html: `
        #reader { border: 1px solid #1e293b !important; }
        #reader img[alt="Info icon"] { display: none !important; }
        #reader__dashboard_section_csr span { color: #94a3b8 !important; font-family: Inter, sans-serif; }
        #reader__dashboard_section_swaplink { color: #6366f1 !important; text-decoration: none; }
        #html5-qrcode-button-camera-permission { background-color: #6366f1 !important; color: white !important; border: none; border-radius: 0.5rem; padding: 0.5rem 1rem; font-family: Inter; cursor: pointer; margin-top: 1rem; }
        #html5-qrcode-button-camera-stop { background-color: #ef4444 !important; color: white !important; border: none; border-radius: 0.5rem; padding: 0.5rem 1rem; font-family: Inter; cursor: pointer; margin-top: 1rem; }
      `}} />
    </div>
  );
}
