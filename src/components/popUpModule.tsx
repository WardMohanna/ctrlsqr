"use client";

interface PopupModalProps {
  message: string;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

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
  onClose,
  type = "info",
}: PopupModalProps) {
  const { title, color, button } = typeStyles[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg shadow-lg text-center w-11/12 max-w-md ${color} bg-white dark:bg-gray-800`}>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <p className="mb-6">{message}</p>
        <button
          onClick={onClose}
          className={`${button} text-white px-4 py-2 rounded-md`}
        >
          OK
        </button>
      </div>
    </div>
  );
}
