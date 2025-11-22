export function formatTimeAgo(dateString: string) {
    const now = Date.now();
    const created = new Date(dateString).getTime();
    const diff = Math.floor((now - created) / 1000);

    if (diff < 60) return `${diff} giây`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    return `${Math.floor(diff / 86400)} ngày`;
}
