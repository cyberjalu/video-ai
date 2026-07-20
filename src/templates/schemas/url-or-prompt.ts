import { z } from "zod";

export const urlOrPromptInput = z
  .object({
    mode: z.enum(["url", "prompt"]),
    url: z.string().url().optional(),
    prompt: z.string().min(10).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "url" && !val.url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL is required", path: ["url"] });
    }
    if (val.mode === "prompt" && !val.prompt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Prompt must be at least 10 characters", path: ["prompt"] });
    }
  });

export type UrlOrPromptInput = z.infer<typeof urlOrPromptInput>;
