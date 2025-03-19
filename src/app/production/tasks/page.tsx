"use client";

import { useState, useEffect, useRef } from "react";
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

  // Fetch tasks from the API.
  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/production/tasks");
      const data: ProductionTask[] = await res.json();
      // Filter tasks with status Pending or InProgress.
      const filtered = data.filter(
        (task) =>
          task.status === "Pending" || task.status === "InProgress"
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

  // Stop active task log using a dedicated function.
  const handleEndTask = async () => {
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

  // Reopen active task log using a dedicated function.
  const handleReopenTask = async () => {
    if (!activeTask) return;
    try {
      await fetch(`/api/production/tasks/${activeTask._id}/log`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: employeeId, action: "reopen" }),
      });
      // Optionally reset the elapsed timer.
      setElapsed(0);
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
            onClick={handleEndTask}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            End Task
          </button>
          <button
            onClick={handleReopenTask}
            className="mt-2 ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Reopen Task
          </button>
        </div>
      ) : (
        <p className="text-center text-gray-300 mb-6">
          No active task. Tap a task to start working.
        </p>
      )}

      {/* Task Pool Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-xl shadow-xl hover:scale-105 transform transition cursor-pointer"
            onClick={() => startTaskLog(task)}
          >
            <h3 className="text-white font-bold text-xl">
              {task.product.itemName}
            </h3>
            <p className="text-gray-100 mt-2">
              Planned Qty: {task.plannedQuantity}
            </p>
            <p className="text-gray-100 mt-1">
              Date: {new Date(task.productionDate).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {/* Active Task Details Table */}
      {activeTask && (
        <div className="overflow-x-auto mt-8">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="py-2 px-4 border">Task Name</th>
                <th className="py-2 px-4 border">User</th>
                <th className="py-2 px-4 border">Duration</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-gray-800">
                <td className="py-2 px-4 border">
                  {activeTask.product.itemName}
                </td>
                <td className="py-2 px-4 border">{employeeId}</td>
                <td className="py-2 px-4 border">{formatElapsed(elapsed)}</td>
                <td className="py-2 px-4 border space-x-2">
                  <button
                    onClick={() => alert("Edit functionality to be implemented.")}
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleReopenTask}
                    className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                  >
                    Reopen Task
                  </button>
                  <button
                    onClick={handleEndTask}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    End Task
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
