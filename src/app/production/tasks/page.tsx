"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface ProductionTask {
  _id: string;
  product: {
    _id: string;
    itemName: string;
  };
  plannedQuantity: number;
  productionDate: string; // ISO date string
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
}

export default function ProductionTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<ProductionTask[]>([]);
  const [activeTask, setActiveTask] = useState<ProductionTask | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // For demo purposes, assume we have an employee ID.
  const employeeId = "employee123";

  // For now, we're not filtering by date.
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch tasks from the API.
  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/production/tasks");
      const data: ProductionTask[] = await res.json();
      // Filter tasks with status Pending or InProgress.
      const filtered = data.filter(
        (task) =>
          // Uncomment the next line if you want to filter by today's date.
          // task.productionDate.slice(0, 10) === todayStr &&
          (task.status === "Pending" || task.status === "InProgress")
      );
      setTasks(filtered);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tasks.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Timer effect: start timer when an active task is set.
  useEffect(() => {
    if (activeTask) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1000);
      }, 1000);
    } else {
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTask]);

  // Format elapsed time as mm:ss.
  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Start work log for a task.
  const startTaskLog = async (task: ProductionTask) => {
    const confirmed = window.confirm(
      `Do you want to work on ${task.product.itemName}?`
    );
    if (!confirmed) return;

    try {
      // If another task is active, stop its log.
      if (activeTask && activeTask._id !== task._id) {
        await fetch(`/api/production/tasks/${activeTask._id}/log`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee: employeeId, action: "stop" }),
        });
      }
      // Start log for the selected task.
      const res = await fetch(`/api/production/tasks/${task._id}/log`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: employeeId, action: "start" }),
      });
      if (!res.ok) {
        throw new Error("Failed to start log for the task");
      }
      setActiveTask(task);
      setElapsed(0);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  // Stop work log for active task.
  const stopActiveTaskLog = async () => {
    if (!activeTask) return;
    try {
      await fetch(`/api/production/tasks/${activeTask._id}/log`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: employeeId, action: "stop" }),
      });
      setActiveTask(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold text-white text-center mb-4">
        Production Task Pool
      </h1>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      
      {/* Active Task Timer */}
      {activeTask ? (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 text-center">
          <h2 className="text-xl text-white mb-2">
            Working on: {activeTask.product.itemName}
          </h2>
          <p className="text-gray-300">Elapsed Time: {formatElapsed(elapsed)}</p>
          <button
            onClick={stopActiveTaskLog}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Stop Working
          </button>
        </div>
      ) : (
        <p className="text-center text-gray-300 mb-6">
          No active task. Tap a task to start working.
        </p>
      )}

      {/* Task Pool */}
      <div className="grid grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700 transition cursor-pointer"
            onClick={() => startTaskLog(task)}
          >
            <h3 className="text-white font-bold">{task.product.itemName}</h3>
            <p className="text-gray-300">Planned Qty: {task.plannedQuantity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
