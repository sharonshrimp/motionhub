"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [motionData, setMotionData] = useState<any>({});
  
  // 訓練輸入狀態
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

  // --- 邏輯：週計畫 ---
  const updatePlan = (text: string) => {
    const newData = { ...motionData, [selectedDate]: { ...dayData, plan: text } };
    setMotionData(newData);
    syncData(newData);
  };

  // --- 邏輯：動態訓練模組 ---
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

  // --- 邏輯：Master Table & 數據彙整 ---
  const masterExerciseList = useMemo(() => {
    const names = new Set();
    Object.values(motionData).forEach((day: any) => {
      day.exercises?.forEach((ex: any) => names.add(ex.name));
    });
    return Array.from(names);
  }, [motionData]);

  const getPR = (name: string) => {
    let maxWeight = 0;
    Object.values(motionData).forEach((day: any) => {
      day.exercises?.forEach((ex: any) => {
        if (ex.name === name) {
          ex.sets.forEach((s: any) => { if (s.weight > maxWeight) maxWeight = s.weight; });
        }
      });
    });
    return maxWeight;
  };

  const getWeekDays = () => {
    const current = new Date(selectedDate);
    const first = current.getDate() - current.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(new Date(selectedDate).setDate(first + i));
      return d.toLocaleDateString('en-CA');
    });
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-black">LOADING CORE...</div>;

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white p-6 pb-24">
      <div className="max-w-md mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black italic text-orange-500">MOTION HUB PRO</h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Strength & Strategy</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase block">Daily Vol</span>
            <span className="text-xl font-black text-white">{dayData.totalVolume?.toLocaleString()}</span>
          </div>
        </header>

        {/* 週計畫切換 */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-6 border-b border-zinc-900">
          {getWeekDays().map((dateStr) => {
            const d = new Date(dateStr);
            const isActive = dateStr === selectedDate;
            const hasPlan = motionData[dateStr]?.plan;
            const hasWorkout = motionData[dateStr]?.exercises?.length > 0;
            return (
              <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                className={`flex-shrink-0 w-12 h-20 rounded-2xl flex flex-col items-center justify-center border transition-all 
                ${isActive ? 'bg-orange-600 border-orange-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                <span className="text-[8px] uppercase font-bold">{weekdays[d.getDay()]}</span>
                <span className="text-lg font-black">{d.getDate()}</span>
                <div className="flex gap-1 mt-1">
                  {hasPlan && <div className="w-1 h-1 bg-blue-400 rounded-full"></div>}
                  {hasWorkout && <div className="w-1 h-1 bg-orange-400 rounded-full"></div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* 策略預排區 */}
        <section className="mb-8 bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800 shadow-inner">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Weekly Strategy / Plan</label>
          <textarea 
            rows={2}
            className="w-full bg-transparent outline-none font-bold text-zinc-200 placeholder:text-zinc-700 resize-none"
            placeholder="點擊輸入此日訓練計畫..."
            value={dayData.plan || ''}
            onChange={(e) => updatePlan(e.target.value)}
          />
        </section>

        {/* 動態訓練紀錄模組 */}
        <section className="bg-zinc-900 rounded-[2.5rem] p-6 mb-8 border border-zinc-800">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xs font-black text-orange-500 uppercase italic">Add Exercise</h3>
             {masterExerciseList.length > 0 && (
               <select 
                className="bg-zinc-800 text-[10px] font-bold p-1 rounded border-none outline-none"
                onChange={(e) => setExerciseName(e.target.value)}
                value={exerciseName}
               >
                 <option value="">快速選擇動作...</option>
                 {masterExerciseList.map((name: any) => <option key={name} value={name}>{name}</option>)}
               </select>
             )}
          </div>
          
          <input 
            className="w-full bg-zinc-800 p-4 rounded-xl font-black outline-none mb-4 placeholder:text-zinc-600"
            placeholder="動作名稱 (如：深蹲)"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
          />

          <div className="space-y-3 mb-6">
            {sets.map((set, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <span className="w-6 text-[10px] font-black text-zinc-600">#{idx + 1}</span>
                <input type="number" placeholder="KG" className="flex-1 bg-zinc-800 p-3 rounded-xl text-center font-bold" value={set.weight} onChange={(e) => {
                  const newSets = [...sets]; newSets[idx].weight = e.target.value; setSets(newSets);
                }} />
                <span className="text-zinc-700">×</span>
                <input type="number" placeholder="次" className="flex-1 bg-zinc-800 p-3 rounded-xl text-center font-bold" value={set.reps} onChange={(e) => {
                  const newSets = [...sets]; newSets[idx].reps = e.target.value; setSets(newSets);
                }} />
              </div>
            ))}
            <button onClick={addSet} className="w-full py-2 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 text-[10px] font-black uppercase hover:text-zinc-400 transition-all">+ Add Set</button>
          </div>

          <button onClick={saveExercise} className="w-full py-4 bg-white text-black font-black rounded-2xl uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all">
            Save Exercise Record
          </button>
        </section>

        {/* 訓練數據回饋 */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2 italic">Session Detail</h3>
          {dayData.exercises?.map((ex: any) => (
            <div key={ex.id} className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-black italic text-zinc-200">{ex.name}</h4>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                    Volume: {ex.volume.toLocaleString()} KG · PR: {getPR(ex.name)} KG
                  </p>
                </div>
                <div className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black italic">
                  Est. 1RM: {Math.round(ex.sets[0]?.weight * (36 / (37 - ex.sets[0]?.reps)))} KG
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ex.sets.map((s: any, i: number) => (
                  <div key={i} className="bg-zinc-800/50 px-3 py-1.5 rounded-lg text-xs font-black text-zinc-400">
                    {s.weight} <span className="text-[8px] opacity-50">kg</span> × {s.reps}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}