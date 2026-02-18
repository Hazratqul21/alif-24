/**
 * TestAI Page - AI yordamida test yaratish
 * CRM moduli sifatida embedding qilingan
 */
import React, { useState } from 'react';
import { FileText, Plus, BookOpen, Brain, Sparkles } from 'lucide-react';

const TestAIPage = () => {
    const [activeView, setActiveView] = useState('overview');

    return (
        <div style={{ padding: '20px' }}>
            <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Brain size={32} />
                    <h2 style={{ margin: 0, fontSize: '24px' }}>TestAI - AI yordamida test yaratish</h2>
                </div>
                <p style={{ margin: 0, opacity: 0.9 }}>
                    Sun'iy intellekt yordamida har qanday fandan test va viktorina yarating
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}>
                    <div style={{
                        background: '#EEF2FF',
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px'
                    }}>
                        <Plus size={24} style={{ color: '#6366F1' }} />
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>Yangi test yaratish</h3>
                    <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                        AI yordamida avtomatik savollar generatsiya qiling
                    </p>
                </div>

                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}>
                    <div style={{
                        background: '#FEF3C7',
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px'
                    }}>
                        <FileText size={24} style={{ color: '#D97706' }} />
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>Mening testlarim</h3>
                    <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                        Yaratilgan testlarni ko'rish va boshqarish
                    </p>
                </div>

                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}>
                    <div style={{
                        background: '#ECFDF5',
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px'
                    }}>
                        <BookOpen size={24} style={{ color: '#059669' }} />
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>Natijalar</h3>
                    <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                        O'quvchilarning test natijalarini tahlil qiling
                    </p>
                </div>
            </div>

            <div style={{
                marginTop: '24px',
                background: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                border: '1px solid #e5e7eb'
            }}>
                <Sparkles size={48} style={{ color: '#D1D5DB', marginBottom: '12px' }} />
                <h3 style={{ color: '#6B7280', marginBottom: '8px' }}>TestAI tez orada to'liq ishga tushadi</h3>
                <p style={{ color: '#9CA3AF', maxWidth: '400px', margin: '0 auto' }}>
                    Hozircha asosiy TestAI platformasidan foydalaning: testai.alif24.uz
                </p>
            </div>
        </div>
    );
};

export default TestAIPage;
