import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const LeadModal = ({ isOpen, onClose, onSubmit, initialData = null }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        source: '',
        status: 'new',
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                first_name: initialData.first_name || '',
                last_name: initialData.last_name || '',
                phone: initialData.phone || '',
                source: initialData.source || '',
                status: initialData.status || 'new',
                notes: initialData.notes || ''
            });
        } else {
            setFormData({
                first_name: '',
                last_name: '',
                phone: '',
                source: '',
                status: 'new',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{initialData ? 'Lidni Tahrirlash' : 'Yangi Lid Qo\'shish'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                        <input
                            type="tel"
                            required
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+998..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Manba</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.source}
                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                            >
                                <option value="">Tanlang...</option>
                                <option value="Instagram">Instagram</option>
                                <option value="Telegram">Telegram</option>
                                <option value="Website">Web Sayt</option>
                                <option value="Referral">Tavsiya</option>
                                <option value="Other">Boshqa</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Holat</label>
                            <select
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="new">Yangi</option>
                                <option value="contacted">Bog'lanildi</option>
                                <option value="trial_lesson">Sinov darsi</option>
                                <option value="negotiation">Muzokara</option>
                                <option value="won">Yutuq</option>
                                <option value="lost">Yo'qotildi</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Eslatmalar</label>
                        <textarea
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            rows="3"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            Bekor qilish
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Saqlash
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeadModal;
