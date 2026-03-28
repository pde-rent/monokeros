import { useState, useRef, useCallback } from "react";

export function useImageUpload(initial: string | null = null) {
  const [imageUrl, setImageUrl] = useState<string | null>(initial);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearImage = useCallback(() => {
    setImageUrl(null);
  }, []);

  return { imageUrl, setImageUrl, fileInputRef, handleFileUpload, openFilePicker, clearImage };
}
