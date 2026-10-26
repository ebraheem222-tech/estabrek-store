// src/hooks/useSettings.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as SettingsAPI from "../api/settings.api";
import { getApiErrorMessage } from "../api/http";
import { toast } from "../lib/toast";
import { tr } from "@/lib/words";

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
      toast.success(tr("تم حفظ الإعدادات", "Settings saved"));
      await qc.invalidateQueries({ queryKey: keys.settings });
    },
    onError: (e) => toast.error(tr("فشل حفظ الإعدادات", "Couldn't save the settings"), { description: getApiErrorMessage(e) }),
  });

  const linkNavs = useMutation({
    mutationFn: SettingsAPI.linkNavs,
    onSuccess: async () => {
      toast.success(tr("تم ربط القوائم", "Menus linked"));
      await qc.invalidateQueries({ queryKey: keys.settings });
    },
    onError: (e) => toast.error(tr("فشل ربط القوائم", "Couldn't link the menus"), { description: getApiErrorMessage(e) }),
  });

  // Backward-compat: some pages expect `updateSettings`, others use `update`
  return { updateSettings, update: updateSettings, linkNavs };
}
