// components/PopupModal.tsx
"use client";

import React from "react";

interface PopupModalProps {
  message: string;
  onConfirm?: () => void;   // when the user clicks Confirm
  onCancel: () => void;     // when the user clicks Cancel (or closes)
  type?: "success" | "error" | "info";
  confirmText?: string;     // label for confirm button
  cancelText?: string;      // label for cancel button
}

// styling by type
const typeStyles = {
  success: {
    title: "Success",
    color: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100",
    button: "bg-green-600 hover:bg-green-700",
  },
  error: {
    title: "Error",
    color: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100",
    button: "bg-red-600 hover:bg-red-700",
  },
  info: {
    title: "Info",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100",
    button: "bg-blue-600 hover:bg-blue-700",
  },
};

export default function PopupModal({
  message,
  onConfirm,
  onCancel,
  type = "info",
  confirmText = "OK",
  cancelText = "Cancel",
}: PopupModalProps) {
  const { title, color, button } = typeStyles[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg shadow-lg text-center w-11/12 max-w-md ${color} bg-white dark:bg-gray-800`}>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="mb-6">{message}</p>
        <div className="flex justify-center items-center gap-1 mb-6">
          {onConfirm && (
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`${button} text-white px-4 py-2 rounded-md`}
            >
              {confirmText}
            </button>
          )}
          <button
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-md"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
