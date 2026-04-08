import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/api';
import { Html5Qrcode } from 'html5-qrcode';
import { LogOut, QrCode, CheckCircle, Keyboard, AlertCircle } from 'lucide-react';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [sessionCode, setSessionCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scannerRef = useRef(null);
  const hasSubmittedScanRef = useRef(false);

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

  const submitAttendance = useCallback(async (code) => {
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
  }, []);

  useEffect(() => {
    const stopScanner = async () => {
      if (!scannerRef.current) return;

      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Failed to stop scanner', err);
      } finally {
        try {
          await scannerRef.current.clear();
        } catch (err) {
          console.error('Failed to clear scanner', err);
        }
        scannerRef.current = null;
      }
    };

    const startScanner = async () => {
      if (typeof window === 'undefined') return;

      if (
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setErrorMsg('Camera scanning requires HTTPS on mobile devices.');
        setStatus('error');
        return;
      }

      try {
        const scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;
        hasSubmittedScanRef.current = false;

        const cameras = await Html5Qrcode.getCameras();
        const rearCamera = cameras.find((camera) =>
          /back|rear|environment/iu.test(camera.label)
        );

        const cameraConfig = rearCamera
          ? { deviceId: { exact: rearCamera.id } }
          : { facingMode: 'environment' };

        await scanner.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (hasSubmittedScanRef.current) return;

            hasSubmittedScanRef.current = true;
            let parsedCode = decodedText;

            try {
              const data = JSON.parse(decodedText);
              if (data.sessionCode) {
                parsedCode = data.sessionCode;
              }
            } catch {
              parsedCode = decodedText;
            }

            try {
              await stopScanner();
            } finally {
              setSessionCode(parsedCode);
            }
          },
          () => {
            // Ignore normal frame decode failures while scanning.
          }
        );
      } catch (err) {
        console.error('Failed to start scanner', err);
        const message = /permission|notallowed|denied/iu.test(err?.message || '')
          ? 'Camera permission was denied. Please allow camera access and try again.'
          : 'Unable to access the camera. Use HTTPS on mobile and make sure another app is not using the camera.';
        setErrorMsg(message);
        setStatus('error');
      }
    };

    if (status === 'scanning') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [status]);

  // Handle API submission when code is acquired
  useEffect(() => {
    if (sessionCode) {
      submitAttendance(sessionCode);
    }
  }, [sessionCode, submitAttendance]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      submitAttendance(manualCode.trim());
    }
  };

  const resetScanner = () => {
    hasSubmittedScanRef.current = false;
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
                    <p className="mb-3 text-xs text-slate-400">
                      On mobile, allow camera access and point the rear camera at the QR code.
                    </p>
                    {/* The QR Reader Container div */}
                    <div id="reader" className="min-h-72 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950"></div>
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
    
      {/* Styling overrides for html5-qrcode's injected markup */}
      <style dangerouslySetInnerHTML={{__html: `
        #reader { border: 1px solid #1e293b !important; }
        #reader video { width: 100% !important; border-radius: 0.75rem; object-fit: cover; }
        #reader section { background: transparent !important; color: #cbd5e1 !important; }
        #reader__scan_region { min-height: 18rem; background: #020617 !important; }
        #reader__scan_region img { display: none !important; }
        #reader img[alt="Info icon"] { display: none !important; }
        #reader__dashboard { padding: 0.75rem 0 0 !important; }
        #reader__dashboard_section_csr span { color: #94a3b8 !important; font-family: inherit; }
        #reader__dashboard_section_swaplink { color: #38bdf8 !important; text-decoration: none; }
        #reader button,
        #reader select {
          border-radius: 0.75rem !important;
          border: 1px solid #334155 !important;
          background: #0f172a !important;
          color: white !important;
          padding: 0.625rem 0.875rem !important;
        }
      `}} />
    </div>
  );
}
