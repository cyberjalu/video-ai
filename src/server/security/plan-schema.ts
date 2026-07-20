import { z } from "zod";

export const VideoPlanSchema = z.object({
  title: z.string().min(1).max(300),
  target_duration_sec: z.number().int().min(20).max(180),
  audio_prompt: z.string().max(2000).optional(),
  scenes: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        role: z.string().min(1).max(64),
        duration_sec: z.number().int().min(3).max(12),
        caption_lines: z.array(z.string()).min(1).max(2),
        voiceover: z.string().min(1).max(4000),
        layout: z.enum(["screenshot", "big_callout", "split", "broll", "stat", "bar_chart"]).optional(),
        callouts: z.array(z.string()).max(3).optional(),
        screenshot_path: z.string().optional(),
        screenshot_file: z.string().optional(),
        image_fit: z.enum(["cover", "contain"]).optional(),
        pexels_query: z.string().optional(),
        pexels_credit: z.string().optional(),
        pexels_url: z.string().optional(),
        broll_path: z.string().optional(),
        caption_emphasis: z.array(z.string()).max(3).optional(),
        interrupt_strength: z.enum(["normal", "strong"]).optional(),
        stat: z
          .object({
            value: z.string(),
            label: z.string(),
            delta: z.string().optional(),
          })
          .optional(),
        chart: z
          .object({
            title: z.string().optional(),
            bars: z.array(z.object({ label: z.string(), value: z.number() })).min(1).max(5),
          })
          .optional(),
      }),
    )
    .min(4)
    .max(12),
});

export type ValidatedVideoPlan = z.infer<typeof VideoPlanSchema>;
