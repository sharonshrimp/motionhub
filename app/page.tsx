"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export default function MotionHub() {
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [motionData, setMotionData] = useState<any>({});
  
  // 基礎輸入狀態
  const [category, setCategory] = useState('重訓');
  const [exerciseName, setExerciseName] = useState('');
  
  // 各類別專屬數據狀態
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [setsCount, setSetsCount] = useState('');
  const [incline, setIncline] = useState('');
  const [duration, setDuration] = useState('');
  const [note, setNote] = useState('');
  
  const [editingId, setEditingId] = useState<number | null>(null);

  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  const categories = ["重訓", "網球", "有氧", "伸展", "其他"];

  // --- 關鍵修復：定義 currentWeek 邏輯 ---
  const currentWeek = useMemo(() => {
    const tempDate = new Date(viewDate);
    const day = tempDate.getDay();
    // 調整至週一起始
    const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(new Date(viewDate).setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toLocaleDateString('en-CA');
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

  const loadLastData = () => {
    if (!exerciseName) return;
    const sortedDates = Object.keys(motionData).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    for (const date of sortedDates) {
      const ex = motionData[date].exercises?.find((e: any) => e.name.trim() === exerciseName.trim());
      if (ex) {
        setCategory(ex.category || '重訓');
        setWeight(ex.weight?.toString() || '');
        setReps(ex.reps?.toString() || '');
        setSetsCount(ex.setsCount?.toString() || '');
        setIncline(ex.incline || '');
        setDuration(ex.duration || '');
        setNote(ex.note || '');
        return;
      }
    }
  };

  const saveExercise = () => {
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
    setCategory(ex.category); 
    setExerciseName(ex.name);
    setWeight(ex.weight?.toString() || ''); 
    setReps(ex.reps?.toString() || ''); 
    setSetsCount(ex.setsCount?.toString() || '');
    setIncline(ex.incline || ''); 
    setDuration(ex.duration || ''); 
    setNote(ex.note || '');
    setEditingId(ex.id);
  };

  const changeWeek = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + (offset * 7));
    setViewDate(newDate);
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400 font-bold animate-pulse">YC MOTION HUB SYNCING...</div>;

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-800 p-5 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        <header className="mb-6 flex justify-between items-center px-1">
          <h1 className="text-xl font-black italic tracking-tight uppercase">YC <span className="text-indigo-500">Motion</span></h1>
          <button onClick={() => { setViewDate(new Date()); setSelectedDate(new Date().toLocaleDateString('en-CA')); }} className="text-[10px] font-black bg-slate-100 px-4 py-2 rounded-full text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all">回今天</button>
        </header>

        {/* 1. 週規劃區 */}
        <section className="mb-6 bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4 px-2">
            <button onClick={() => changeWeek(-1)} className="p-2 text-slate-300 hover:text-indigo-500">◀</button>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {new Date(currentWeek[0]).getMonth() + 1}月 {new Date(currentWeek[0]).getDate()} - {new Date(currentWeek[6]).getDate()}
            </span>
            <button onClick={() => changeWeek(1)} className="p-2 text-slate-300 hover:text-indigo-500">▶</button>
          </div>
          <div className="space-y-1">
            {currentWeek.map((dateStr) => {
              const d = new Date(dateStr);
              return (
                <div key={dateStr} className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${dateStr === selectedDate ? 'bg-indigo-50/50' : ''}`}>
                  <button onClick={() => { setSelectedDate(dateStr); resetForm(); }} className="flex flex-col items-center w-8 shrink-0">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">W{weekdays[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                    <span className={`text-sm font-black ${dateStr === selectedDate ? 'text-indigo-600 underline underline-offset-8 decoration-2' : 'text-slate-700'}`}>{d.getDate()}</span>
                  </button>
                  <input className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-slate-600 placeholder:text-slate-200" placeholder="輸入計畫..." value={motionData[dateStr]?.plan || ''} onChange={(e) => {
                    const newData = { ...motionData, [dateStr]: { ...(motionData[dateStr] || {}), plan: e.target.value } };
                    setMotionData(newData); sync