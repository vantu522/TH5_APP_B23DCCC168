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
 */
export const getCurrentLocation = async (): Promise<LocationCoordinates> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Quyền truy cập vị trí đã bị từ chối.');
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};
