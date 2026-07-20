import { z } from "zod";

export const youtubeLandscapeInput = z
  .object({
    mode: z.enum(["script"]),
    script: z.string().min(20, "Script must be at least 20 characters"),
  });

export type YoutubeLandscapeInput = z.infer<typeof youtubeLandscapeInput>;
