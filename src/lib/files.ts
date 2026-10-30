// Hands a generated file to the user: share sheet on iPhone (Save to Files / iCloud Drive), download elsewhere.
// Returns false if he dismissed the share sheet.
export async function saveFile(file: File, title: string) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return true;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
