const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>&"']+/gi;

export function linkifyUrls(text: string): string {
  if (!text) return text;

  return text.replace(URL_PATTERN, (url) => {
    const href = url.startsWith("http") ? url : `https://${url}`;

    const displayText = escapeHtml(url);

    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${displayText}</a>`;
  });
}

export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function linkifyHtmlContent(html: string): string {
  if (!html) return html;

  const temp = document.createElement("div");
  temp.innerHTML = html;

  processTextNodes(temp);

  return temp.innerHTML;
}

function processTextNodes(node: Node): void {
  const childNodes = Array.from(node.childNodes);

  childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";

      if (text.match(URL_PATTERN)) {
        const temp = document.createElement("div");
        temp.innerHTML = linkifyUrls(text);

        while (temp.firstChild) {
          node.insertBefore(temp.firstChild, child);
        }
        node.removeChild(child);
      }
    } else if (
      child.nodeType === Node.ELEMENT_NODE &&
      child.nodeName !== "A"
    ) {
  
      processTextNodes(child);
    }
  });
}


