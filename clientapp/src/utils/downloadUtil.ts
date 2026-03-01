/**
 * Force download a file from a URL.
 * Fetches the file as a blob and creates a temporary link to trigger the download.
 * @param url The URL of the file to download.
 * @param filename The desired filename for the downloaded file.
 */
export const forceDownload = async (url: string, filename: string) => {
  try {
    const token = localStorage.getItem("access_token");
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    
    // Cleanup - use a delay to ensure the browser has started the download
    document.body.removeChild(a);
    setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  } catch (error) {
    console.error("Force download failed:", error);
    // Fallback to traditional link if fetch fails
    const a = document.createElement("a");
    // Append download=1 to force attachment disposition if supported by backend
    const fallbackUrl = url.includes("?") ? `${url}&download=1` : `${url}?download=1`;
    a.href = fallbackUrl;
    a.download = filename;
    a.target = "_blank";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
