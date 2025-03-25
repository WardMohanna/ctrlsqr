"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface IEmployeeWorkLog {
  employee: string;
  startTime: string; // or Date
  endTime?: string; // or Date
}

interface ProductionTask {
  _id: string;
  // For production tasks, product is defined; for constant tasks, product may be undefined
  product?: {
    _id: string;
    itemName: string;
  };
  plannedQuantity: number;
  productionDate: string; // ISO date string
  status: "Pending" | "InProgress" | "Completed" | "Cancelled";
  employeeWorkLogs: IEmployeeWorkLog[];
  // Additional fields
  producedQuantity?: number;
  defectedQuantity?: number;
  // For constant tasks, the server will save the taskName field
  taskName?: string;
  taskType?: string;
}

export default function ProductionTasksPage() {
  const router = useRouter();

  const [allTasks, setAllTasks] = useState<ProductionTask[]>([]);
  const [error, setError] = useState<string | null>(null);

  // For the modal
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // The "current user" ID
  const employeeId = "employee123";

  // ---------------------------
  // Initial fetch of tasks
  // ---------------------------
  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/production/tasks");
      const data: ProductionTask[] = await res.json();
      setAllTasks(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tasks.");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // -------------------------------------
  // Derive pool vs. myTasks from allTasks
  // -------------------------------------
  // Only production tasks (taskType "Production") appear in the pool.
  const pool = allTasks.filter(
    (task) =>
      task.taskType === "Production" &&
      !task.employeeWorkLogs.some((log) => log.employee === employeeId)
  );

  const myTasks = allTasks.filter((task) =>
    task.employeeWorkLogs.some((log) => log.employee === employeeId)
  );

  function isRecordingNow(task: ProductionTask): boolean {
    return task.employeeWorkLogs.some(
      (log) => log.employee === employeeId && !log.endTime
    );
  }

  // Local "start/reopen" update
  function localAddLog(taskId: string) {
    setAllTasks((prev) =>
      prev.map((task) => {
        if (task._id === taskId) {
          return {
            ...task,
            employeeWorkLogs: [
              ...task.employeeWorkLogs,
              {
                employee: employeeId,
                startTime: new Date().toISOString(),
              },
            ],
          };
        }
        return task;
      })
    );
  }

  function localRemoveDummyLog(taskId: string) {
    setAllTasks((prev) =>
      prev.map((task) => {
        if (task._id === taskId) {
          const filtered = task.employeeWorkLogs.filter(
            (log) => !(log.employee === employeeId && !log.endTime)
          );
          return { ...task, employeeWorkLogs: filtered };
        }
        return task;
      })
    );
  }

  function getStartOrReopen(task: ProductionTask): "start" | "reopen" {
    const userLogs = task.employeeWorkLogs.filter(
      (log) => log.employee === employeeId
    );
    return userLogs.length === 0 ? "start" : "reopen";
  }

  const handleCardClick = async (task: ProductionTask) => {
    const action = getStartOrReopen(task);
    const label = action === "start" ? "Start" : "Reopen";
    const displayName =
      task.taskType === "Production"
        ? task.product?.itemName
        : task.taskName || "Task";

    const confirmed = window.confirm(`${label} working on "${displayName}"?`);
    if (!confirmed) return;

    // local add
    localAddLog(task._id);

    try {
      const res = await fetch(`/api/production/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: employeeId, action }),
      });
      if (!res.ok) {
        throw new Error(`Failed to ${action} the task`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      localRemoveDummyLog(task._id);
    }
  };

  // Stop logic
  function localStopLog(taskId: string) {
    setAllTasks((prev) =>
      prev.map((task) => {
        if (task._id === taskId) {
          const updatedLogs = task.employeeWorkLogs.map((log) => {
            if (log.employee === employeeId && !log.endTime) {
              return { ...log, endTime: new Date().toISOString() };
            }
            return log;
          });
          return { ...task, employeeWorkLogs: updatedLogs };
        }
        return task;
      })
    );
  }

  function localRevertStop(taskId: string) {
    setAllTasks((prev) =>
      prev.map((task) => {
        if (task._id === taskId) {
          const updatedLogs = task.employeeWorkLogs.map((log) => {
            if (log.employee === employeeId && log.endTime) {
              const { endTime, ...rest } = log;
              return rest;
            }
            return log;
          });
          return { ...task, employeeWorkLogs: updatedLogs };
        }
        return task;
      })
    );
  }

  const handleStop = async (task: ProductionTask) => {
    const displayName =
      task.taskType === "Production"
        ? task.product?.itemName
        : task.taskName || "Task";

    const confirmed = window.confirm(`Stop working on "${displayName}"?`);
    if (!confirmed) return;

    // local stop
    localStopLog(task._id);

    try {
      const res = await fetch(`/api/production/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee: employeeId, action: "stop" }),
      });
      if (!res.ok) {
        throw new Error("Failed to stop the task");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      localRevertStop(task._id);
    }
  };

  // ---------------------------------------
  // "End & Summarize" + Modal Implementation
  // ---------------------------------------
  function handleEndAndSummarize() {
    setShowSummaryModal(true);
  }

  function handleCancelSummary() {
    setShowSummaryModal(false);
  }

  async function handleApproveSummary(taskUpdates: Record<string, { produced: number; defected: number }>) {
    try {
      const updatePromises = Object.entries(taskUpdates).map(([taskId, vals]) =>
        fetch(`/api/production/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setQuantities",
            producedQuantity: vals.produced,
            defectedQuantity: vals.defected,
          }),
        })
      );
      await Promise.all(updatePromises);

      const taskIds = myTasks.map((t) => t._id);
      const finalizeRes = await fetch("/api/production/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      if (!finalizeRes.ok) {
        const data = await finalizeRes.json();
        alert("Failed to finalize tasks: " + data.error);
      } else {
        alert("Summary approved & tasks finalized!");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error finalizing tasks: " + err.message);
    }

    setShowSummaryModal(false);
    fetchTasks();
  }

  function getUserLogSummary() {
    const summary: {
      taskId: string;
      taskName: string;
      startTime: Date;
      endTime: Date | null;
      durationMS: number;
    }[] = [];

    for (const task of myTasks) {
      const userLogs = task.employeeWorkLogs.filter(
        (log) => log.employee === employeeId
      );
      for (const log of userLogs) {
        const start = new Date(log.startTime);
        const end = log.endTime ? new Date(log.endTime) : null;
        const endTimeForCalc = end ?? new Date();
        const duration = endTimeForCalc.getTime() - start.getTime();

        summary.push({
          taskId: task._id,
          taskName:
            task.taskType === "Production"
              ? task.product?.itemName || "Production Task"
              : task.taskName || "Task",
          startTime: start,
          endTime: end,
          durationMS: duration,
        });
      }
    }

    return summary;
  }

  function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  // ------------------------------------
  // Constant tasks section
  // ------------------------------------
  const constantTasks = [
    { taskType: "Cleaning", taskName: "Cleaning Task" },
    { taskType: "Packaging", taskName: "Packaging Task" },
    { taskType: "Break", taskName: "Break Task" },
    { taskType: "Selling", taskName: "Selling Task" },
  ];

  // Modified constant task handler: Instead of calling PUT and fetchTasks,
  // we manually update the local state so the constant task immediately appears in My Tasks.
  const handleConstantTaskClick = async (task: { taskType: string; taskName: string }) => {
    const confirmed = window.confirm(`Create constant task "${task.taskName}"?`);
    if (!confirmed) return;
    try {
      const res = await fetch("/api/production/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType: task.taskType,
          productionDate: new Date().toISOString(),
          plannedQuantity: 0,
          taskName: task.taskName,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create constant task");
      }
      const responseData = await res.json();
      const createdTask: ProductionTask = responseData.task;
      alert("Constant task created successfully!");

      // Manually update local state with a dummy work log so it appears in My Tasks.
      const updatedTask: ProductionTask = {
        ...createdTask,
        employeeWorkLogs: [{ employee: employeeId, startTime: new Date().toISOString() }],
      };
      setAllTasks((prev) => [...prev, updatedTask]);
    } catch (err: any) {
      alert("Error creating constant task: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 text-sm">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
        >
          ← Back
        </button>

        {/* "End & Summarize" Button */}
        <button
          onClick={handleEndAndSummarize}
          className="ml-4 mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
        >
          End & Summarize
        </button>

        <h1 className="text-2xl font-bold text-center mb-8 text-white">
          Production Tasks
        </h1>

        {error && (
          <p className="text-red-500 text-center mb-4 font-semibold">{error}</p>
        )}

        {/* Constant Tasks Section */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-2 text-white">Constant Tasks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {constantTasks.map((task) => (
              <div
                key={task.taskType}
                className="w-[180px] p-2 rounded shadow hover:scale-105 transform transition cursor-pointer bg-teal-600 text-white"
                onClick={() => handleConstantTaskClick(task)}
              >
                <h3 className="font-semibold text-base">{task.taskName}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Task Pool */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-2 text-white">Task Pool</h2>
          <p className="text-white text-xs mb-3">
            (Tap a card to start or reopen the task)
          </p>
          {pool.length === 0 ? (
            <p className="text-gray-200">No tasks available in the pool.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {pool.map((task, i) => (
                <div
                  key={task._id}
                  className={`w-[180px] p-2 rounded shadow hover:scale-105 transform transition cursor-pointer ${
                    pastelCardColors[i % pastelCardColors.length]
                  }`}
                  onClick={() => handleCardClick(task)}
                >
                  <h3 className="font-semibold text-base">
                    {task.taskType === "Production"
                      ? task.product?.itemName
                      : task.taskName}
                  </h3>
                  <p className="mt-1">Qty: {task.plannedQuantity}</p>
                  <p className="mt-1">
                    {new Date(task.productionDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Tasks */}
        <section>
          <h2 className="text-lg font-bold mb-2 text-white">My Tasks</h2>
          <p className="text-white text-xs mb-3">
            (Active tasks are lighter; ended tasks are darker)
          </p>
          {myTasks.length === 0 ? (
            <p className="text-gray-200">You have no tasks yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-gray-800 rounded">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 border-b border-gray-600 text-white">
                      Task
                    </th>
                    <th className="px-3 py-2 border-b border-gray-600 text-white">
                      Qty
                    </th>
                    <th className="px-3 py-2 border-b border-gray-600 text-white">
                      Date
                    </th>
                    <th className="px-3 py-2 border-b border-gray-600 text-white">
                      Active?
                    </th>
                    <th className="px-3 py-2 border-b border-gray-600 text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.map((task) => {
                    const active = isRecordingNow(task);
                    const rowColor = active ? "bg-gray-700" : "bg-gray-900";

                    return (
                      <tr
                        key={task._id}
                        className={`${rowColor} hover:bg-gray-700 text-white`}
                      >
                        <td className="px-3 py-2 border-b border-gray-600 font-semibold">
                          {task.taskType === "Production"
                            ? task.product?.itemName
                            : task.taskName}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-600">
                          {task.plannedQuantity}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-600">
                          {new Date(task.productionDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-600">
                          {active ? "Yes" : "No"}
                        </td>
                        <td className="px-3 py-2 border-b border-gray-600 space-x-2">
                          {active ? (
                            <button
                              onClick={() => handleStop(task)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition"
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCardClick(task)}
                              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition"
                            >
                              Reopen
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* SUMMARY MODAL */}
      {showSummaryModal && (
        <SummaryModal
          onClose={handleCancelSummary}
          onApprove={handleApproveSummary}
          tasks={myTasks}
          employeeId={employeeId}
        />
      )}
    </div>
  );
}

// Some pastel classes for the pool cards
const pastelCardColors = [
  "bg-blue-200 text-black",
  "bg-green-200 text-black",
  "bg-yellow-200 text-black",
  "bg-pink-200 text-black",
  "bg-teal-200 text-black",
  "bg-purple-200 text-black",
];

// -------------------------------------
// SummaryModal Component
// -------------------------------------
function SummaryModal({
  onClose,
  onApprove,
  tasks,
  employeeId,
}: {
  onClose: () => void;
  onApprove: (taskUpdates: Record<string, { produced: number; defected: number }>) => void;
  tasks: ProductionTask[];
  employeeId: string;
}) {
  const [taskQuantities, setTaskQuantities] = useState<
    Record<string, { produced: number; defected: number }>
  >({});

  useEffect(() => {
    const init: Record<string, { produced: number; defected: number }> = {};
    tasks.forEach((t) => {
      // @ts-ignore - if your server doesn't return them, default to 0
      const prod = (t as any).producedQuantity ?? 0;
      // @ts-ignore
      const def = (t as any).defectedQuantity ?? 0;
      init[t._id] = { produced: prod, defected: def };
    });
    setTaskQuantities(init);
  }, [tasks]);

  const handleChange = (
    taskId: string,
    field: "produced" | "defected",
    value: number
  ) => {
    setTaskQuantities((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value,
      },
    }));
  };

  function handleApproveClick() {
    onApprove(taskQuantities);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-800 p-6 rounded shadow-lg max-w-3xl w-full text-white">
        <h2 className="text-xl font-bold mb-4">Finalize Production</h2>
        <p className="mb-4">
          Please enter the <strong>produced</strong> and{" "}
          <strong>defected</strong> quantities for each task before finalizing.
        </p>
        {tasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-3 py-2 border-b border-gray-600">Task</th>
                <th className="px-3 py-2 border-b border-gray-600">
                  Produced Qty
                </th>
                <th className="px-3 py-2 border-b border-gray-600">
                  Defected Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const rowVals =
                  taskQuantities[t._id] || { produced: 0, defected: 0 };
                return (
                  <tr key={t._id} className="border-b border-gray-600">
                    <td className="px-3 py-2">
                      {t.taskType === "Production"
                        ? t.product?.itemName
                        : t.taskName}
                    </td>
                    <td className="px-3 py-2">
                      {t.taskType === "Production" ? (
                        <input
                          type="number"
                          className="w-20 p-1 bg-gray-700 text-white rounded"
                          value={rowVals.produced}
                          onChange={(e) =>
                            handleChange(t._id, "produced", Number(e.target.value))
                          }
                        />
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {t.taskType === "Production" ? (
                        <input
                          type="number"
                          className="w-20 p-1 bg-gray-700 text-white rounded"
                          value={rowVals.defected}
                          onChange={(e) =>
                            handleChange(t._id, "defected", Number(e.target.value))
                          }
                        />
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApproveClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition"
          >
            Approve & Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Pastel row colors for the summary table
const summaryRowColors = [
  "bg-blue-200 text-black",
  "bg-green-200 text-black",
  "bg-yellow-200 text-black",
  "bg-pink-200 text-black",
  "bg-teal-200 text-black",
  "bg-purple-200 text-black",
];
