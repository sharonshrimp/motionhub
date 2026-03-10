"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [motionData, setMotionData] = useState<any>({});
  
  // 輸入狀態
  const [category, setCategory] = useState('重訓');
  const [exerciseName, setExerciseName] = useState('');
  
  // 不同類別的專屬狀態
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [setsCount, setSetsCount] = useState('');
  const [incline, setIncline] = useState('');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  const categories = ["重訓", "網球", "有氧", "伸展", "其他"];

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

  const loadLastData = () => {
    if (!exerciseName) return;
    const sortedDates = Object.keys(motionData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    for (const date of sortedDates) {
      const ex = motionData[date].exercises?.find((e: any) => e.name.trim() === exerciseName.trim());
      if (ex) {
        setCategory(ex.category || '重訓');
        setWeight(ex.weight || ''); setReps(ex.reps || ''); setSetsCount(ex.setsCount || '');
        setIncline(ex.incline || ''); setDuration(ex.duration || ''); setNote(ex.note || '');
        return;
      }
    }
  };

  const saveExercise = () => {
    if (category === '重訓' && (!exerciseName || !weight || !reps || !setsCount)) return;
    if ((category === '網球' || category === '其他') && !note) return;

    const vol = category === '重訓' ? Number(weight) * Number(reps) * Number(setsCount) : 0;
    let updatedExercises = [...(dayData.exercises || [])];

    const newEntry = {
      id: editingId || Date.now(),
      name: exerciseName || category,
      category,
      weight: Number(weight), reps: Number(reps), setsCount: Number(setsCount),
      incline, duration, note,
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
    setCategory(ex.category); setExerciseName(ex.name);
    setWeight(ex.weight?.toString() || ''); setReps(ex.reps?.toString() || ''); setSetsCount(ex.setsCount?.toString() || '');
    setIncline(ex.incline || ''); setDuration(ex.duration || ''); setNote(ex.note || '');
    setEditingId(ex.id);
  };

  const changeWeek = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + (offset * 7));
    setViewDate(newDate);
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400 font-medium italic italic uppercase tracking-tighter">Roadmap Syncing...</div>;

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-800 p-5 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        <header className="mb-6 flex justify-between items-center px-1">
          <h1 className="text-xl font-black italic tracking-tight uppercase">YC <span className="text-indigo-500">Motion</span></h1>
          <button onClick={() => { setViewDate(new Date()); setSelectedDate(new Date().toLocaleDateString('en-CA')); }} className="text-[10px] font-black bg-slate-100 px-4 py-2 rounded-full text-slate-500">回今天</button>
        </header>

        {/* 1. 週規劃 */}
        <section className="mb-6 bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4 px-2">
            <button onClick={() => changeWeek(-1)} className="p-2 text-slate-300">◀</button>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{new Date(viewDate).getMonth() + 1}月紀錄</span>
            <button onClick={() => changeWeek(1)} className="p-2 text-slate-300">▶</button>
          </div>
          <div className="space-y-1">
            {currentWeek.map((dateStr) => (
              <div key={dateStr} className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${dateStr === selectedDate ? 'bg-indigo-50/50' : ''}`}>
                <button onClick={() => { setSelectedDate(dateStr); resetForm(); }} className="flex flex-col items-center w-8 shrink-0">
                  <span className="text-[8px] font-bold text-slate-400">W{weekdays[new Date(dateStr).getDay() === 0 ? 6 : new Date(dateStr).getDay() - 1]}</span>
                  <span className={`text-sm font-black ${dateStr === selectedDate ? 'text-indigo-600 underline underline-offset-8' : 'text-slate-700'}`}>{new Date(dateStr).getDate()}</span>
                </button>
                <input className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-600 placeholder:text-slate-200" placeholder="輸入計畫..." value={motionData[dateStr]?.plan || ''} onChange={(e) => {
                  const newData = { ...motionData, [dateStr]: { ...(motionData[dateStr] || {}), plan: e.target.value } };
                  setMotionData(newData); syncData(newData);
                }} />
              </div>
            ))}
          </div>
        </section>

        {/* 2. 動態紀錄表單 */}
        <section className="bg-white rounded-[2.5rem] p-6 mb-6 shadow-sm border border-slate-100 border-t-4 border-t-indigo-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-black text-slate-800 tracking-widest uppercase">{category} 紀錄</h3>
            <input type="date" className="bg-slate-50 text-[11px] font-black p-2 rounded-xl text-indigo-600 border-none outline-none" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setCategory(cat); resetForm(); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${category === cat ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{cat}</button>
            ))}
          </div>
          
          <div className="space-y-3">
            {/* 動態名稱欄位 */}
            {category !== '網球' && category !== '其他' && (
              <div className="relative">
                <input className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-transparent focus:border-indigo-100" placeholder="動作名稱" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} />
                <button onClick={loadLastData} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white shadow-sm rounded-xl text-indigo-500">⚡️</button>
              </div>
            )}

            {/* 類別專屬欄位 */}
            {category === '重訓' && (
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="KG" className="bg-slate-50 p-3.5 rounded-xl text-center font-bold outline-none" value={weight} onChange={(e) => setWeight(e.target.value)} />
                <input type="number" placeholder="REPS" className="bg-slate-50 p-3.5 rounded-xl text-center font-bold outline-none" value={reps} onChange={(e) => setReps(e.target.value)} />
                <input type="number" placeholder="SETS" className="bg-slate-50 p-3.5 rounded-xl text-center font-bold outline-none ring-1 ring-indigo-50" value={setsCount} onChange={(e) => setSetsCount(e.target.value)} />
              </div>
            )}

            {category === '有氧' && (
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="坡度 (Incline)" className="bg-slate-50 p-3.5 rounded-xl text-center font-bold outline-none" value={incline} onChange={(e) => setIncline(e.target.value)} />
                <input placeholder="時間 (Minutes)" className="bg-slate-50 p-3.5 rounded-xl text-center font-bold outline-none" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            )}

            {category === '伸展' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="次數" className="bg-slate-50 p-3.5 rounded-xl text-center font-bold outline-none" value={reps} onChange={(e) => setReps(e.target.value)} />
                  <input placeholder="時間 (Sec/Min)" className="bg-slate-50 p-3.5 rounded-xl text-center font-bold outline-none" value={duration} onChange={(e) => setDuration(e.target.value)} />
                </div>
              </div>
            )}

            {(category === '網球' || category === '其他' || category === '伸展') && (
              <textarea className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-transparent focus:border-indigo-100 min-h-[80px]" placeholder={category === '伸展' ? '伸展動作內容' : '今日練習內容細節...'} value={note} onChange={(e) => setNote(e.target.value)} />
            )}
          </div>

          <button onClick={saveExercise} className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 shadow-lg">Save {category}</button>
        </section>

        {/* 3. 日誌明細 */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic px-3">{selectedDate} Log</h3>
          {dayData.exercises?.map((ex: any) => (
            <div key={ex.id} onClick={() => startEdit(ex)} className="bg-white px-5 py-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center group cursor-pointer">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-md font-black text-slate-800 italic">{ex.category === '網球' || ex.category === '其他' ? ex.category : ex.name}</span>
                  <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 text-indigo-400 rounded font-black">{ex.category}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  {ex.category === '重訓' && `${ex.weight}kg · ${ex.reps}r · ${ex.setsCount}s`}
                  {ex.category === '有氧' && `坡度: ${ex.incline} · 時間: ${ex.duration}min`}
                  {ex.category === '伸展' && `次數: ${ex.reps} · 時間: ${ex.duration} · ${ex.note}`}
                  {(ex.category === '網球' || ex.category === '其他') && ex.note}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); const updated = dayData.exercises.filter((item:any)=>item.id !== ex.id); const newData = {...motionData, [selectedDate]: {...dayData, exercises: updated}}; setMotionData(newData); syncData(newData); }} className="text-slate-200 hover:text-rose-400">✕</button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}