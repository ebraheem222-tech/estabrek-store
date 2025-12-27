import { z } from "zod";

export const MenuLocationParam = z.object({
  location: z.enum(["HEADER", "FOOTER", "SECONDARY", "CUSTOM"]),
});
