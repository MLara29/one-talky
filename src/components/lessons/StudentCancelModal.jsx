import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function StudentCancelModal({ lesson, onClose, onCancel, loading }) {
  const [message, setMessage] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-gray-900 text-lg">Cancel Lesson</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Cancel your lesson with <strong className="text-gray-800">{lesson.tutor_name}</strong>?
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Message to tutor (optional)
            </label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Something came up, sorry for the short notice!"
              className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 resize-none h-24"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl border-gray-200 text-gray-600">
              Keep lesson
            </Button>
            <Button
              onClick={() => onCancel(message)}
              disabled={loading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg shadow-red-500/20"
            >
              {loading ? "Cancelling..." : "Cancel lesson"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}