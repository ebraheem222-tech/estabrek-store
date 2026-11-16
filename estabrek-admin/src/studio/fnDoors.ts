/**
 * The owner's functions as a shop page can reach them: each call address a signed-in shopper, or anyone, may call
 * (admin → Functions → what starts it → a call). A key's address isn't one: nothing in a shop page can hold a key.
 * Used by a recipe's "run a function" step and by a form that sends to a function.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as FnAPI from "../api/functions.api";

export type FnDoor = { address: string; who: "customer" | "public"; fn: FnAPI.FnLite };

export function useFnDoors(): { loading: boolean; /** The list couldn't be read (the member may not be allowed to see the functions). */ failed: boolean; loaded: boolean; doors: FnDoor[] } {
  const q = useQuery({ queryKey: ["functions"], queryFn: FnAPI.getFunctions, staleTime: 60_000, retry: false });
  const doors = useMemo(
    () => (q.data?.functions ?? []).flatMap((f) => (f.calls ?? []).flatMap((c): FnDoor[] => (c.who === "key" ? [] : [{ address: c.address, who: c.who, fn: f }]))),
    [q.data],
  );
  return { loading: q.isLoading, failed: q.isError, loaded: !!q.data, doors };
}
