import React from 'react';
import LeadCard from './LeadCard';

const CRMBoard = ({ leads, onStatusChange, onEdit, onDelete }) => {
    const columns = [
        { id: 'new', title: 'Yangi', color: 'border-blue-500' },
        { id: 'contacted', title: 'Bog\'lanildi', color: 'border-yellow-500' },
        { id: 'trial_lesson', title: 'Sinov Darsi', color: 'border-purple-500' },
        { id: 'negotiation', title: 'Muzokara', color: 'border-orange-500' },
        { id: 'won', title: 'Yutuq (O\'quvchi)', color: 'border-green-500' },
        { id: 'lost', title: 'Yo\'qotildi', color: 'border-red-500' },
    ];

    const getLeadsByStatus = (status) => {
        return leads.filter(lead => lead.status === status);
    };

    return (
        <div className="flex overflow-x-auto pb-4 gap-4 h-full min-h-[500px]">
            {columns.map(column => (
                <div key={column.id} className="min-w-[280px] flex-shrink-0 bg-gray-50 rounded-lg p-3 h-full flex flex-col">
                    <div className={`font-bold text-gray-700 mb-3 pb-2 border-b-2 ${column.color} flex justify-between`}>
                        <span>{column.title}</span>
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                            {getLeadsByStatus(column.id).length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                        {getLeadsByStatus(column.id).map(lead => (
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                onStatusChange={onStatusChange}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                        {getLeadsByStatus(column.id).length === 0 && (
                            <div className="text-center text-gray-400 text-sm py-4 italic border-2 border-dashed border-gray-200 rounded-lg">
                                Bo'sh
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CRMBoard;
