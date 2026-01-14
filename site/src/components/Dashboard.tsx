import { useState, useEffect } from 'react';
import { authService, User } from '../services/auth';
import { apiService } from '../services/api';

interface DashboardProps {
    onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const [user, setUser] = useState<User | null>(null);
    const [hashKey, setHashKey] = useState('');
    const [rangeKey, setRangeKey] = useState('');
    const [data, setData] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
    };

    const handleLogout = async () => {
        try {
            await authService.signOut();
            onLogout();
        } catch (err: any) {
            setError(err.message || 'Failed to sign out');
        }
    };

    const handleAddRecord = async () => {
        if (!hashKey || !rangeKey) {
            setError('Hash key and range key are required');
            return;
        }

        setError('');
        setMessage('');
        setLoading(true);

        try {
            const record: any = {
                hashKey,
                rangeKey,
            };

            if (data) {
                try {
                    record.data = JSON.parse(data);
                } catch {
                    record.data = { value: data };
                }
            }

            await apiService.addRecord(record);
            setMessage('Record added successfully!');
            setHashKey('');
            setRangeKey('');
            setData('');
        } catch (err: any) {
            setError(err.message || 'Failed to add record');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRecord = async () => {
        if (!hashKey || !rangeKey) {
            setError('Hash key and range key are required');
            return;
        }

        setError('');
        setMessage('');
        setLoading(true);

        try {
            await apiService.deleteRecord(hashKey, rangeKey);
            setMessage('Record deleted successfully!');
            setHashKey('');
            setRangeKey('');
            setData('');
        } catch (err: any) {
            setError(err.message || 'Failed to delete record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Demo Dashboard</h1>
                            {user && (
                                <div className="mt-1 text-sm text-gray-600">
                                    <span className="font-medium">{user.name || user.username}</span>
                                    {user.email && <span className="ml-2">({user.email})</span>}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        DynamoDB Operations
                    </h2>

                    {message && (
                        <div className="mb-4 rounded-md bg-green-50 p-4">
                            <div className="text-sm text-green-800">{message}</div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-800">{error}</div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="hashKey" className="block text-sm font-medium text-gray-700">
                                Hash Key (DemoHashKey)
                            </label>
                            <input
                                type="text"
                                id="hashKey"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter hash key"
                                value={hashKey}
                                onChange={(e) => setHashKey(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="rangeKey" className="block text-sm font-medium text-gray-700">
                                Range Key (DemoRangeKey)
                            </label>
                            <input
                                type="text"
                                id="rangeKey"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="Enter range key"
                                value={rangeKey}
                                onChange={(e) => setRangeKey(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="data" className="block text-sm font-medium text-gray-700">
                                Additional Data (JSON or text)
                            </label>
                            <textarea
                                id="data"
                                rows={3}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder='{"key": "value"} or simple text'
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                            />
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={handleAddRecord}
                                disabled={loading}
                                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                            >
                                {loading ? 'Processing...' : 'Add Record'}
                            </button>

                            <button
                                onClick={handleDeleteRecord}
                                disabled={loading}
                                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400"
                            >
                                {loading ? 'Processing...' : 'Delete Record'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
