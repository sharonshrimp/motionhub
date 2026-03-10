"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [motionData, setMotionData] = useState<any>({});
  
  // 精簡後的輸入狀態
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [setsCount, setSetsCount] = useState('');

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

  // --- 週規劃邏輯 (Mon-Sun) ---
  const updatePlan = (dateStr: string, text: string) => {
    const targetDay = motionData[dateStr] || { exercises: [], plan: '', totalVolume: 0 };
    const newData = { ...motionData, [dateStr]: { ...targetDay, plan: text } };
    setMotionData(newData);
    syncData(newData);
  };

  const saveExercise = () => {
    if (!exerciseName || !weight || !reps || !setsCount) return;
    
    // 計算單一動作總量：重量 x 次數 x 組數
    const vol = Number(weight) * Number(reps) * Number(setsCount);
    const newExercise = {
      id: Date.now(),
      name: exerciseName,
      weight: Number(weight),
      reps: Number(reps),
      setsCount: Number(setsCount),
      volume: vol
    };

    const newDayData = {
      ...dayData,
      exercises: [...(dayData.exercises || []), newExercise],
      totalVolume: (dayData.totalVolume || 0) + vol
    };

    const newData = { ...motionData, [selectedDate]: newDayData };
    setMotionData(newData);
    syncData(newData);
    
    // 清空輸入框
    setExerciseName('');
    setWeight('');
    setReps('');
    setSetsCount('');
  };

  // 獲取本週日期 (從週一開始)
  const currentWeek = useMemo(() => {
    const now = new Date(selectedDate);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 調整至週一
    const start = new Date(now.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toLocaleDateString('en-CA');
    });
  }, [selectedDate]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium">載入中...</div>;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800 p-5 pb-20 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <header className="mb-6 pt-4 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              MOTION <span className="text-indigo-600">HUB</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Strength Roadmap</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 block uppercase">今日訓練總量</span>
            <span className="text-lg font-black text-indigo-600">{dayData.totalVolume?.toLocaleString()} <small className="text-[10px] text-slate-400">KG</small></span>
          </div>
        </header>

        {/* 1. Weekly Roadmap - 從週一開始的清單 */}
        <section className="mb-6 bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
          <div className="space-y-2">
            {currentWeek.map((dateStr) => {
              const d = new Date(dateStr);
              const isToday = dateStr === selectedDate;
              return (
                <div key={dateStr} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isToday ? 'bg-indigo-50/50' : ''}`}>
                  <button onClick={() => setSelectedDate(dateStr)} className="flex flex-col items-center w-8 shrink-0">
                    <span className="text-[8px] font-bold text-slate-400">週{weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                    <span className={`text-sm font-black ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </button>
                  <input 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-600 placeholder:text-slate-300"
                    placeholder="點擊輸入本週安排..."
                    value={motionData[dateStr]?.plan || ''}
                    onChange={(e) => updatePlan(dateStr, e.target.value)}
                  />
                  {motionData[dateStr]?.exercises?.length > 0 && (
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 快速輸入模組 - 一次完成名稱、重量、次數、組數 */}
        <section className="bg-white rounded-[2rem] p-5 mb-6 shadow-sm border border-slate-100">
          <h3 className="text-xs font-black text-slate-800 mb-4">快速記錄動作</h3>
          
          <input 
            className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none mb-3 border border-transparent focus:bg-white focus:border-indigo-100"
            placeholder="動作名稱 (如：臥推)"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <label className="text-[9px] font-bold text-slate-400 ml-1 mb-1 block">重量 (KG)</label>
              <input type="number" className="w-full bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 ml-1 mb-1 block">次數 (REPS)</label>
              <input type="number" className="w-full bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 ml-1 mb-1 block">組數 (SETS)</label>
              <input type="number" className="w-full bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white text-indigo-600" value={setsCount} onChange={(e) => setSetsCount(e.target.value)} />
            </div>
          </div>

          <button onClick={saveExercise} className="w-full py-3.5 bg-slate-900 text-white font-black rounded-xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">
            儲存今日數據
          </button>
        </section>

        {/* 3. 訓練明細 */}
        <section className="space-y-3">
          {dayData.exercises?.map((ex: any) => (
            <div key={ex.id} className="bg-white px-4 py-3 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-800 italic">{ex.name}</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {ex.weight}kg × {ex.reps}次 × {ex.setsCount}組
                </span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-bold text-slate-300 block uppercase tracking-tighter">VOLUME</span>
                <span className="text-sm font-black text-slate-600">{ex.volume.toLocaleString()} <small className="text-[8px] opacity-50">KG</small></span>
              </div>
            </div>
          ))}
        </section>

      </div>
    </main>
  );
}