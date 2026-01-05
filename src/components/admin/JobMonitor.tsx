'use client';

import { useState } from 'react';
import { cleanUpStaleJobsAction } from '@/app/dashboard/admin/actions';

export default function JobMonitor() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ count: number; message: string } | null>(null);

    const handleCleanup = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await cleanUpStaleJobsAction();
            if (res.success) {
                setResult({ 
                    count: res.count, 
                    message: res.count > 0 ? `Successfully recovered ${res.count} stale jobs.` : 'No stale jobs found.'
                });
            } else {
                setResult({ count: 0, message: `Error: ${res.error}` });
            }
        } catch (e) {
            setResult({ count: 0, message: 'Unexpected error.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
             <div className="mb-4 flex items-center justify-between">
                <div>
                     <h3 className="text-lg font-semibold text-slate-900">System Health & Jobs</h3>
                     <p className="text-sm text-slate-500">Monitor and recover stalled background jobs.</p>
                </div>
                <button
                    onClick={handleCleanup}
                    disabled={loading}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400"
                >
                    {loading ? (
                        <>
                            <svg className="mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Checking...
                        </>
                    ) : (
                        'Check Stale Jobs'
                    )}
                </button>
             </div>
             
             {result && (
                <div className={`mt-2 rounded-md p-3 text-sm ${
                    result.message.startsWith('Error') 
                        ? 'bg-red-50 text-red-700' 
                        : result.count > 0 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-slate-50 text-slate-700'
                }`}>
                    {result.message}
                </div>
             )}
        </div>
    );
}
