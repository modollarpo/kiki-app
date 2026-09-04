export const dynamic = "force-dynamic";
import { getUserFromRequest, json, jsonError } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { transcribeAudio } from "@/lib/transcription";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return jsonError("Unauthorized", 401);

  const enf = await checkEnforcement(user.tenantId);
  if (!enf.allowed) return jsonError(enf.reason || "Access denied", 403);

  try {
    const form = await req.formData();
    const audioFile = form.get("audio") as File | null;
    if (!audioFile) return jsonError("audio file required", 400);

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const audioBase64 = buffer.toString("base64");
    const format = audioFile.name.split(".").pop() || "wav";

    const result = await transcribeAudio(audioBase64, format);
    return json(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 500);
  }
}
