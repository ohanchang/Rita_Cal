import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FoodRecord, InBodyRecord, AppSettings as Settings } from "./types";

/** 快取有效期 (ms) — 30 秒內不重複請求 Notion */
export const RECORDS_TTL_MS = 30_000;

/** 收藏食物品項 */
export interface FavoriteItem {
  id: string;
  foodName: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  savedAt: number;
}

interface AppState {
  foodRecords: FoodRecord[];
  inbodyRecords: InBodyRecord[];
  favorites: FavoriteItem[];
  settings: Settings | null;
  recordsLoaded: boolean;
  /** 最後一次成功載入食物記錄的時間戳 (ms) */
  recordsLoadedAt: number;

  // Actions
  setFoodRecords: (records: FoodRecord[]) => void;
  addFoodOptimistic: (record: FoodRecord) => void;
  removeFoodOptimistic: (id: string) => void;
  updateFoodOptimistic: (id: string, updates: Partial<FoodRecord>) => void;
  setInBodyRecords: (records: InBodyRecord[]) => void;
  setSettings: (settings: Settings) => void;
  addFavorite: (item: Omit<FavoriteItem, "savedAt">) => void;
  removeFavorite: (id: string) => void;
  /** 判斷快取是否仍在有效期內 */
  isRecordsCacheValid: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      foodRecords: [],
      inbodyRecords: [],
      favorites: [],
      settings: null,
      recordsLoaded: false,
      recordsLoadedAt: 0,

      setFoodRecords: (records) =>
        set({ foodRecords: records, recordsLoaded: true, recordsLoadedAt: Date.now() }),

      addFoodOptimistic: (record) =>
        set((state) => ({
          foodRecords: [record, ...state.foodRecords],
        })),

      removeFoodOptimistic: (id) =>
        set((state) => ({
          foodRecords: state.foodRecords.filter((r) => r.id !== id),
        })),

      updateFoodOptimistic: (id, updates) =>
        set((state) => ({
          foodRecords: state.foodRecords.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      setInBodyRecords: (records) => set({ inbodyRecords: records }),

      setSettings: (settings) => set({ settings }),

      addFavorite: (item) =>
        set((state) => ({
          favorites: [{ ...item, savedAt: Date.now() }, ...state.favorites],
        })),

      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),

      isRecordsCacheValid: () => {
        const { recordsLoaded, recordsLoadedAt } = get();
        return recordsLoaded && Date.now() - recordsLoadedAt < RECORDS_TTL_MS;
      },
    }),
    {
      name: "food-calories-storage",
      // 只持久化 favorites 和 settings — records 每次啟動都刷新
      partialize: (state) => ({
        favorites: state.favorites,
        settings: state.settings,
      }),
    }
  )
);
