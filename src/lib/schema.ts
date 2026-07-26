import { z } from "zod";

// ==========================================
// InBody 解析驗證 (Zod)
// ==========================================

const segmentalPartSchema = z.object({
  weight: z.number().nullable(),
  percentage: z.number().nullable(),
  rating: z.enum(["低", "正常", "高"]).catch("正常"),
});

const segmentalDataSchema = z.object({
  leftArm: segmentalPartSchema,
  rightArm: segmentalPartSchema,
  trunk: segmentalPartSchema,
  leftLeg: segmentalPartSchema,
  rightLeg: segmentalPartSchema,
});

export const inBodyDataSchema = z.object({
  date: z.string().catch("2026-01-01"),
  score: z.number().nullable(),
  weight: z.number().nullable(),
  bodyFatPercent: z.number().nullable(),
  bmi: z.number().nullable(),
  skeletalMuscleMass: z.number().nullable(),
  bodyFatMass: z.number().nullable(),
  totalBodyWater: z.number().nullable(),
  protein: z.number().nullable(),
  minerals: z.number().nullable(),
  leanBodyMass: z.number().nullable(),
  bmr: z.number().nullable(),
  whr: z.number().nullable(),
  visceralFatLevel: z.number().nullable(),
  obesityDegree: z.number().nullable(),
  smi: z.number().nullable(),
  recommendedCalorie: z.number().nullable(),
  targetWeight: z.number().nullable(),
  fatControl: z.number().nullable(),
  muscleControl: z.number().nullable(),
  segmentalMuscle: segmentalDataSchema.nullable(),
  segmentalFat: segmentalDataSchema.nullable(),
  warnings: z.array(z.string()).catch([]),
});

// ==========================================
// 飲食分析驗證 (Zod)
// ==========================================

export const dietAnalysisSchema = z.object({
  period: z.enum(["7days", "30days"]).catch("7days"),
  summary: z.string().catch("無法生成總結"),
  calorieAssessment: z.string().catch("無"),
  macroAssessment: z.string().catch("無"),
  strengths: z.array(z.string()).catch([]),
  concerns: z.array(z.string()).catch([]),
  suggestions: z.array(z.string()).catch([]),
  generatedAt: z.string().optional(),
});
