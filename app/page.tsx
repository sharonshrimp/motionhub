"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [motionData, setMotionData] = useState<any>({});
  
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState([{ weight: '', reps: '' }]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  // --- 週規劃邏輯 ---
  const updatePlan = (dateStr: string, text: string) => {
    const targetDay = motionData[dateStr] || { exercises: [], plan: '', totalVolume: 0 };
    const newData = { ...motionData, [dateStr]: { ...targetDay, plan: text } };
    setMotionData(newData);
    syncData(newData);
  };

  const addSet = () => setSets([...sets, { weight: '', reps: '' }]);
  
  const saveExercise = () => {
    if (!exerciseName) return;
    const exerciseVolume = sets.reduce((acc, set) => acc + (Number(set.weight) * Number(set.reps)), 0);
    const newExercise = {
      id: Date.now(),
      name: exerciseName,
      sets: sets.map(s => ({ weight: Number(s.weight), reps: Number(s.reps) })),
      volume: exerciseVolume
    };
    const newDayData = {
      ...dayData,
      exercises: [...(dayData.exercises || []), newExercise],
      totalVolume: (dayData.totalVolume || 0) + exerciseVolume
    };
    const newData = { ...motionData, [selectedDate]: newDayData };
    setMotionData(newData);
    syncData(newData);
    setExerciseName('');
    setSets([{ weight: '', reps: '' }]);
  };

  // 獲取本週日期 (Sun-Sat)
  const currentWeek = useMemo(() => {
    const now = new Date(selectedDate);
    const start = new Date(now.setDate(now.getDate() - now.getDay()));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toLocaleDateString('en-CA');
    });
  }, [selectedDate]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-medium">Loading YC's Hub...</div>;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800 p-5 pb-20 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Header - 簡約風 */}
        <header className="mb-8 pt-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            YC'S <span className="text-indigo-600">MOTION</span>
          </h1>
          <div className="flex justify-between items-center mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strength & Roadmap</p>
            <span className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">
              Vol: {dayData.totalVolume?.toLocaleString()} kg
            </span>
          </div>
        </header>

        {/* 1. Weekly Roadmap - 這是妳要的整週規劃清單 */}
        <section className="mb-8 bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>📅</span> Weekly Roadmap
          </h3>
          <div className="space-y-3">
            {currentWeek.map((dateStr) => {
              const d = new Date(dateStr);
              const isToday = dateStr === selectedDate;
              return (
                <div key={dateStr} className={`group flex items-start gap-3 p-3 rounded-2xl transition-all ${isToday ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : 'hover:bg-slate-50'}`}>
                  <button onClick={() => setSelectedDate(dateStr)} className="flex flex-col items-center w-10 shrink-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{weekdays[d.getDay()]}</span>
                    <span className={`text-sm font-black ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </button>
                  <input 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-600 placeholder:text-slate-300"
                    placeholder="Click to set plan..."
                    value={motionData[dateStr]?.plan || ''}
                    onChange={(e) => updatePlan(dateStr, e.target.value)}
                  />
                  {motionData[dateStr]?.exercises?.length > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Done</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 動態訓練錄入模組 */}
        <section className="bg-white rounded-[2rem] p-6 mb-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-sm font-black text-slate-800">Log Exercise</h3>
            <span className="text-[10px] text-slate-400 font-bold italic">{new Date(selectedDate).toLocaleDateString()}</span>
          </div>
          
          <input 
            className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none mb-4 border border-transparent focus:border-indigo-100 placeholder:text-slate-300"
            placeholder="Exercise Name (e.g., Squat)"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
          />

          <div className="space-y-3 mb-6">
            {sets.map((set, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                  {idx + 1}
                </div>
                <input type="number" placeholder="Weight" className="flex-1 bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white focus:ring-1 ring-indigo-100" value={set.weight} onChange={(e) => {
                  const newSets = [...sets]; newSets[idx].weight = e.target.value; setSets(newSets);
                }} />
                <span className="text-slate-300 font-bold">×</span>
                <input type="number" placeholder="Reps" className="flex-1 bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white focus:ring-1 ring-indigo-100" value={set.reps} onChange={(e) => {
                  const newSets = [...sets]; newSets[idx].reps = e.target.value; setSets(newSets);
                }} />
              </div>
            ))}
            <button onClick={addSet} className="w-full py-2.5 border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-[10px] font-black uppercase hover:border-indigo-100 hover:text-indigo-300 transition-all">+ Add Set</button>
          </div>

          <button onClick={saveExercise} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs tracking-[0.15em] shadow-lg shadow-slate-200 active:scale-95 transition-all">
            Save Record
          </button>
        </section>

        {/* 3. Session Details */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed Sets</h3>
          </div>
          {dayData.exercises?.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-300 font-bold text-sm italic">
              No exercise recorded for this date.
            </div>
          ) : (
            dayData.exercises?.map((ex: any) => (
              <div key={ex.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-base font-black text-slate-800">{ex.name}</h4>
                    <p className="text-[9px] font-bold text-indigo-500 uppercase">Volume: {ex.volume.toLocaleString()} kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Est. 1RM</p>
                    <p className="text-sm font-black text-slate-700">{Math.round(ex.sets[0]?.weight * (36 / (37 - ex.sets[0]?.reps)))} kg</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ex.sets.map((s: any, i: number) => (
                    <div key={i} className="bg-slate-50 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-500">
                      {s.weight} <span className="opacity-50 font-normal">kg</span> × {s.reps}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}