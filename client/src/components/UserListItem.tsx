import React from 'react';

interface UserListItemProps {
    user: any;
    handleFunction: () => void;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, handleFunction }) => {
    return (
        <div
            onClick={handleFunction}
            className="cursor-pointer bg-slate-100 hover:bg-slate-200 w-full flex items-center text-slate-900 px-3 py-2 mb-2 rounded-lg transition-colors"
        >
            <div className="mr-2 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-sm font-bold">
                    {user.name.charAt(0)}
                </div>
            </div>
            <div>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-slate-600">
                    <b>Email: </b>
                    {user.email}
                </p>
            </div>
        </div>
    );
};

export default UserListItem;
