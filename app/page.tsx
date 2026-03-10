"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [motionData, setMotionData] = useState<any>({});
  
  // 輸入與編輯狀態
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

  // --- 邏輯：週規劃編輯 ---
  const updatePlan = (dateStr: string, text: string) => {
    const targetDay = motionData[dateStr] || { exercises: [], plan: '', totalVolume: 0 };
    const newData = { ...motionData, [dateStr]: { ...targetDay, plan: text } };
    setMotionData(newData);
    syncData(newData);
  };

  // --- 邏輯：動作記錄 (儲存與更新) ---
  const saveExercise = () => {
    if (!exerciseName || !weight || !reps || !setsCount) return;
    
    const vol = Number(weight) * Number(reps) * Number(setsCount);
    let updatedExercises = [...(dayData.exercises || [])];

    if (editingId) {
      // 編輯模式
      updatedExercises = updatedExercises.map(ex => 
        ex.id === editingId ? { ...ex, name: exerciseName, weight: Number(weight), reps: Number(reps), setsCount: Number(setsCount), volume: vol } : ex
      );
    } else {
      // 新增模式
      updatedExercises.push({
        id: Date.now(),
        name: exerciseName,
        weight: Number(weight),
        reps: Number(reps),
        setsCount: Number(setsCount),
        volume: vol
      });
    }

    const newTotalVolume = updatedExercises.reduce((acc, ex) => acc + ex.volume, 0);
    const newData = { ...motionData, [selectedDate]: { ...dayData, exercises: updatedExercises, totalVolume: newTotalVolume } };
    
    setMotionData(newData);
    syncData(newData);
    resetForm();
  };

  // --- 邏輯：刪除紀錄 ---
  const deleteExercise = (id: number) => {
    const updatedExercises = dayData.exercises.filter((ex: any) => ex.id !== id);
    const newTotalVolume = updatedExercises.reduce((acc: number, ex: any) => acc + ex.volume, 0);
    const newData = { ...motionData, [selectedDate]: { ...dayData, exercises: updatedExercises, totalVolume: newTotalVolume } };
    setMotionData(newData);
    syncData(newData);
  };

  // --- 邏輯：進入編輯模式 ---
  const startEdit = (ex: any) => {
    setExerciseName(ex.name);
    setWeight(ex.weight.toString());
    setReps(ex.reps.toString());
    setSetsCount(ex.setsCount.toString());
    setEditingId(ex.id);
  };

  const resetForm = () => {
    setExerciseName(''); setWeight(''); setReps(''); setSetsCount(''); setEditingId(null);
  };

  // 獲取本週日期 (週一至週日)
  const currentWeek = useMemo(() => {
    const now = new Date(selectedDate);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(new Date(selectedDate).setDate(diff));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toLocaleDateString('en-CA');
    });
  }, [selectedDate]);

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400 font-medium italic">INITIALIZING ROADMAP...</div>;

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-800 p-5 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tight text-slate-900 italic">YC HUB <span className="text-indigo-500">.MOTION</span></h1>
          <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tighter">
            Total {dayData.totalVolume?.toLocaleString()} kg
          </div>
        </header>

        {/* 1. 日期選擇與週規劃清單 */}
        <section className="mb-6 bg-white rounded-3xl p-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-slate-100">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Weekly Schedule (Mon-Sun)</h2>
          <div className="space-y-1">
            {currentWeek.map((dateStr) => {
              const d = new Date(dateStr);
              const isToday = dateStr === selectedDate;
              return (
                <div key={dateStr} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isToday ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <button onClick={() => { setSelectedDate(dateStr); resetForm(); }} className="flex flex-col items-center w-8 shrink-0">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">W{weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                    <span className={`text-sm font-black ${isToday ? 'text-indigo-600 underline decoration-2 underline-offset-4' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </button>
                  <input 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-600 placeholder:text-slate-300"
                    placeholder="今日訓練規劃..."
                    value={motionData[dateStr]?.plan || ''}
                    onChange={(e) => updatePlan(dateStr, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 動作輸入/編輯區 (基於選定日期) */}
        <section className="bg-white rounded-[2rem] p-6 mb-6 shadow-sm border border-slate-100">
          <h3 className="text-xs font-black text-slate-800 mb-4 flex justify-between">
            {editingId ? '編輯動作' : '記錄今日動作'}
            <span className="text-indigo-500">{selectedDate}</span>
          </h3>
          
          <input className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none mb-3 border border-transparent focus:bg-white focus:border-indigo-100 transition-all" placeholder="動作名稱" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} />

          <div className="grid grid-cols-3 gap-2 mb-4">
            <input type="number" placeholder="重量 kg" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white focus:ring-1 ring-indigo-100" value={weight} onChange={(e) => setWeight(e.target.value)} />
            <input type="number" placeholder="次數 r" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white focus:ring-1 ring-indigo-100" value={reps} onChange={(e) => setReps(e.target.value)} />
            <input type="number" placeholder="組數 s" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white focus:ring-1 ring-indigo-100 text-indigo-600" value={setsCount} onChange={(e) => setSetsCount(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button onClick={saveExercise} className={`flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${editingId ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>
              {editingId ? '更新數據' : '儲存紀錄'}
            </button>
            {editingId && <button onClick={resetForm} className="px-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-[10px] uppercase">取消</button>}
          </div>
        </section>

        {/* 3. 當日所有動作列表 */}
        <section className="space-y-3">
          <div className="px-2 flex justify-between items-center">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Exercise Log</h3>
          </div>
          {dayData.exercises?.length === 0 ? (
            <div className="text-center py-10 text-slate-300 font-bold italic text-xs">No records for this day.</div>
          ) : (
            dayData.exercises.map((ex: any) => (
              <div key={ex.id} className="bg-white px-4 py-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group">
                <div onClick={() => startEdit(ex)} className="cursor-pointer">
                  <span className="text-sm font-black text-slate-800 block">{ex.name}</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {ex.weight}kg × {ex.reps}reps × {ex.setsCount}sets
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-600 block">{ex.volume.toLocaleString()} <small className="opacity-40">KG</small></span>
                  </div>
                  <button onClick={() => deleteExercise(ex.id)} className="text-slate-200 hover:text-rose-400 transition-colors text-sm px-2">✕</button>
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </main>
  );
}