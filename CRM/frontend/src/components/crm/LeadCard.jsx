import React from 'react';
import { Phone, Calendar, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const LeadCard = ({ lead, onStatusChange, onEdit, onDelete }) => {
    const statusColors = {
        new: 'bg-blue-100 text-blue-800',
        contacted: 'bg-yellow-100 text-yellow-800',
        trial_lesson: 'bg-purple-100 text-purple-800',
        negotiation: 'bg-orange-100 text-orange-800',
        won: 'bg-green-100 text-green-800',
        lost: 'bg-red-100 text-red-800',
    };

    const statusLabels = {
        new: 'Yangi',
        contacted: 'Bog\'lanildi',
        trial_lesson: 'Sinov darsi',
        negotiation: 'Muzokara',
        won: 'Yutuq',
        lost: 'Yo\'qotildi',
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-3 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-800">{lead.first_name} {lead.last_name}</h4>
                <div className="relative group">
                    <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical size={16} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-100 hidden group-hover:block z-10">
                        <button onClick={() => onEdit(lead)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Edit2 size={14} /> Tahrirlash
                        </button>
                        <button onClick={() => onDelete(lead.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 size={14} /> O'chirish
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Phone size={14} />
                <a href={`tel:${lead.phone}`} className="hover:text-blue-600">{lead.phone}</a>
            </div>

            <div className="flex justify-between items-center mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[lead.status] || 'bg-gray-100'}`}>
                    {statusLabels[lead.status] || lead.status}
                </span>
                <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className="text-xs border rounded p-1 bg-gray-50 focus:outline-none focus:border-blue-500"
                >
                    {Object.entries(statusLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </div>

            <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={12} />
                {new Date(lead.created_at).toLocaleDateString()}
            </div>
        </div>
    );
};

export default LeadCard;
