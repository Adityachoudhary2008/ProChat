import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

interface SettingsData {
    privacy: {
        showLastSeen: boolean;
        showProfilePhoto: boolean;
        showOnlineStatus: boolean;
    };
    notifications: {
        messageNotifications: boolean;
        callNotifications: boolean;
        emailNotifications: boolean;
    };
    appearance: {
        theme: 'light' | 'dark' | 'auto';
        language: string;
    };
}

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<SettingsData>({
        privacy: {
            showLastSeen: true,
            showProfilePhoto: true,
            showOnlineStatus: true
        },
        notifications: {
            messageNotifications: true,
            callNotifications: true,
            emailNotifications: false
        },
        appearance: {
            theme: 'light',
            language: 'en'
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/user/settings');
            if (data.settings) {
                setSettings(data.settings);
            }
            setLoading(false);
        } catch (error) {
            console.log('Using default settings');
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.put('/user/settings', { settings });
            toast.success('Settings saved successfully!');
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    const updateSetting = (category: keyof SettingsData, key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/chats')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        Back to Chats
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                    >
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Settings Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

                {/* Privacy Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Privacy</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Show Last Seen</h3>
                                <p className="text-sm text-slate-600">Let others see when you were last active</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.privacy.showLastSeen}
                                    onChange={(e) => updateSetting('privacy', 'showLastSeen', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Show Profile Photo</h3>
                                <p className="text-sm text-slate-600">Display your profile photo to others</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.privacy.showProfilePhoto}
                                    onChange={(e) => updateSetting('privacy', 'showProfilePhoto', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Show Online Status</h3>
                                <p className="text-sm text-slate-600">Let others see when you're online</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.privacy.showOnlineStatus}
                                    onChange={(e) => updateSetting('privacy', 'showOnlineStatus', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Notifications</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Message Notifications</h3>
                                <p className="text-sm text-slate-600">Receive notifications for new messages</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.messageNotifications}
                                    onChange={(e) => updateSetting('notifications', 'messageNotifications', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Call Notifications</h3>
                                <p className="text-sm text-slate-600">Receive notifications for incoming calls</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.callNotifications}
                                    onChange={(e) => updateSetting('notifications', 'callNotifications', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-slate-900">Email Notifications</h3>
                                <p className="text-sm text-slate-600">Receive email notifications for important updates</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.emailNotifications}
                                    onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Appearance Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Appearance</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block font-medium text-slate-900 mb-3">Theme</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['light', 'dark', 'auto'] as const).map((theme) => (
                                    <button
                                        key={theme}
                                        onClick={() => updateSetting('appearance', 'theme', theme)}
                                        className={`px-4 py-3 rounded-xl border-2 transition-all capitalize ${settings.appearance.theme === theme
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        {theme}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block font-medium text-slate-900 mb-3">Language</label>
                            <select
                                value={settings.appearance.language}
                                onChange={(e) => updateSetting('appearance', 'language', e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                                <option value="en">English</option>
                                <option value="hi">हिन्दी (Hindi)</option>
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
