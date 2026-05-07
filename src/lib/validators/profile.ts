import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  designation: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  avatarUrl: z.string().trim().max(255).optional().or(z.literal("")),
  expectedDailyHours: z.coerce.number().min(1).max(24).optional(),
  monthlySalary: z.coerce.number().min(0).max(999999999).optional(),
  departmentId: z.string().uuid().nullable().optional().or(z.literal("")),
});
