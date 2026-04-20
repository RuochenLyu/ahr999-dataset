import { z } from "zod";

export const AHR999_WINDOW_KINDS = [
  "rolling_5y",
  "expanding",
  "insufficient_samples",
] as const;

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const BtcClosePointSchema = z.object({
  date: DateStringSchema,
  close: z.number().positive(),
});

export const Ahr999PointSchema = z.object({
  date: DateStringSchema,
  close: z.number().positive(),
  ma200: z.number().nullable(),
  ahr999: z.number().nullable(),
  quantile5y: z.number().min(0).max(1).nullable(),
  windowKind: z.enum(AHR999_WINDOW_KINDS),
});

export const Ahr999DatasetSchema = z.array(Ahr999PointSchema);

export type BtcClosePoint = z.infer<typeof BtcClosePointSchema>;
export type Ahr999Point = z.infer<typeof Ahr999PointSchema>;
export type Ahr999WindowKind = (typeof AHR999_WINDOW_KINDS)[number];
