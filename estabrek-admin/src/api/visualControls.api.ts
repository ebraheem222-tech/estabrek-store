import { api } from "./http";
import { readVisualControls, type VisualControls } from "../../../estabrek-storefront/src/lib/visualControls";
export async function getVisualControls() { return readVisualControls((await api.get("/admin/visual-controls")).data); }
export async function saveVisualControls(value: VisualControls) { return readVisualControls((await api.put("/admin/visual-controls", value)).data); }
