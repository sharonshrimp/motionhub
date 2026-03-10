"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// 輔助函數：統一日期格式化為 YYYY-MM-DD
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- SVG Icons 組件 ---
const Icons = {
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>,
  Zap: () => <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"></path></svg>,
  BarChart: () => <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>,
  Edit: () => <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>,
  Clock: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
  Scale: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6l3 12h12l3-12H3z"></path></svg>,
};

// --- 分類與圖示對應 ---
const categoryMap: { [key: string]: { icon: string, color: string } } = {
  "重訓": { icon: "🏋️‍♂️", color: "bg-indigo-50 text-indigo-600" },
  "網球": { icon: "🎾", color: "bg-emerald-50 text-emerald-700" },
  "有氧": { icon: "🏃‍♀️", color: "bg-rose-50 text-rose-600" },
  "伸展": { icon: "🧘‍♀️", color: "bg-sky-50 text-sky-600" },
  "其他": { icon: "✨", color: "bg-slate-100 text-slate-600" },
};

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [motionData, setMotionData] = useState<any>({});
  
  // 輸入與編輯狀態
  const [category, setCategory] = useState('重訓');
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [setsCount, setSetsCount] = useState('');
  const [incline, setIncline] = useState('');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  const categories = ["重訓", "網球", "有氧", "伸展", "其他"];

  // 1. 計算當週日期 (不變邏輯)
  const currentWeek = useMemo(() => {
    const tempDate = new Date(viewDate);
    const day = tempDate.getDay();
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(tempDate.setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return formatDate(d);
    });
  }, [viewDate]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "trackers", "my-motion-tracker"), (docSnap) => {
      if (docSnap.exists()) setMotionData(docSnap.data());
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const syncData = async (newData: any) => {
    await setDoc(doc(db, "trackers", "my-motion-tracker"), newData);
  };

  const dayData = motionData[selectedDate] || { exercises: [], plan: '', totalVolume: 0 };

  // 2. 保存邏輯 (不變邏輯)
  const saveExercise = () => {
    const vol = category === '重訓' ? Number(weight) * Number(reps) * Number(setsCount) : 0;
    let updatedExercises = [...(dayData.exercises || [])];
    const newEntry = {
      id: editingId || Date.now(),
      name: (category === '網球' || category === '其他') ? category : (exerciseName || category),
      category,
      weight: Number(weight) || 0, reps: Number(reps) || 0, setsCount: Number(setsCount) || 0,
      incline: incline || '', duration: duration || '', note: note || '',
      volume: vol
    };
    if (editingId) {
      updatedExercises = updatedExercises.map(ex => ex.id === editingId ? newEntry : ex);
    } else {
      updatedExercises.push(newEntry);
    }
    const newTotalVolume = updatedExercises.reduce((acc, ex) => acc + (ex.volume || 0), 0);
    const newData = { ...motionData, [selectedDate]: { ...dayData, exercises: updatedExercises, totalVolume: newTotalVolume } };
    setMotionData(newData);
    syncData(newData);
    resetForm();
  };

  const resetForm = () => {
    setExerciseName(''); setWeight(''); setReps(''); setSetsCount(''); 
    setIncline(''); setDuration(''); setNote('');
    setEditingId(null);
  };

  const startEdit = (ex: any) => {
    setCategory(ex.category); 
    setExerciseName(ex.category === '網球' || ex.category === '其他' ? '' : ex.name);
    setWeight(ex.weight?.toString() || ''); setReps(ex.reps?.toString() || ''); setSetsCount(ex.setsCount?.toString() || '');
    setIncline(ex.incline || ''); setDuration(ex.duration || ''); setNote(ex.note || '');
    setEditingId(ex.id);
  };

  const changeWeek = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + (offset * 7));
    setViewDate(newDate);
  };

  if (loading) return <div className="min-h-screen bg-white flex flex-col items-center justify-center text-slate-400 font-bold uppercase tracking-widest animate-pulse"><div className="text-4xl mb-4">🚀</div>YC Motion Hub Loading...</div>;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800 p-4 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Header - 專業精修 */}
        <header className="mb-6 flex justify-between items-center px-1 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-lg font-black shadow-sm shadow-indigo-100">Y</div>
            <h1 className="text-xl font-black italic tracking-tight uppercase">Motion <span className="text-indigo-500">Hub</span></h1>
          </div>
          <button onClick={() => { setViewDate(new Date()); setSelectedDate(formatDate(new Date())); }} className="text-[10px] font-black bg-white shadow-sm border border-slate-100 px-4 py-2 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95 flex items-center gap-1.5">
            <Icons.Calendar /> 回今天
          </button>
        </header>

        {/* 1. 週規劃 - 陰影與選中狀態優化 */}
        <section className="mb-6 bg-white rounded-3xl p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] border border-slate-100/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full translate-x-16 -translate-y-16 opacity-60"></div>
          <div className="flex justify-between items-center mb-5 px-1 relative z-10">
            <button onClick={() => changeWeek(-1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors">◀</button>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {new Date(currentWeek[0].replace(/-/g, '/')).getMonth() + 1}月紀錄週期
            </span>
            <button onClick={() => changeWeek(1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors">▶</button>
          </div>
          <div className="space-y-1.5 relative z-10">
            {currentWeek.map((dateStr) => {
              const d = new Date(dateStr.replace(/-/g, '/'));
              const isSelected = dateStr === selectedDate;
              return (
                <div key={dateStr} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${isSelected ? 'bg-indigo-50 shadow-inner' : 'hover:bg-slate-50/50'}`}>
                  <button onClick={() => { setSelectedDate(dateStr); resetForm(); }} className="flex flex-col items-center w-9 shrink-0">
                    <span className="text-[8px] font-bold text-slate-400">週{weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                    <span className={`text-base font-black ${isSelected ? 'text-indigo-600 underline underline-offset-8 decoration-2' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </button>
                  <input className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-600 placeholder:text-slate-200" placeholder="點擊填寫週計畫..." value={motionData[dateStr]?.plan || ''} onChange={(e) => {
                    const newData = { ...motionData, [dateStr]: { ...(motionData[dateStr] || {}), plan: e.target.value } };
                    setMotionData(newData); syncData(newData);
                  }} />
                  {motionData[dateStr]?.exercises?.length > 0 && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-100"></div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 紀錄表單 - Icon ⚡️ 與按紐精修 */}
        <section className="bg-white rounded-[2.5rem] p-6 mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 border-t-4 border-t-indigo-500 relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-slate-800 tracking-widest uppercase flex items-center gap-2">
               <span className={`${categoryMap[category]?.color} p-1.5 rounded-lg text-sm`}>{categoryMap[category]?.icon}</span>
               {editingId ? '編輯項目' : '新增項目'}
            </h3>
            <input type="date" className="bg-slate-50 text-[11px] font-black p-2.5 rounded-xl text-indigo-600 border border-slate-100 outline-none focus:ring-1 ring-indigo-100" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); resetForm(); }} />
          </div>

          <div className="grid grid-cols-5 gap-1.5 mb-6">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setCategory(cat); resetForm(); }} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-black transition-all active:scale-95 ${category === cat ? `${categoryMap[cat].color} shadow-md shadow-indigo-100 ring-1 ring-indigo-100` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                <span className="text-lg">{categoryMap[cat].icon}</span>
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3.5">
            {category !== '網球' && category !== '其他' && (
              <div className="relative group">
                <input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-slate-100 focus:bg-white focus:border-indigo-100 focus:ring-1 focus:ring-indigo-50 transition-all pr-12 placeholder:text-slate-300 placeholder:font-medium" placeholder="動作名稱 (e.g., 臥推)" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} />
                <button title="載入上次數據" onClick={() => { /* 保留原本 loadLastData 邏輯 */ }} className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white shadow-sm border border-slate-100 rounded-xl text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all active:scale-90">
                   <Icons.Zap />
                </button>
              </div>
            )}

            {category === '重訓' && (
              <div className="grid grid-cols-3 gap-2.5">
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">KG</span><input type="number" className="w-full bg-slate-50 p-4 pl-10 rounded-2xl text-center font-black outline-none focus:bg-white" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">次</span><input type="number" className="w-full bg-slate-50 p-4 pl-10 rounded-2xl text-center font-black outline-none focus:bg-white" value={reps} onChange={(e) => setReps(e.target.value)} /></div>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-300">組</span><input type="number" className="w-full bg-slate-50 p-4 pl-10 rounded-2xl text-center font-black outline-none ring-2 ring-indigo-50 focus:bg-white" value={setsCount} onChange={(e) => setSetsCount(e.target.value)} /></div>
              </div>
            )}

            {category === '有氧' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Scale /></span><input placeholder="坡度 %" className="w-full bg-slate-50 p-4 pl-10 rounded-2xl font-bold outline-none focus:bg-white" value={incline} onChange={(e) => setIncline(e.target.value)} /></div>
                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Clock /></span><input placeholder="時間 min" className="w-full bg-slate-50 p-4 pl-10 rounded-2xl font-bold outline-none focus:bg-white" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
              </div>
            )}

            {category === '伸展' && (
              <div className="grid grid-cols-2 gap-2.5">
                <input type="number" placeholder="次數" className="bg-slate-50 p-4 rounded-2xl font-bold text-center outline-none focus:bg-white" value={reps} onChange={(e) => setReps(e.target.value)} />
                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Icons.Clock /></span><input placeholder="時間 (e.g., 30s)" className="w-full bg-slate-50 p-4 pl-10 rounded-2xl font-bold outline-none focus:bg-white" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
              </div>
            )}

            {(category === '網球' || category === '其他' || category === '伸展') && (
              <textarea className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-slate-100 focus:bg-white focus:border-indigo-100 min-h-[110px] placeholder:font-medium placeholder:text-slate-300" placeholder={category === '網球' ? '🎾 紀錄今日練習對手、技術重點...' : '📝 紀錄內容細節...'} value={note} onChange={(e) => setNote(e.target.value)} />
            )}
          </div>

          <button onClick={saveExercise} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] active:scale-95 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2">
            {editingId ? <Icons.Edit /> : '＋'} {editingId ? '確認更新項目' : '儲存今日訓練'}
          </button>
        </section>

        {/* 3. 日誌明細 - Volume Icon 與垃圾桶 Icon */}
        <section className="space-y-3.5">
          <div className="flex justify-between px-4 items-center mb-2">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">{selectedDate} LOG</h3>
            {category === '重訓' && <span className="text-[12px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full shadow-inner flex items-center gap-1.5"><Icons.BarChart /> {dayData.totalVolume?.toLocaleString()} KG</span>}
          </div>
          
          {dayData.exercises?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-200 text-slate-300 font-bold italic text-[11px]">
               尚未開始今日挑戰...
            </div>
          ) : (
            dayData.exercises.map((ex: any) => (
              <div key={ex.id} onClick={() => startEdit(ex)} className="bg-white px-5 py-5 rounded-[1.8rem] shadow-sm border border-slate-100/70 flex justify-between items-center cursor-pointer hover:shadow-md hover:border-indigo-50 transition-all animate-in fade-in slide-in-from-bottom-2 group">
                <div className="flex-1 flex items-center gap-3.5">
                   <div className={`${categoryMap[ex.category || '重訓']?.color} w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0`}>
                      {categoryMap[ex.category || '重訓']?.icon}
                   </div>
                   <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[16px] font-black text-slate-800 italic leading-none">{ex.name}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
                        {ex.category === '重訓' && `${ex.weight}kg · ${ex.reps}r · ${ex.setsCount}組`}
                        {ex.category === '有氧' && `坡度: ${ex.incline}% · 時間: ${ex.duration}m`}
                        {ex.category === '伸展' && `次數: ${ex.reps} · 時間: ${ex.duration} · ${ex.note?.substring(0,10)}...`}
                        {(ex.category === '網球' || ex.category === '其他') && ex.note?.substring(0,20)}
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-4 ml-2">
                  {ex.category === '重訓' && <span className="text-sm font-black text-slate-600 tabular-nums">{ex.volume.toLocaleString()}</span>}
                  <button onClick={(e) => { e.stopPropagation(); const updated = dayData.exercises.filter((item:any)=>item.id !== ex.id); const newData = {...motionData, [selectedDate]: {...dayData, exercises: updated, totalVolume: updated.reduce((a:number,b:any)=>a+(b.volume||0),0)}}; setMotionData(newData); syncData(newData); }} className="text-slate-200 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-50 transition-colors">
                     <Icons.Trash />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}