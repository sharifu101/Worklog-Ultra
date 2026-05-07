import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireEmployee } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { planSubmissionSchema } from "@/lib/validators/worklog";

export async function POST(request: NextRequest) {
  const user = await requireEmployee();
  const body = await request.json();
  const parsed = planSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid plan submission.");
  }

  const planDate = new Date(parsed.data.planDate);

  await db.dailyTask.createMany({
    data: parsed.data.tasks.map((task) => ({
      userId: user.id,
      departmentId: task.departmentId,
      planDate,
      taskTitle: task.taskTitle,
      taskDescription: task.taskDescription || null,
      priority: task.priority,
    })),
  });

  return apiSuccess({ message: "Morning plan added successfully." });
}
