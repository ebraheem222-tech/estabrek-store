// Activity log: every change made from the admin, newest first.
import React, { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import { useAuth } from "../../hooks/useAuth";
import * as StaffAPI from "../../api/staff.api";
import { AREA_LABELS, describeActivity, describeDevice, describeFields, relativeTime } from "./teamText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";

function dayOf(iso: string) {
  return new Date(iso).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" });
}

export default function ActivityPage() {
  const { hasPermission } = useAuth();
  const [member, setMember] = useState("");
  const [area, setArea] = useState("");

  // The member list needs staff:read; without it the filter just isn't shown.
  const members = useQuery({ queryKey: ["staff", "members"], queryFn: StaffAPI.listMembers, enabled: hasPermission("staff:read") });

  const q = useInfiniteQuery({
    queryKey: ["activity", member, area],
    queryFn: ({ pageParam }) => StaffAPI.listActivity({ take: 50, cursor: pageParam, adminUserId: member, area }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const rows = useMemo(() => (q.data?.pages ?? []).flatMap((p) => p.rows), [q.data]);
  const days = useMemo(() => {
    const out: Array<{ day: string; rows: typeof rows }> = [];
    for (const r of rows) {
      const day = dayOf(r.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.rows.push(r);
      else out.push({ day, rows: [r] });
    }
    return out;
  }, [rows]);

  return (
    <div dir="rtl" className="space-y-4" data-testid="activity-page">
      <div className={box}>
        <h1 className="text-lg font-semibold">سجل النشاط</h1>
        <p className="mt-1 text-sm text-white/60">
          كل تغيير انعمل من لوحة الإدارة: مين عمله، إيمتى، ومن وين. منحفظ أسماء الحقول اللي تغيّرت بس، مش قيمها.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {members.data ? (
            <Select
              label="العضو"
              value={member}
              onValueChange={setMember}
              options={[{ value: "", label: "الكل" }, ...members.data.map((m) => ({ value: m.id, label: m.name }))]}
            />
          ) : null}
          <Select
            label="القسم"
            value={area}
            onValueChange={setArea}
            options={[{ value: "", label: "كل الأقسام" }, ...Object.entries(AREA_LABELS).map(([value, label]) => ({ value, label }))]}
          />
        </div>
      </div>

      <div className={box}>
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm">
            <Spinner /> جاري التحميل…
          </div>
        ) : q.isError ? (
          <div className="text-sm text-red-200">{getApiErrorMessage(q.error)}</div>
        ) : !rows.length ? (
          <div className="text-sm text-white/60">ما في نشاط بعد. أول تغيير من لوحة الإدارة بيبيّن هون.</div>
        ) : (
          <div className="space-y-6" data-testid="activity-list">
            {days.map((d) => (
              <section key={d.day}>
                <h2 className="mb-2 text-xs font-semibold text-white/50">{d.day}</h2>
                <ol className="divide-y divide-white/10">
                  {d.rows.map((r) => {
                    const fields = describeFields(r.fields);
                    return (
                      <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm">
                            <span className="font-medium">{r.adminUser?.name ?? r.actorEmail ?? "حساب محذوف"}</span>{" "}
                            {describeActivity(r)}
                          </div>
                          {fields ? <div className="mt-0.5 text-xs text-white/50">الحقول: {fields}</div> : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-x-3 text-xs text-white/50">
                          <span>{relativeTime(r.createdAt)}</span>
                          {r.userAgent ? <span>{describeDevice(r.userAgent)}</span> : null}
                          {r.ip ? <span dir="ltr">{r.ip}</span> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
            {q.hasNextPage ? (
              <div className="text-center">
                <Button variant="secondary" onClick={() => q.fetchNextPage()} isLoading={q.isFetchingNextPage}>
                  عرض أقدم
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
