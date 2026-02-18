import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import CRMBoard from '../components/crm/CRMBoard';
import LeadModal from '../components/crm/LeadModal';
import crmService from '../services/crmService';
import DashboardLayout from '../components/Dashboard/DashboardLayout';

const CRMPage = () => {
    const [leads, setLeads] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchLeads = async () => {
        setIsLoading(true);
        try {
            const data = await crmService.getLeads({ search: searchQuery });
            setLeads(data);
        } catch (error) {
            console.error("Failed to fetch leads:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [searchQuery]); // Re-fetch on search change

    const handleCreateLead = async (formData) => {
        try {
            await crmService.createLead(formData);
            fetchLeads();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to create lead:", error);
            alert("Xatolik yuz berdi");
        }
    };

    const handleUpdateLead = async (formData) => {
        if (!editingLead) return;
        try {
            await crmService.updateLead(editingLead.id, formData);
            fetchLeads();
            setEditingLead(null);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to update lead:", error);
            alert("Xatolik yuz berdi");
        }
    };

    const handleStatusChange = async (leadId, newStatus) => {
        try {
            await crmService.updateLead(leadId, { status: newStatus });
            // Optimistic update
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        } catch (error) {
            console.error("Failed to update status:", error);
            fetchLeads(); // Revert on failure
        }
    };

    const handleDeleteLead = async (leadId) => {
        if (!window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
        try {
            await crmService.deleteLead(leadId);
            setLeads(prev => prev.filter(l => l.id !== leadId));
        } catch (error) {
            console.error("Failed to delete lead:", error);
            alert("O'chirib bo'lmadi");
        }
    };

    const openNoteModal = (lead) => {
        setEditingLead(lead);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingLead(null);
        setIsModalOpen(true);
    };

    return (
        <DashboardLayout>
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">CRM - Lidlar</h1>
                        <p className="text-gray-500">Potentsial o'quvchilar va sotuv jarayoni</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchLeads} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Yangilash">
                            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            <Plus size={20} /> Yangi Lid
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Qidirish (Ism, Telefon)..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
                        <Filter size={18} /> Filterlar
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    {isLoading && leads.length === 0 ? (
                        <div className="flex justify-center items-center h-64">Loading...</div>
                    ) : (
                        <CRMBoard
                            leads={leads}
                            onStatusChange={handleStatusChange}
                            onEdit={openNoteModal}
                            onDelete={handleDeleteLead}
                        />
                    )}
                </div>

                <LeadModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
                    onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
                    initialData={editingLead}
                />
            </div>
        </DashboardLayout>
    );
};

export default CRMPage;
