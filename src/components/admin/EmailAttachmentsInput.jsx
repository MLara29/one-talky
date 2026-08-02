import { Paperclip, X } from "lucide-react";

const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // 15MB total

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Multi-file attachment picker — converts files to base64 client-side and
// keeps a running total size check against the 15MB backend limit.
export default function EmailAttachmentsInput({ attachments, onChange, onError }) {
  const totalBytes = attachments.reduce((sum, a) => sum + a.size, 0);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    let newTotal = totalBytes;
    const added = [];
    for (const file of files) {
      newTotal += file.size;
      if (newTotal > MAX_TOTAL_BYTES) {
        onError?.("Os anexos excedem o limite de 15MB no total. Alguns arquivos não foram adicionados.");
        break;
      }
      const content_base64 = await fileToBase64(file);
      added.push({
        filename: file.name,
        size: file.size,
        content_type: file.type || "application/octet-stream",
        content_base64,
      });
    }
    if (added.length > 0) onChange([...attachments, ...added]);
  };

  const removeAt = (idx) => onChange(attachments.filter((_, i) => i !== idx));

  return (
    <div>
      <label className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg bg-violet-500/5 hover:bg-violet-500/10 transition-all cursor-pointer">
        <Paperclip className="w-3.5 h-3.5" /> Anexar arquivos
        <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </label>
      {attachments.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-300 truncate">{a.filename} <span className="text-gray-600">({formatSize(a.size)})</span></span>
              <button onClick={() => removeAt(i)} className="text-gray-500 hover:text-white shrink-0 ml-2">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <p className="text-[11px] text-gray-600">Total: {formatSize(totalBytes)} / 15 MB</p>
        </div>
      )}
    </div>
  );
}