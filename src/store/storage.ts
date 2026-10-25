import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

// zustand persist가 휴대폰 저장소(AsyncStorage)에 JSON으로 저장하게 연결한다.
export const jsonStorage = createJSONStorage(() => AsyncStorage);
