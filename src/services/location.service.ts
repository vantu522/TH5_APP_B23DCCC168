import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Yêu cầu quyền truy cập vị trí trên Android
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Quyền truy cập vị trí',
        message: 'Ứng dụng cần quyền vị trí để gửi tọa độ trong cuộc trò chuyện.',
        buttonNeutral: 'Hỏi lại sau',
        buttonNegative: 'Từ chối',
        buttonPositive: 'Đồng ý',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Lỗi xin quyền vị trí:', err);
    return false;
  }
};

/**
 * Lấy tọa độ vị trí hiện tại
 * Hỗ trợ tối ưu cho máy ảo Android (tự động fallback nếu máy ảo không có chip GPS thực tế)
 */
export const getCurrentLocation = async (): Promise<LocationCoordinates> => {
  try {
    await requestLocationPermission();
  } catch {}

  return new Promise((resolve) => {
    // 1. Thử lấy vị trí qua Network/Wifi (nhanh và chạy tốt trên máy ảo)
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('GPS máy ảo không phản hồi, dùng tọa độ mặc định:', error);
        // Fallback: Tọa độ Hà Nội chuẩn nếu máy ảo không bật GPS
        resolve({
          latitude: 21.028511,
          longitude: 105.854167,
        });
      },
      {
        enableHighAccuracy: false, // Máy ảo dùng false sẽ lấy được ngay lập tức
        timeout: 4000,
        maximumAge: 60000,
      }
    );
  });
};
