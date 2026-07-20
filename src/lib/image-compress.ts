/**
 * Compresses an image file on the client-side using HTML5 Canvas.
 * @param file The original File object
 * @param maxDimension Maximum width or height in pixels (default: 1200)
 * @param quality Compression quality between 0.1 and 1.0 (default: 0.75)
 * @returns A promise that resolves to a new compressed File object
 */
export async function compressImage(
  file: File,
  maxDimension = 1200,
  quality = 0.75
): Promise<File> {
  // If the file is not an image, return it unchanged
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // If the file is already small (e.g., under 150KB), don't compress it
  if (file.size < 150 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize proportionally if dimensions exceed maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // Fallback
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Export as image/jpeg since it compresses best
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // Create a new File object from the blob
            const name = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        resolve(file); // Fallback to original
      };
    };
    reader.onerror = () => {
      resolve(file); // Fallback to original
    };
  });
}
