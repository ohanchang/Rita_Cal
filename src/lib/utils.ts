/** 用餐類型 → CSS class 名稱映射 */
export function getMealClass(mealType: string): string {
  const map: Record<string, string> = {
    早餐: "breakfast",
    午餐: "lunch",
    晚餐: "dinner",
    點心: "snack",
    宵夜: "midnight",
  };
  return map[mealType] || "lunch";
}
