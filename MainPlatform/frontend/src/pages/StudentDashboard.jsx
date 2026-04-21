// ============================================================
//  StudentDashboard.jsx ichidagi renderDashboard() funksiyasini
//  to'liq shu kod bilan almashtiring
// ============================================================

const renderDashboard = () => (
    <div className="space-y-6">
        <StudentPortalHeader profile={dashboardData?.profile} user={authUser} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">

                {/* ── Salom kartasi ── */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] p-6 text-white shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">

                            {/* Sarlavha + badge-lar */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <h2
                                    className="text-xl md:text-3xl font-bold text-white cursor-pointer hover:underline"
                                    onClick={() => {
                                        setShowSubModal(true);
                                        if (subPlans.length === 0) {
                                            setSubLoading(true);
                                            const apiBaseUrl =
                                                (import.meta.env.VITE_API_URL
                                                    ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//')
                                                    : '') || '/api/v1';
                                            fetch(`${apiBaseUrl}/coins/subscription/plans`, { credentials: 'include' })
                                                .then(r => r.json())
                                                .then(d => setSubPlans(d.plans || []))
                                                .catch(() => { })
                                                .finally(() => setSubLoading(false));
                                        }
                                    }}
                                >
                                    {t.welcome}, {user.name}!
                                </h2>

                                {/* Level badge — avval bg-white/20 edi, ko'rinmaydi */}
                                <span className="bg-white/25 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/40">
                                    Lvl {user.level}
                                </span>

                                {/* Obuna holati */}
                                {mySub?.has_subscription ? (
                                    <span
                                        className="bg-emerald-400 text-emerald-900 px-3 py-1 rounded-full text-xs font-extrabold shadow cursor-pointer"
                                        onClick={() => setShowSubModal(true)}
                                    >
                                        ✅ {mySub.subscription?.plan_name || 'Obuna'}
                                    </span>
                                ) : (
                                    // AVVAL: bg-yellow-400/30 text yo'q — ko'rinmas edi
                                    // ENDI:  to'q sariq fon + qora matn + border = hamma ko'radi
                                    <button
                                        onClick={() => {
                                            setShowSubModal(true);
                                            if (subPlans.length === 0) {
                                                setSubLoading(true);
                                                const apiBaseUrl =
                                                    (import.meta.env.VITE_API_URL
                                                        ? import.meta.env.VITE_API_URL.replace(/^https?:\/\//, window.location.protocol + '//')
                                                        : '') || '/api/v1';
                                                fetch(`${apiBaseUrl}/coins/subscription/plans`, { credentials: 'include' })
                                                    .then(r => r.json())
                                                    .then(d => setSubPlans(d.plans || []))
                                                    .catch(() => { })
                                                    .finally(() => setSubLoading(false));
                                            }
                                        }}
                                        className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-4 py-1.5 rounded-full text-sm font-extrabold border-2 border-yellow-600 shadow-lg shadow-yellow-400/40 transition-all duration-200 hover:scale-105 animate-pulse"
                                    >
                                        ⭐ Obuna bo'lish
                                    </button>
                                )}

                                {/* ID badge */}
                                {authUser?.id && (
                                    <span
                                        className="bg-white/15 text-white/70 px-2 py-0.5 rounded-full text-[10px] font-mono cursor-pointer hover:text-white hover:bg-white/25 transition-all"
                                        onClick={() => {
                                            navigator.clipboard.writeText(authUser.id);
                                            setNotification({ type: 'success', message: 'ID nusxalandi!' });
                                        }}
                                        title="ID nusxalash"
                                    >
                                        ID: {authUser.id}
                                    </span>
                                )}
                            </div>

                            {/* Tavsif matni — avval opacity-90 edi, fon och bo'lsa ko'rinmasdi */}
                            <p className="text-white/80 mb-5 flex items-center gap-2 text-sm">
                                {user.parent
                                    ? <>Ota-onangiz sizni kuzatib bormoqda <Shield size={16} /></>
                                    : displayTasks.filter(t => t.status === 'pending').length > 0
                                        ? `Sizda ${displayTasks.filter(t => t.status === 'pending').length} ta bajarilmagan vazifa bor.`
                                        : 'Barcha vazifalar bajarilgan! 🎉'
                                }
                            </p>

                            <button
                                onClick={() => setActiveTab('tasks')}
                                className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform text-sm"
                            >
                                Boshlash
                            </button>
                        </div>

                        {/* Monster */}
                        <div className="relative z-10 animate-bounce shrink-0">{user.monster}</div>
                    </div>

                    {/* ProgressCharts */}
                    <div className="mt-6">
                        <ProgressCharts performanceData={performanceData} />
                    </div>
                </div>

                {/* ── Coin / Streak / Kunlik bonus ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Coins size={24} className="text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Coinlar</p>
                            <h3 className="text-2xl font-bold text-gray-800">{coinBalance?.current_balance ?? user.points}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <Flame size={24} className="text-orange-600" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">{t.stats.streak}</p>
                            <h3 className="text-2xl font-bold text-gray-800">{user.streak} kun</h3>
                        </div>
                    </div>

                    <button
                        onClick={handleDailyBonus}
                        disabled={dailyBonusClaimed}
                        className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 text-left transition-all ${dailyBonusClaimed
                                ? 'border-green-200 bg-green-50'
                                : 'border-yellow-200 hover:border-yellow-400 hover:shadow-md cursor-pointer'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dailyBonusClaimed ? 'bg-green-100' : 'bg-yellow-100 animate-pulse'}`}>
                            {dailyBonusClaimed
                                ? <CheckCircle size={24} className="text-green-600" />
                                : <Gift size={24} className="text-yellow-600" />
                            }
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm">Kunlik bonus</p>
                            <h3 className="text-lg font-bold text-gray-800">{dailyBonusClaimed ? 'Olingan' : '+5 coin'}</h3>
                        </div>
                    </button>
                </div>

                {bonusMessage && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center text-yellow-800 font-medium animate-pulse">
                        {bonusMessage}
                    </div>
                )}

                {/* ── Live Quiz / Olimpiada ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                        onClick={() => navigate('/livequiz')}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sm:p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Target size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Live Quiz</h3>
                            <p className="text-white/80 text-xs">Kod bilan qo'shiling</p>
                        </div>
                    </button>

                    <button
                        onClick={() => window.location.href = 'https://olimp.alif24.uz'}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                    >
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Trophy size={24} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg">Olimpiada</h3>
                            <p className="text-white/80 text-xs">Bilimingizni sinang</p>
                        </div>
                    </button>
                </div>

                {/* ── Kitob o'qish tahlillari ── */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-500" /> Kitob O'qish Tahlillari
                    </h3>
                    {loadingAnalyses ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
                            <p className="text-gray-500">Yuklanmoqda...</p>
                        </div>
                    ) : readingAnalyses && readingAnalyses.total_sessions > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="bg-blue-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-blue-600">{readingAnalyses.total_words || 0}</div>
                                <div className="text-xs text-gray-600 mt-1">So'zlar</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-green-600">{readingAnalyses.avg_comprehension || 0}%</div>
                                <div className="text-xs text-gray-600 mt-1">Tushunish</div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-purple-600">{readingAnalyses.avg_pronunciation || 0}%</div>
                                <div className="text-xs text-gray-600 mt-1">Talaffuz</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl text-center">
                                <div className="text-2xl font-bold text-red-600">{readingAnalyses.total_errors || 0}</div>
                                <div className="text-xs text-gray-600 mt-1">Xatolar</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <BookOpen size={48} className="mx-auto mb-2 opacity-30" />
                            <p>Hali kitob o'qimadingiz</p>
                        </div>
                    )}
                </div>

                {/* ── Diqqat vaqti ── */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock size={20} className="text-blue-500" /> Diqqat Vaqti
                        </h3>
                        <span className="text-2xl font-mono font-bold text-gray-700">{formatTime(timer)}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${isTimerRunning
                                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                }`}
                        >
                            {isTimerRunning ? "To'xtatish" : 'Boshlash'}
                        </button>
                        <button
                            onClick={() => { setIsTimerRunning(false); setTimer(0); }}
                            className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* ── O'ng ustun — Vazifalarim ── */}
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-500" /> Vazifalarim
                    </h3>
                    <div className="space-y-4">
                        {displayTasks.filter(t => t.status === 'pending').slice(0, 3).map(task => (
                            <div
                                key={task.id}
                                className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer"
                                onClick={() => setActiveTab('tasks')}
                            >
                                <h4 className="font-bold text-gray-800 text-sm mb-1">{task.title}</h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{task.deadline}</p>
                            </div>
                        ))}
                        {displayTasks.filter(t => t.status === 'pending').length === 0 && (
                            <p className="text-center text-gray-400 text-sm font-medium py-4">
                                Barcha vazifalar bajarilgan! ✨
                            </p>
                        )}
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className="w-full py-3 text-sm text-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-50 rounded-2xl transition-colors"
                        >
                            Barchasini ko'rish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);