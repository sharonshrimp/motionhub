"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [motionData, setMotionData] = useState<any>({});
  
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [setsCount, setSetsCount] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

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

  const changeWeek = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + (offset * 7));
    setViewDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDate(today.toLocaleDateString('en-CA'));
  };

  const currentWeek = useMemo(() => {
    const tempDate = new Date(viewDate);
    const day = tempDate.getDay();
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(new Date(viewDate).setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toLocaleDateString('en-CA');
    });
  }, [viewDate]);

  const saveExercise = () => {
    if (!exerciseName || !weight || !reps || !setsCount) return;
    const vol = Number(weight) * Number(reps) * Number(setsCount);
    let updatedExercises = [...(dayData.exercises || [])];

    if (editingId) {
      updatedExercises = updatedExercises.map(ex => 
        ex.id === editingId ? { ...ex, name: exerciseName, weight: Number(weight), reps: Number(reps), setsCount: Number(setsCount), volume: vol } : ex
      );
    } else {
      updatedExercises.push({ id: Date.now(), name: exerciseName, weight: Number(weight), reps: Number(reps), setsCount: Number(setsCount), volume: vol });
    }

    const newTotalVolume = updatedExercises.reduce((acc, ex) => acc + ex.volume, 0);
    const newData = { ...motionData, [selectedDate]: { ...dayData, exercises: updatedExercises, totalVolume: newTotalVolume } };
    setMotionData(newData);
    syncData(newData);
    resetForm();
  };

  const deleteExercise = (id: number) => {
    const updatedExercises = dayData.exercises.filter((ex: any) => ex.id !== id);
    const newTotalVolume = updatedExercises.reduce((acc: number, ex: any) => acc + ex.volume, 0);
    const newData = { ...motionData, [selectedDate]: { ...dayData, exercises: updatedExercises, totalVolume: newTotalVolume } };
    setMotionData(newData);
    syncData(newData);
  };

  const startEdit = (ex: any) => {
    setExerciseName(ex.name); setWeight(ex.weight.toString());
    setReps(ex.reps.toString()); setSetsCount(ex.setsCount.toString());
    setEditingId(ex.id);
  };

  const resetForm = () => {
    setExerciseName(''); setWeight(''); setReps(''); setSetsCount(''); setEditingId(null);
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400 font-medium italic">MOTION HUB SYNCING...</div>;

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-800 p-5 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-xl font-black italic tracking-tight">YC <span className="text-indigo-500">MOTION</span></h1>
          <button onClick={goToToday} className="text-[10px] font-black bg-slate-100 px-3 py-1.5 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all">回今天</button>
        </header>

        {/* 1. 跨週切換與週規劃 */}
        <section className="mb-6 bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4 px-2">
            <button onClick={() => changeWeek(-1)} className="p-2 text-slate-300 hover:text-indigo-500">◀</button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {new Date(currentWeek[0]).getMonth() + 1}月 {new Date(currentWeek[0]).getDate()} - {new Date(currentWeek[6]).getDate()}
            </span>
            <button onClick={() => changeWeek(1)} className="p-2 text-slate-300 hover:text-indigo-500">▶</button>
          </div>

          <div className="space-y-1">
            {currentWeek.map((dateStr) => {
              const d = new Date(dateStr);
              const isSelected = dateStr === selectedDate;
              return (
                <div key={dateStr} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <button onClick={() => { setSelectedDate(dateStr); resetForm(); }} className="flex flex-col items-center w-8 shrink-0">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">W{weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                    <span className={`text-sm font-black ${isSelected ? 'text-indigo-600 underline underline-offset-4' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </button>
                  <input 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-600 placeholder:text-slate-200"
                    placeholder="今日計畫..."
                    value={motionData[dateStr]?.plan || ''}
                    onChange={(e) => {
                      const newData = { ...motionData, [dateStr]: { ...(motionData[dateStr] || {}), plan: e.target.value } };
                      setMotionData(newData); syncData(newData);
                    }}
                  />
                  {motionData[dateStr]?.exercises?.length > 0 && <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full"></div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 紀錄項目區 - 加入日期選擇器 */}
        <section className="bg-white rounded-[2rem] p-6 mb-6 shadow-sm border border-slate-100 border-t-4 border-t-indigo-500">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xs font-black text-slate-800 tracking-tighter uppercase">{editingId ? '編輯訓練' : '記錄訓練'}</h3>
            {/* 關鍵：獨立日期選擇，方便回溯紀錄 */}
            <input 
              type="date" 
              className="bg-slate-100 text-[11px] font-black p-2 rounded-lg text-indigo-600 border-none outline-none focus:ring-1 ring-indigo-200"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); resetForm(); }}
            />
          </div>
          
          <input className="w-full bg-slate-50 p-4 rounded-xl font-bold outline-none mb-3 border border-transparent focus:bg-white focus:border-indigo-100 transition-all placeholder:text-slate-300" placeholder="動作名稱 (如：深蹲)" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} />
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex flex-col gap-1">
               <span className="text-[9px] font-bold text-slate-400 ml-2">重量 (KG)</span>
               <input type="number" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[9px] font-bold text-slate-400 ml-2">次數 (REPS)</span>
               <input type="number" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[9px] font-bold text-slate-400 ml-2 text-indigo-500">組數 (SETS)</span>
               <input type="number" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white ring-1 ring-indigo-50" value={setsCount} onChange={(e) => setSetsCount(e.target.value)} />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={saveExercise} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 shadow-md transition-all">
              {editingId ? '確認更新' : '確認儲存'}
            </button>
            {editingId && <button onClick={resetForm} className="px-5 bg-slate-100 text-slate-400 rounded-2xl font-bold text-[10px]">取消</button>}
          </div>
        </section>

        {/* 3. 歷史紀錄明細 (對應選定日期) */}
        <section className="space-y-3">
          <div className="flex justify-between px-3 items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Exercise Log · {selectedDate}</h3>
            <span className="text-[11px] font-black text-indigo-600 tracking-tight">{dayData.totalVolume?.toLocaleString()} KG</span>
          </div>
          
          {dayData.exercises?.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-100 text-slate-300 font-bold italic text-xs">
              No workout recorded for this date.
            </div>
          ) : (
            dayData.exercises.map((ex: any) => (
              <div key={ex.id} className="bg-white px-5 py-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex justify-between items-center group animate-in fade-in slide-in-from-bottom-2">
                <div onClick={() => startEdit(ex)} className="cursor-pointer flex-1">
                  <span className="text-[15px] font-black text-slate-800 block leading-tight">{ex.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {ex.weight}kg × {ex.reps}r × {ex.setsCount}s
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-600">{ex.volume.toLocaleString()} <small className="opacity-20 text-[8px]">KG</small></span>
                  </div>
                  <button onClick={() => deleteExercise(ex.id)} className="text-slate-100 hover:text-rose-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
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