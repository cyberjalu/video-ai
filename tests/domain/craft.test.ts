import { describe, expect, it } from "vitest";
import {
  buildCraftRewriteAppendix,
  runCraftQcHeuristics,
} from "@/server/viral/craft";
import type { VideoPlan } from "@/lib/domain/types";

function basePlan(scenes: VideoPlan["scenes"]): VideoPlan {
  return {
    title: "Test",
    target_duration_sec: 36,
    scenes,
  };
}

describe("runCraftQcHeuristics", () => {
  it("fails brochure hook that is only a generic question", () => {
    const plan = basePlan([
      {
        id: "s1",
        role: "hook",
        duration_sec: 4,
        caption_lines: ["PENTEST THỦ CÔNG MẤT THỜI GIAN?"],
        voiceover: "Bạn còn pentest thủ công?",
        layout: "big_callout",
      },
      {
        id: "s2",
        role: "why_matters",
        duration_sec: 4,
        caption_lines: ["Bạn xứng đáng hơn!"],
        voiceover: "Bạn xứng đáng hơn với quy trình cũ.",
        layout: "big_callout",
      },
      {
        id: "s3",
        role: "re_hook",
        duration_sec: 4,
        caption_lines: ["QUÊN CÁCH CŨ ĐI!", "ĐÃ CÓ STRIX"],
        voiceover: "Quên cách cũ đi vì đã có Strix.",
        layout: "big_callout",
      },
      {
        id: "s4",
        role: "takeaway",
        duration_sec: 3,
        caption_lines: ["Đừng chần chừ"],
        voiceover: "Đừng chần chừ nữa.",
        layout: "big_callout",
      },
    ]);
    const report = runCraftQcHeuristics(plan, { mode: "full" });
    expect(report.criteria.find((c) => c.id === "anti_brochure")?.pass).toBe(false);
    expect(report.criteria.find((c) => c.id === "rehook_escalate")?.pass).toBe(false);
    expect(report.pass).toBe(false);
  });

  it("passes a specific hook with escalate + CTA reason", () => {
    const plan = basePlan([
      {
        id: "s1",
        role: "hook",
        duration_sec: 4,
        caption_lines: ["3 giờ/ngày chỉ để retest thủ công", "Vẫn bỏ sót API lỗ hổng"],
        voiceover: "[excitedly] Bạn đang mất 3 giờ mỗi ngày chỉ để retest thủ công và vẫn bỏ sót lỗ hổng API.",
        layout: "stat",
        stat: { value: "3h", label: "retest / ngày" },
      },
      {
        id: "s2",
        role: "why_matters",
        duration_sec: 4,
        caption_lines: ["Chi phí thật: deploy chậm", "Rủi ro production"],
        voiceover: "Hệ quả là deploy chậm và rủi ro lọt production.",
        layout: "big_callout",
      },
      {
        id: "s3",
        role: "re_hook",
        duration_sec: 4,
        caption_lines: ["Không phải thiếu tool", "Thiếu proof-of-exploit tự động"],
        voiceover: "Vấn đề không phải thiếu scanner — bạn thiếu proof-of-exploit tự động gắn CI.",
        layout: "screenshot",
        screenshot_path: "/tmp/a.png",
      },
      {
        id: "s4",
        role: "evidence",
        duration_sec: 5,
        caption_lines: ["Agent tạo PoC + PR", "Retest trong pipeline"],
        voiceover: "Agent tìm lỗ hổng, tạo PoC, mở PR và retest trong CI/CD.",
        layout: "screenshot",
        screenshot_path: "/tmp/b.png",
      },
      {
        id: "s5",
        role: "takeaway",
        duration_sec: 3,
        caption_lines: ["Star GitHub usestrix/strix", "Để team bỏ retest tay"],
        voiceover: "Hãy star GitHub usestrix/strix để team bạn bỏ vòng retest tay.",
        layout: "split",
      },
    ]);
    const report = runCraftQcHeuristics(plan, {
      mode: "full",
      hasSourceScreenshots: true,
      sourceText: "Strix agent PoC PR CI/CD API 3 giờ retest thủ công lỗ hổng",
    });
    expect(report.criteria.find((c) => c.id === "hook_specific")?.pass).toBe(true);
    expect(report.criteria.find((c) => c.id === "rehook_escalate")?.pass).toBe(true);
    expect(report.criteria.find((c) => c.id === "cta_reason")?.pass).toBe(true);
    expect(report.criteria.find((c) => c.id === "proof_beat")?.pass).toBe(true);
    expect(report.pass).toBe(true);
  });

  it("flags fabrication when numbers missing from source", () => {
    const plan = basePlan([
      {
        id: "s1",
        role: "hook",
        duration_sec: 4,
        caption_lines: ["Giảm 87% thời gian pentest"],
        voiceover: "Strix giảm 87% thời gian pentest.",
        layout: "stat",
        stat: { value: "87%", label: "nhanh hơn" },
      },
      {
        id: "s2",
        role: "re_hook",
        duration_sec: 4,
        caption_lines: ["Chi phí ảo $2M nếu bỏ sót"],
        voiceover: "Một lỗ hổng bỏ sót có thể tốn 2 triệu đô.",
        layout: "big_callout",
      },
      {
        id: "s3",
        role: "takeaway",
        duration_sec: 3,
        caption_lines: ["Thử ngay vì tiết kiệm thời gian"],
        voiceover: "Hãy thử Strix vì tiết kiệm thời gian retest.",
        layout: "big_callout",
      },
    ]);
    const report = runCraftQcHeuristics(plan, {
      mode: "full",
      sourceText: "Strix is an AI agent for penetration testing. Open source on GitHub.",
    });
    expect(report.criteria.find((c) => c.id === "no_fabrication")?.pass).toBe(false);
  });

  it("builds rewrite appendix from failed reasons", () => {
    const report = runCraftQcHeuristics(
      basePlan([
        {
          id: "s1",
          role: "hook",
          duration_sec: 4,
          caption_lines: ["Hot tip?"],
          voiceover: "Wow.",
          layout: "big_callout",
        },
      ]),
      { mode: "full" },
    );
    const appendix = buildCraftRewriteAppendix(report);
    expect(appendix).toContain("FIX CRAFT");
    expect(appendix.length).toBeGreaterThan(40);
  });
});
