import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import adminService from '../../services/adminService';

export default function AdminBooksCatalog() {
    const [books, setBooks] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [formData, setFormData] = useState({
        title: '', author: '', genre: '', description: '', isbn: '', image: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            fetchBooks();
        }, 300);
        return () => clearTimeout(t);
    }, [search, page]);

    const fetchBooks = async () => {
        try {
            setLoading(true);
            const res = await adminService.api.get('/books-catalog', {
                params: { search, limit, offset: (page - 1) * limit }
            });
            setBooks(res.data.items);
            setTotal(res.data.total);
        } catch (error) {
            console.error('Failed to fetch books', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Rostdan ham bu kitobni katalogdan o'chirmoqchimisiz?")) return;
        try {
            await adminService.api.delete(`/books-catalog/${id}`);
            fetchBooks();
        } catch (error) {
            alert('Xatolik yuz berdi');
        }
    };

    const openModal = (book = null) => {
        if (book) {
            setEditingBook(book);
            setFormData({
                title: book.title || '',
                author: book.author || '',
                genre: book.genre || '',
                description: book.description || '',
                isbn: book.isbn || '',
                image: book.image || ''
            });
        } else {
            setEditingBook(null);
            setFormData({
                title: '', author: '', genre: '', description: '', isbn: '', image: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingBook) {
                await adminService.api.put(`/books-catalog/${editingBook.id}`, formData);
            } else {
                await adminService.api.post('/books-catalog', formData);
            }
            setIsModalOpen(false);
            fetchBooks();
        } catch (error) {
            alert('Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Kitoblar Bazasi</h1>
                    <p className="text-gray-400 text-sm">Umumiy katalog ({total} ta kitob)</p>
                </div>
                
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
                >
                    <Plus size={18} />
                    Kitob qo'shish
                </button>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Kitob nomi yoki muallif..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-950/50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Kitob</th>
                                <th className="px-6 py-4 font-medium">Janr / ISBN</th>
                                <th className="px-6 py-4 font-medium">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                                    </td>
                                </tr>
                            ) : books.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                                        Topilmadi
                                    </td>
                                </tr>
                            ) : (
                                books.map((book) => (
                                    <tr key={book.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {book.image ? (
                                                    <img src={book.image} alt="" className="w-10 h-14 object-cover rounded bg-gray-800" />
                                                ) : (
                                                    <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                                                        <BookOpen size={16} className="text-gray-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-200">{book.title}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{book.author || "Noma'lum muallif"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-300">{book.genre || '-'}</div>
                                            <div className="text-xs text-gray-500">{book.isbn || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openModal(book)}
                                                    className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-amber-400 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(book.id)}
                                                    className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-800 flex justify-between items-center">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                        Oldingi
                    </button>
                    <span className="text-sm text-gray-500">
                        {page}-sahifa
                    </span>
                    <button 
                        disabled={page * limit >= total}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                        Keyingi
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <form onSubmit={handleSubmit}>
                            <div className="px-6 py-4 border-b border-gray-800">
                                <h3 className="text-lg font-medium text-white">
                                    {editingBook ? "Kitobni tahrirlash" : "Yangi kitob qo'shish"}
                                </h3>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Kitob nomi *</label>
                                    <input 
                                        required
                                        type="text" 
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Muallif</label>
                                    <input 
                                        type="text" 
                                        value={formData.author}
                                        onChange={e => setFormData({...formData, author: e.target.value})}
                                        className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Janr</label>
                                        <input 
                                            type="text" 
                                            value={formData.genre}
                                            onChange={e => setFormData({...formData, genre: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">ISBN</label>
                                        <input 
                                            type="text" 
                                            value={formData.isbn}
                                            onChange={e => setFormData({...formData, isbn: e.target.value})}
                                            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Rasm (URL yoki Fayl)</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="url" 
                                            value={formData.image}
                                            onChange={e => setFormData({...formData, image: e.target.value})}
                                            className="flex-1 px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                                            placeholder="https://..."
                                        />
                                        <input
                                            type="file"
                                            id="book-image-upload"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                    const res = await adminService.uploadFile(file);
                                                    if (res.data?.url) {
                                                        setFormData({ ...formData, image: res.data.url });
                                                    }
                                                } catch (err) {
                                                    alert("Rasm yuklashda xatolik yuz berdi");
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="book-image-upload"
                                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white rounded-lg cursor-pointer transition-colors flex items-center shrink-0"
                                        >
                                            Yuklash
                                        </label>
                                    </div>
                                    {formData.image && (
                                        <div className="mt-3">
                                            <img src={formData.image} alt="Preview" className="h-24 w-auto object-contain rounded border border-gray-800 bg-gray-950 p-1" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                >
                                    Bekor qilish
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    Saqlash
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
