/**
 * Định dạng thời gian hoạt động gần nhất (Last seen)
 */
export const formatLastSeen = (timestamp?: number): string => {
  if (!timestamp) return 'Chưa hoạt động';

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return 'Vừa mới truy cập';
  }
  if (diffMin < 60) {
    return `Hoạt động ${diffMin} phút trước`;
  }
  if (diffHours < 24) {
    return `Hoạt động ${diffHours} giờ trước`;
  }
  if (diffDays === 1) {
    return 'Hoạt động hôm qua';
  }

  const d = new Date(timestamp);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `Hoạt động ngày ${day}/${month}`;
};

/**
 * Định dạng giờ tin nhắn dạng HH:mm
 */
export const formatMessageTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Định dạng thời gian cho màn hình cuộc trò chuyện Home
 */
export const formatConversationTime = (timestamp?: number): string => {
  if (!timestamp) return '';

  const now = new Date();
  const date = new Date(timestamp);

  // Cùng ngày -> hiện HH:mm
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return formatMessageTime(timestamp);
  }

  // Khác ngày -> hiện DD/MM
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
};
