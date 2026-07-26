"use client";

import { useEffect, useCallback } from "react";
import { FoodRecord } from "@/lib/types";
import { isDemoMode } from "@/lib/demo-mode";
import { MOCK_FOOD_RECORDS } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export function useRecords() {
  const records = useAppStore((state) => state.foodRecords);
  const setRecords = useAppStore((state) => state.setFoodRecords);
  const removeFoodOptimistic = useAppStore((state) => state.removeFoodOptimistic);
  const updateFoodOptimistic = useAppStore((state) => state.updateFoodOptimistic);
  const recordsLoaded = useAppStore((state) => state.recordsLoaded);
  const isRecordsCacheValid = useAppStore((state) => state.isRecordsCacheValid);

  const loading = !recordsLoaded;

  /** 載入記錄 — force=true 時忽略 TTL 快取，強制重新請求 */
  const loadRecords = useCallback(async (force = false) => {
    // 若快取仍在有效期且非強制刷新，直接使用快取
    if (!force && useAppStore.getState().isRecordsCacheValid()) {
      return;
    }

    try {
      if (isDemoMode()) {
        useAppStore.getState().setFoodRecords(MOCK_FOOD_RECORDS);
      } else {
        const res = await fetch("/api/notion");
        const json = await res.json();
        if (json.success) {
          useAppStore.getState().setFoodRecords(json.data || []);
        }
      }
    } catch (err) {
      console.error("載入失敗:", err);
      // Fail silently but mark loaded to prevent infinite loops
      if (!useAppStore.getState().recordsLoaded) {
        useAppStore.getState().setFoodRecords([]);
      }
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  return {
    records,
    setRecords,
    removeFoodOptimistic,
    updateFoodOptimistic,
    loading,
    loadRecords,
    isRecordsCacheValid,
  };
}
