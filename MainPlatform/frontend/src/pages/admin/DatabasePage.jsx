import { useEffect, useState } from 'react';
import { Database, Pencil, Trash2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import adminService from '../../services/adminService';

export default function DatabasePage() {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableData, setTableData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [editingRow, setEditingRow] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [saving, setSaving] = useState(false);
    const limit = 30;

    useEffect(() => { loadTables(); }, []);

    const loadTables = async () => {
        try {
            const { data } = await adminService.getTables();
            setTables(data.tables || []);
            if (data.tables?.length > 0) {
                setSelectedTable(data.tables[0].name);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTable) loadTableData();
    }, [selectedTable, offset]);

    const loadTableData = async () => {
        try {
            setDataLoading(true);
            const { data } = await adminService.getTableData(selectedTable, { limit, offset });
            setTableData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setDataLoading(false);
        }
    };

    const handleEdit = (row) => {
        setEditingRow(row.id || Object.values(row)[0]);
        setEditValues({ ...row });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const rowId = editingRow;
            await adminService.updateTableRow(selectedTable, rowId, editValues);
            setEditingRow(null);
            loadTableData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        const rowId = row.id || Object.values(row)[0];
        if (!confirm(`Rostdan o'chirmoqchimisiz? ID: ${rowId}`)) return;
        try {
            await adminService.deleteTableRow(selectedTable, rowId);
            loadTableData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Xatolik');
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>;
    }

    const columns = tableData?.columns || [];
    const rows = tableData?.rows || [];
    const total = tableData?.total || 0;

    return (
        <div className="flex gap-4 h-[calc(100vh-120px)]">
            {/* Tables list */}
            <div className="w-56 shrink-0 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span className="text-white text-sm font-medium">Jadvallar</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {tables.map(t => (
                        <button
                            key={t.name}
                            onClick={() => { setSelectedTable(t.name); setOffset(0); setEditingRow(null); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${selectedTable === t.name ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <span className="truncate">{t.name}</span>
                            <span className="text-xs opacity-50">{t.rows}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Data view */}
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col min-w-0">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-medium">{selectedTable}</h2>
                        <p className="text-gray-500 text-xs">{total} ta qator • {columns.length} ta ustun</p>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {dataLoading ? (
                        <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" /></div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-gray-900">
                                <tr>
                                    {columns.map(c => (
                                        <th key={c.name} className="text-left px-3 py-2 text-gray-400 font-medium border-b border-gray-800 whitespace-nowrap">
                                            {c.name}
                                            <span className="text-gray-600 ml-1">({c.type})</span>
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-gray-400 font-medium border-b border-gray-800 text-right sticky right-0 bg-gray-900">⚡</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => {
                                    const rowId = row.id || Object.values(row)[0];
                                    const isEditing = editingRow === rowId;

                                    return (
                                        <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                                            {columns.map(c => (
                                                <td key={c.name} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                                                    {isEditing && c.name !== 'id' && c.name !== 'created_at' ? (
                                                        <input
                                                            type="text"
                                                            value={editValues[c.name] ?? ''}
                                                            onChange={(e) => setEditValues({ ...editValues, [c.name]: e.target.value })}
                                                            className="w-full px-2 py-1 bg-gray-800 border border-emerald-500/30 rounded text-white text-xs focus:outline-none"
                                                        />
                                                    ) : (
                                                        <span title={String(row[c.name] ?? '')}>{row[c.name] === null ? <span className="text-gray-600">NULL</span> : String(row[c.name])}</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-3 py-2 text-right sticky right-0 bg-gray-900">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-400 hover:text-emerald-300"><Save className="w-4 h-4" /></button>
                                                        <button onClick={() => setEditingRow(null)} className="p-1 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => handleEdit(row)} className="p-1 text-gray-500 hover:text-emerald-400"><Pencil className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDelete(row)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {total > limit && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-800">
                        <span className="text-gray-500 text-xs">{offset + 1}–{Math.min(offset + limit, total)} / {total}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="p-1.5 bg-gray-800 rounded text-gray-400 hover:text-white disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="p-1.5 bg-gray-800 rounded text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
