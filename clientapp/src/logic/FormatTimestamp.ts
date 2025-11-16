export function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
  const now = new Date();

  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  const daysOfWeek = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];

  if (diffDays <= 7 && date.getFullYear() === now.getFullYear()) {
    // Trong 7 ngày gần nhất
    return `${daysOfWeek[date.getDay()]} ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  } else if (date.getFullYear() === now.getFullYear()) {
    // Trong cùng năm
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  } else {
    // Năm khác
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  }
}