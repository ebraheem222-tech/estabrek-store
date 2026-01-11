// src/hooks/useSettings.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as SettingsAPI from "../api/settings.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";

const keys = {
  settings: ["settings"] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: keys.settings,
    queryFn: SettingsAPI.getSettings,
  });
}

export function useSettingsActions() {
  const qc = useQueryClient();

  const updateSettings = useMutation({
    mutationFn: SettingsAPI.updateSettings,
    onSuccess: async () => {
      toast.success("تم حفظ الإعدادات");
      await qc.invalidateQueries({ queryKey: keys.settings });
    },
    onError: (e) => toast.error("فشل حفظ الإعدادات", { description: getApiErrorMessage(e) }),
  });

  const linkNavs = useMutation({
    mutationFn: SettingsAPI.linkNavs,
    onSuccess: async () => {
      toast.success("تم ربط القوائم");
      await qc.invalidateQueries({ queryKey: keys.settings });
    },
    onError: (e) => toast.error("فشل ربط القوائم", { description: getApiErrorMessage(e) }),
  });

  // Backward-compat: some pages expect `updateSettings`, others use `update`
  return { updateSettings, update: updateSettings, linkNavs };
}
