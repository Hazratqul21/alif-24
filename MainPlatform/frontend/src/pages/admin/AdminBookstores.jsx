import React, { useState, useEffect } from 'react';
import { Store, Check, X, Search, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminBookstores() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            setLoading(true);
            // using the new endpoint in admin_panel.py
            const res = await api.get('/admin/stores/pending');
            setStores(res.data.stores || []);
        } catch (error) {
            console.error("Failed to fetch pending stores", error);
            toast.error("Do'konlarni yuklashda xatolik");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/admin/stores/${id}/approve`);
            toast.success("Do'kon tasdiqlandi!");
            setStores(stores.filter(s => s.id !== id));
        } catch (error) {
            toast.error("Tasdiqlashda xatolik yuz berdi");
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Rostdan ham bu do'kon arizasini rad etasizmi?")) return;
        try {
            await api.post(`/admin/stores/${id}/reject`);
            toast.success("Do'kon rad etildi!");
            setStores(stores.filter(s => s.id !== id));
        } catch (error) {
            toast.error("Rad etishda xatolik yuz berdi");
        }
    };

    const filteredStores = stores.filter(store => 
        store.name.toLowerCase().includes(search.toLowerCase()) || 
        (store.inn && store.inn.includes(search))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Store className="w-8 h-8 text-emerald-400" />
                        Kitob do'konlari arizalari
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Yangi ochilayotgan kutubxona va kitob do'konlarini tasdiqlash
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-gray-900/50 p-4 border border-gray-800 rounded-2xl">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Nomi yoki INN bo'yicha qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
            ) : filteredStores.length === 0 ? (
                <div className="text-center py-12 bg-gray-900/50 border border-gray-800 rounded-2xl">
                    <Store className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-white mb-1">Arizalar yo'q</h3>
                    <p className="text-gray-400">Hozircha kutmoqda bo'lgan yangi do'kon yoki kutubxona yo'q.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStores.map(store => (
                        <div key={store.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{store.name}</h3>
                                    <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-md mt-1 font-medium capitalize">
                                        {store.type === 'bookstore' ? "Kitob do'koni" : 'Kutubxona'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">INN raqami:</span>
                                    <span className="text-emerald-400 font-mono font-medium">{store.inn || 'Kiritilmagan'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Manzil:</span>
                                    <span className="text-white text-right max-w-[150px] truncate" title={store.address}>{store.address}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Telefon:</span>
                                    <span className="text-white">{store.phone || 'Kiritilmagan'}</span>
                                </div>
                                {store.description && (
                                    <div className="text-sm mt-3 pt-3 border-t border-gray-800">
                                        <p className="text-gray-400 line-clamp-2" title={store.description}>{store.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleReject(store.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors font-medium text-sm"
                                >
                                    <X className="w-4 h-4" />
                                    Rad etish
                                </button>
                                <button
                                    onClick={() => handleApprove(store.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors font-medium text-sm"
                                >
                                    <Check className="w-4 h-4" />
                                    Tasdiqlash
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
