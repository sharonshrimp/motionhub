"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  // 控制目前「畫面顯示」的基準日期
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

  // --- 跨週邏輯 ---
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

  // --- 核心邏輯：計算週一至週日 ---
  const currentWeek = useMemo(() => {
    const tempDate = new Date(viewDate);
    const day = tempDate.getDay();
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(tempDate.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toLocaleDateString('en-CA');
    });
  }, [viewDate]);

  // --- 動作處理邏輯 (CRUD) ---
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

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400 font-medium italic">系統對接中...</div>;

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-800 p-5 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-xl font-black italic tracking-tight">YC <span className="text-indigo-500">MOTION</span></h1>
          <button onClick={goToToday} className="text-[10px] font-black bg-slate-100 px-3 py-1.5 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">今天</button>
        </header>

        {/* 1. 跨週切換與週曆 */}
        <section className="mb-6 bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4 px-2">
            <button onClick={() => changeWeek(-1)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors">◀</button>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {new Date(currentWeek[0]).getMonth() + 1}月 {new Date(currentWeek[0]).getDate()} - {new Date(currentWeek[6]).getDate()}
            </span>
            <button onClick={() => changeWeek(1)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors">▶</button>
          </div>

          <div className="space-y-1">
            {currentWeek.map((dateStr) => {
              const d = new Date(dateStr);
              const isSelected = dateStr === selectedDate;
              return (
                <div key={dateStr} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <button onClick={() => { setSelectedDate(dateStr); resetForm(); }} className="flex flex-col items-center w-8 shrink-0">
                    <span className="text-[8px] font-bold text-slate-400">週{weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                    <span className={`text-sm font-black ${isSelected ? 'text-indigo-600 underline underline-offset-4' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </button>
                  <input 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-600 placeholder:text-slate-200"
                    placeholder="點擊輸入計畫..."
                    value={motionData[dateStr]?.plan || ''}
                    onChange={(e) => {
                      const newData = { ...motionData, [dateStr]: { ...(motionData[dateStr] || {}), plan: e.target.value } };
                      setMotionData(newData); syncData(newData);
                    }}
                  />
                  {motionData[dateStr]?.exercises?.length > 0 && <div className="w-1 h-1 bg-indigo-300 rounded-full"></div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. 動作輸入區 */}
        <section className="bg-white rounded-[2rem] p-6 mb-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-800">{editingId ? '編輯項目' : '記錄項目'}</h3>
            <span className="text-[10px] font-bold text-indigo-400">{selectedDate}</span>
          </div>
          
          <input className="w-full bg-slate-50 p-3 rounded-xl font-bold outline-none mb-3 border border-transparent focus:bg-white focus:border-indigo-100" placeholder="動作名稱" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} />
          <div className="grid grid-cols-3 gap-2 mb-4">
            <input type="number" placeholder="重量 kg" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white" value={weight} onChange={(e) => setWeight(e.target.value)} />
            <input type="number" placeholder="次數 r" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white" value={reps} onChange={(e) => setReps(e.target.value)} />
            <input type="number" placeholder="組數 s" className="bg-slate-50 p-3 rounded-xl text-center font-bold outline-none focus:bg-white text-indigo-600" value={setsCount} onChange={(e) => setSetsCount(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveExercise} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">
              {editingId ? '確認修改' : '儲存紀錄'}
            </button>
            {editingId && <button onClick={resetForm} className="px-4 bg-slate-100 text-slate-400 rounded-xl font-bold text-[10px]">取消</button>}
          </div>
        </section>

        {/* 3. 當日明細 */}
        <section className="space-y-3">
          <div className="flex justify-between px-2 items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exercise Log</h3>
            <span className="text-[10px] font-black text-indigo-500">Day Total: {dayData.totalVolume?.toLocaleString()} kg</span>
          </div>
          {dayData.exercises?.length === 0 ? (
            <div className="text-center py-10 text-slate-200 font-bold italic text-xs">尚無訓練紀錄</div>
          ) : (
            dayData.exercises.map((ex: any) => (
              <div key={ex.id} className="bg-white px-4 py-4 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center">
                <div onClick={() => startEdit(ex)} className="cursor-pointer">
                  <span className="text-sm font-black text-slate-800 block">{ex.name}</span>
                  <span className="text-[10px] font-bold text-slate-400">{ex.weight}kg × {ex.reps} × {ex.setsCount}組</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-600">{ex.volume.toLocaleString()} <small className="opacity-30">KG</small></span>
                  <button onClick={() => deleteExercise(ex.id)} className="text-slate-200 hover:text-rose-400 text-sm">✕</button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}