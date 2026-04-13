"use client";

import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface Props {
  onFileAccepted: (file: File) => void;
  maxSize?: number; // in bytes
}

export function FileUpload({ onFileAccepted, maxSize = 10 * 1024 * 1024 }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const acceptedFile = acceptedFiles[0];
    if (acceptedFile) {
      setFile(acceptedFile);
      onFileAccepted(acceptedFile);
      toast.success("File selected", { description: `${acceptedFile.name} is ready.` });
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize,
      accept: {
        "application/pdf": [".pdf"],
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      },
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    toast.info("File removed");
  };

  const isError = fileRejections.length > 0;

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all ${isDragActive
          ? "border-indigo-500 bg-indigo-50/50"
          : isError
            ? "border-red-300 bg-red-50"
            : file
              ? "border-emerald-500 bg-emerald-50/30"
              : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
          }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center text-center">
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <FileText className="h-8 w-8" />
                </div>
                <button
                  onClick={removeFile}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </div>
            </div>
          ) : (
            <>
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition ${isDragActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                <Upload className={`h-8 w-8 ${isDragActive ? "animate-bounce" : ""}`} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {isDragActive ? "Drop it here!" : "Upload your resume"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                PDF or DOCX (max 10MB)
              </p>
              <div className="mt-4 flex gap-2">
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                  Select File
                </button>
              </div>
            </>
          )}

          {isError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 font-medium">
              <AlertCircle className="h-4 w-4" />
              Invalid file type or size.
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 px-1">
        <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          Your resume is parsed instantly using our NLP engine to identify key skills and experience. Match results are generated in real-time.
        </p>
      </div>
    </div>
  );
}
