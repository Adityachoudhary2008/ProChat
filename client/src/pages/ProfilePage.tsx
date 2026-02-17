import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Education {
    degree: string;
    institution: string;
    year: string;
}

interface Project {
    title: string;
    description: string;
    link?: string;
}

interface ProfileData {
    name: string;
    email: string;
    role: string;
    profile: {
        avatar?: string;
        bio?: string;
        skills: string[];
        education: Education[];
        projects: Project[];
    };
}

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Editable states
    const [bio, setBio] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [newSkill, setNewSkill] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/user/profile');
            setProfileData(data);
            setBio(data.profile?.bio || '');
            setSkills(data.profile?.skills || []);
            setLoading(false);
        } catch (error) {
            toast.error('Failed to load profile');
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.put('/user/profile', {
                profile: {
                    bio,
                    skills,
                    education: profileData?.profile?.education || [],
                    projects: profileData?.profile?.projects || []
                }
            });
            toast.success('Profile updated successfully!');
            setIsEditing(false);
            fetchProfile();
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    const addSkill = () => {
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill('');
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove));
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const { data: uploadPath } = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update profile with new avatar URL
            await api.put('/user/profile', {
                profile: {
                    ...profileData?.profile,
                    avatar: uploadPath,
                    bio,
                    skills
                }
            });

            toast.success('Photo updated!');
            fetchProfile();
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
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
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors font-medium"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setBio(profileData?.profile?.bio || '');
                                    setSkills(profileData?.profile?.skills || []);
                                }}
                                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-300 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                                {profileData?.profile?.avatar ? (
                                    <img
                                        src={`${import.meta.env.VITE_SERVER_URL || ''}${profileData.profile.avatar}`}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    profileData?.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <button
                                onClick={handleUploadClick}
                                disabled={uploading}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white"
                            >
                                {uploading ? '...' : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                    </svg>
                                )}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{profileData?.name}</h1>
                            <p className="text-slate-600 text-lg">{profileData?.email}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium capitalize">
                                {profileData?.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bio Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Bio</h2>
                    {isEditing ? (
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                            rows={4}
                        />
                    ) : (
                        <p className="text-slate-600 leading-relaxed">
                            {bio || 'No bio added yet. Click "Edit Profile" to add one.'}
                        </p>
                    )}
                </div>

                {/* Skills Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Skills</h2>
                    {isEditing && (
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                placeholder="Add a skill..."
                                className="flex-1 border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                            <button
                                onClick={addSkill}
                                className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {skills.length > 0 ? (
                            skills.map((skill, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full font-medium"
                                >
                                    {skill}
                                    {isEditing && (
                                        <button
                                            onClick={() => removeSkill(skill)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ×
                                        </button>
                                    )}
                                </span>
                            ))
                        ) : (
                            <p className="text-slate-400">No skills added yet.</p>
                        )}
                    </div>
                </div>

                {/* Education Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Education</h2>
                    {profileData?.profile?.education && profileData.profile.education.length > 0 ? (
                        <div className="space-y-4">
                            {profileData.profile.education.map((edu, idx) => (
                                <div key={idx} className="border-l-4 border-slate-900 pl-4">
                                    <h3 className="font-bold text-slate-900">{edu.degree}</h3>
                                    <p className="text-slate-600">{edu.institution}</p>
                                    <p className="text-slate-500 text-sm">{edu.year}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400">No education details added yet.</p>
                    )}
                </div>

                {/* Projects Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Projects</h2>
                    {profileData?.profile?.projects && profileData.profile.projects.length > 0 ? (
                        <div className="space-y-4">
                            {profileData.profile.projects.map((project, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-xl p-4">
                                    <h3 className="font-bold text-slate-900">{project.title}</h3>
                                    <p className="text-slate-600 mt-2">{project.description}</p>
                                    {project.link && (
                                        <a
                                            href={project.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-900 hover:underline mt-2 inline-block"
                                        >
                                            View Project →
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400">No projects added yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
