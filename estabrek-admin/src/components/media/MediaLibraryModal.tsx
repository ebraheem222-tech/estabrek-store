import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { toast } from "../../lib/toast";
import { getApiErrorMessage } from "../../api/http";
import {
  createImageFolder,
  deleteImage,
  deleteImageFolder,
  deleteImagesBulk,
  getImageUsage,
  listImageFolders,
  listImageDuplicates,
  listImageTags,
  listImages,
  renameImageFolder,
  updateImageMeta,
  updateImagesBulk,
  uploadImages,
  type DuplicatesMode,
  type DuplicateGroupExact,
  type DuplicateGroupNear,
  type MediaFolder,
  type MediaImage,
  type MediaUsage,
} from "../../api/uploads.api";
import { tr } from "@/lib/words";
import { CutoutEditor } from "./CutoutEditor";
import type { CutoutTarget } from "./cutoutShared";
import { CutoutBatch, type BatchTarget } from "./CutoutBatch";

const cutoutTargetOf = (img: MediaImage): BatchTarget => ({ key: img.id, url: img.url, name: img.displayName || img.filename, folder: img.folder });

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect?: (url: string) => void;
  onSelectMultiple?: (urls: string[]) => void;
  multiple?: boolean;
  maxSelect?: number;
  title?: string;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function toastApiError(err: unknown, fallback: string) {
  const msg = getApiErrorMessage(err);
  if (!msg || msg === "Request failed" || msg === "Unknown error") return toast.error(fallback);
  return toast.error(`${fallback}: ${msg}`);
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function usageTitle(u: MediaUsage) {
  switch (u.kind) {
    case "settings":
      return `Settings → ${u.field}`;
    case "page":
      return `Page /${u.slug} → ${u.field}`;
    case "page_section":
      return `Page /${u.slug} → section (${u.sectionType})`;
    case "product":
      return `Product ${u.productTitle} (${u.colorName})`;
    default:
      return "Used";
  }
}

function groupUsage(usage: MediaUsage[]) {
  const groups: Record<string, MediaUsage[]> = {
    settings: [],
    pages: [],
    products: [],
  };
  for (const u of usage) {
    if (u.kind === "settings") groups.settings.push(u);
    else if (u.kind === "product") groups.products.push(u);
    else groups.pages.push(u);
  }
  return groups;
}

export function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  onSelectMultiple,
  multiple,
  maxSelect = 20,
  title = "Media Library",
}: Props) {
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const [items, setItems] = useState<MediaImage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [unfiledCount, setUnfiledCount] = useState<number>(0);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);

  // Select mode (for inputs)
  const [picked, setPicked] = useState<string[]>([]);

  // Manage mode (library maintenance)
  const [manageMode, setManageMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]); // ids

  // Manage panel (single asset)
  const [manage, setManage] = useState<MediaImage | null>(null);
  const [manageName, setManageName] = useState("");
  const [manageFolder, setManageFolder] = useState<string | null>(null);
  const [manageTags, setManageTags] = useState<string>("");
  const [savingMeta, setSavingMeta] = useState(false);

  // Folder UI
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<MediaFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<MediaFolder | null>(null);

  // Delete/usage UI
  const [deleteConfirm, setDeleteConfirm] = useState<MediaImage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageList, setUsageList] = useState<MediaUsage[]>([]);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Duplicates view
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [duplicatesMode, setDuplicatesMode] = useState<DuplicatesMode>("exact");
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicatesLimit, setDuplicatesLimit] = useState(30);
  const [duplicateGroups, setDuplicateGroups] = useState<Array<DuplicateGroupExact | DuplicateGroupNear>>([]);
  const [duplicateSelected, setDuplicateSelected] = useState<string[]>([]);
  const [deleteOlderConfirmOpen, setDeleteOlderConfirmOpen] = useState(false);
  const [deleteOlderIds, setDeleteOlderIds] = useState<string[]>([]);

  // «شيل الخلفية»: one picture (with the brush), or the selected ones at once.
  const [cutout, setCutout] = useState<CutoutTarget | null>(null);
  const [cutoutMany, setCutoutMany] = useState<BatchTarget[] | null>(null);
  const addCutout = (asset: MediaImage) => {
    setItems((prev) => [asset, ...prev.filter((x) => x.id !== asset.id)]);
    void fetchMeta();
  };

  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const bulkSet = useMemo(() => new Set(bulkSelected), [bulkSelected]);
  const duplicateSelectedSet = useMemo(() => new Set(duplicateSelected), [duplicateSelected]);

  async function fetchMeta() {
    const [f, t] = await Promise.all([listImageFolders(), listImageTags()]);
    setFolders(f.folders ?? []);
    setUnfiledCount(f.unfiledCount ?? 0);
    setTags(t.tags ?? []);
  }

  async function load(reset = true) {
    try {
      if (reset) {
        setLoading(true);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }
      const res = await listImages({ q: q.trim() || undefined, folder: folder || undefined, tag: tag || undefined, cursor: reset ? null : cursor });
      if (reset) setItems(res.items);
      else setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (e: any) {
      toastApiError(e, tr("فشل تحميل الصور", "Couldn't load the images"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadDuplicates() {
    try {
      setDuplicatesLoading(true);
      const res = await listImageDuplicates({
        mode: duplicatesMode,
        limit: duplicatesLimit,
        perGroup: 30,
        maxDistance: 6,
        scanLimit: 400,
      });
      setDuplicateGroups(res.groups as Array<DuplicateGroupExact | DuplicateGroupNear>);
      setDuplicateSelected([]);
    } catch (e: any) {
      toastApiError(e, tr("فشل تحميل التكرارات", "Couldn't load the duplicates"));
    } finally {
      setDuplicatesLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    // Reset per open
    setPicked([]);
    setBulkSelected([]);
    setManage(null);
    setDeleteConfirm(null);
    setUsageOpen(false);
    setUsageList([]);
    setManageMode(false);
    fetchMeta().then(() => load(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => load(true), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, folder, tag]);

  useEffect(() => {
    if (!duplicatesOpen) return;
    loadDuplicates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicatesOpen, duplicatesMode, duplicatesLimit]);

  function togglePicked(url: string) {
    setPicked((prev) => {
      const set = new Set(prev);
      if (set.has(url)) set.delete(url);
      else {
        if (set.size >= maxSelect) {
          toast.error(tr(`الحد الأقصى ${maxSelect} صور`, "{0} images at most", [maxSelect]));
          return prev;
        }
        set.add(url);
      }
      return Array.from(set);
    });
  }

  function toggleBulk(id: string) {
    setBulkSelected((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  function toggleDuplicate(id: string) {
    setDuplicateSelected((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  }

  function selectGroupOlderExact(items: MediaImage[]) {
    if (items.length <= 1) return;
    const keepId = items[0]?.id;
    setDuplicateSelected((prev) => {
      const set = new Set(prev);
      for (const item of items) {
        if (item.id !== keepId) set.add(item.id);
      }
      return Array.from(set);
    });
  }

  function selectGroupOlderNear(items: Array<{ distance: number; item: MediaImage }>) {
    if (items.length <= 1) return;
    const keepId = items[0]?.item.id;
    setDuplicateSelected((prev) => {
      const set = new Set(prev);
      for (const entry of items) {
        if (entry.item.id !== keepId) set.add(entry.item.id);
      }
      return Array.from(set);
    });
  }

  async function deleteSelectedDuplicates() {
    if (!duplicateSelected.length) return;
    try {
      setDeleting(true);
      await deleteImagesBulk(duplicateSelected);
      toast.success(tr("تم حذف الصور المحددة", "Selected images deleted"));
      setDuplicateSelected([]);
      await fetchMeta();
      await load(true);
      await loadDuplicates();
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      if (status === 409 && data?.usageById) {
        const usageById = data.usageById as Record<string, MediaUsage[]>;
        const merged = Object.values(usageById).flat();
        setUsageList(merged);
        setUsageOpen(true);
        toast.error(tr("في صور مستخدمة — ما انحذفت", "Some images are in use — not deleted"));
        return;
      }
      toastApiError(e, tr("فشل حذف الصور", "Couldn't delete the images"));
    } finally {
      setDeleting(false);
    }
  }

  function parseDate(value: string | null | undefined) {
    if (!value) return 0;
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }

  function collectOlderDuplicateIds() {
    const ids: string[] = [];
    if (duplicatesMode === "exact") {
      for (const group of duplicateGroups as DuplicateGroupExact[]) {
        const sorted = [...group.items].sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
        for (let i = 1; i < sorted.length; i++) {
          ids.push(sorted[i]!.id);
        }
      }
    } else {
      for (const group of duplicateGroups as DuplicateGroupNear[]) {
        const sorted = [...group.items].sort((a, b) => parseDate(b.item.createdAt) - parseDate(a.item.createdAt));
        for (let i = 1; i < sorted.length; i++) {
          ids.push(sorted[i]!.item.id);
        }
      }
    }
    return uniq(ids);
  }

  async function confirmDeleteOlderDuplicates() {
    if (!deleteOlderIds.length) return;
    try {
      setDeleting(true);
      await deleteImagesBulk(deleteOlderIds);
      toast.success(tr("تم حذف الأقدم من كل المجموعات", "The oldest of each group deleted"));
      setDeleteOlderIds([]);
      setDeleteOlderConfirmOpen(false);
      await fetchMeta();
      await load(true);
      await loadDuplicates();
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      if (status === 409 && data?.usageById) {
        const usageById = data.usageById as Record<string, MediaUsage[]>;
        const merged = Object.values(usageById).flat();
        setUsageList(merged);
        setUsageOpen(true);
        toast.error(tr("في صور مستخدمة — ما انحذفت", "Some images are in use — not deleted"));
        return;
      }
      toastApiError(e, tr("فشل حذف التكرارات", "Couldn't delete the duplicates"));
    } finally {
      setDeleting(false);
    }
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      const out = await uploadImages(Array.from(files), {
        folder: folder && folder !== "__unfiled__" ? folder : undefined,
      });
      toast.success(tr(`تم رفع ${out.files.length} صورة`, "{0} images uploaded", [out.files.length]));
      await fetchMeta();
      await load(true);
    } catch (e: any) {
      toastApiError(e, tr("فشل رفع الصور", "Couldn't upload the images"));
    } finally {
      setLoading(false);
    }
  }

  async function openManage(img: MediaImage) {
    setManage(img);
    setManageName(img.displayName ?? "");
    setManageFolder(img.folder ?? null);
    setManageTags((img.tags ?? []).join(", "));
  }

  async function saveManage() {
    if (!manage) return;
    try {
      setSavingMeta(true);
      const tagsArr = uniq(
        manageTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      );
      const updated = await updateImageMeta(manage.id, {
        displayName: manageName.trim() || null,
        folder: manageFolder ? manageFolder.trim() : null,
        tags: tagsArr,
      });
      toast.success(tr("تم الحفظ", "Saved"));
      setManage(updated);
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      await fetchMeta();
    } catch (e: any) {
      toastApiError(e, tr("فشل الحفظ", "Couldn't save"));
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleDeleteRequest(img: MediaImage) {
    try {
      const u = await getImageUsage(img.id);
      if (u.usage?.length) {
        setUsageList(u.usage);
        setUsageOpen(true);
        return;
      }
      setDeleteConfirm(img);
    } catch (e: any) {
      // If usage endpoint fails, fall back to delete-confirm (server will still block if used)
      setDeleteConfirm(img);
    }
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await deleteImage(deleteConfirm.id);
      toast.success(tr("تم حذف الصورة", "Image deleted"));
      setItems((prev) => prev.filter((x) => x.id !== deleteConfirm.id));
      setManage((m) => (m?.id === deleteConfirm.id ? null : m));
      setBulkSelected((prev) => prev.filter((id) => id !== deleteConfirm.id));
      setDeleteConfirm(null);
      await fetchMeta();
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      if (status === 409 && data?.usage) {
        setUsageList(data.usage as MediaUsage[]);
        setUsageOpen(true);
        setDeleteConfirm(null);
        toast.error(tr("ما بزبط تنحذف — الصورة مستخدمة", "It can't be deleted — the image is in use"));
        return;
      }
      toastApiError(e, tr("فشل حذف الصورة", "Couldn't delete the image"));
    } finally {
      setDeleting(false);
    }
  }

  async function bulkMoveFolder(folderName: string | null) {
    if (!bulkSelected.length) return;
    try {
      await updateImagesBulk({ ids: bulkSelected, folder: folderName });
      toast.success(tr("تم تحديث المجلد للصور المحددة", "Folder updated for the selected images"));
      await fetchMeta();
      await load(true);
    } catch (e: any) {
      toastApiError(e, tr("فشل تحديث المجلد", "Couldn't update the folder"));
    }
  }

  async function bulkAddTags(tagsCsv: string) {
    const addTags = uniq(
      tagsCsv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    );
    if (!bulkSelected.length || !addTags.length) return;
    try {
      await updateImagesBulk({ ids: bulkSelected, addTags });
      toast.success(tr("تم إضافة Tags", "Tags added"));
      await fetchMeta();
      await load(true);
    } catch (e: any) {
      toastApiError(e, tr("فشل إضافة Tags", "Couldn't add the tags"));
    }
  }

  async function bulkRemoveTags(tagsCsv: string) {
    const removeTags = uniq(
      tagsCsv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    );
    if (!bulkSelected.length || !removeTags.length) return;
    try {
      await updateImagesBulk({ ids: bulkSelected, removeTags });
      toast.success(tr("تم إزالة Tags", "Tags removed"));
      await fetchMeta();
      await load(true);
    } catch (e: any) {
      toastApiError(e, tr("فشل إزالة Tags", "Couldn't remove the tags"));
    }
  }

  async function bulkDelete() {
    if (!bulkSelected.length) return;
    try {
      setDeleting(true);
      await deleteImagesBulk(bulkSelected);
      toast.success(tr("تم حذف الصور المحددة", "Selected images deleted"));
      setBulkSelected([]);
      setManage(null);
      await fetchMeta();
      await load(true);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      if (status === 409 && data?.usageById) {
        const usageById = data.usageById as Record<string, MediaUsage[]>;
        const merged = Object.values(usageById).flat();
        setUsageList(merged);
        setUsageOpen(true);
        toast.error(tr("في صور مستخدمة — ما انحذفت", "Some images are in use — not deleted"));
        return;
      }
      toastApiError(e, tr("فشل الحذف", "Couldn't delete"));
    } finally {
      setDeleting(false);
    }
  }

  async function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createImageFolder(name);
      toast.success(tr("تم إنشاء المجلد", "Folder created"));
      setCreateFolderOpen(false);
      setNewFolderName("");
      await fetchMeta();
    } catch (e: any) {
      toastApiError(e, tr("فشل إنشاء المجلد", "Couldn't create the folder"));
    }
  }

  async function renameFolder() {
    if (!folderToRename) return;
    const name = renameFolderName.trim();
    if (!name) return;
    try {
      await renameImageFolder(folderToRename.id, name);
      toast.success(tr("تم تغيير اسم المجلد", "Folder renamed"));
      setRenameFolderOpen(false);
      setFolderToRename(null);
      setRenameFolderName("");
      // If current filter was the old name, keep it synced
      if (folder === folderToRename.name || folder === folderToRename.folder) setFolder(name);
      await fetchMeta();
      await load(true);
    } catch (e: any) {
      toastApiError(e, tr("فشل تغيير الاسم", "Couldn't rename"));
    }
  }

  async function deleteFolderConfirmed() {
    if (!deleteFolderConfirm) return;
    try {
      await deleteImageFolder(deleteFolderConfirm.id);
      toast.success(tr("تم حذف المجلد", "Folder deleted"));
      if (folder === deleteFolderConfirm.name) setFolder(null);
      setDeleteFolderConfirm(null);
      await fetchMeta();
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      if (status === 409 && data?.count) {
        toast.error(tr("المجلد مش فاضي — لازم تنتقل الصور أولاً", "The folder isn't empty — move its images first"));
        return;
      }
      toastApiError(e, tr("فشل حذف المجلد", "Couldn't delete the folder"));
    }
  }

  const folderOptions = useMemo(() => {
    const opts = [
      { value: "", label: tr("الكل", "All") },
      { value: "__unfiled__", label: tr(`بدون مجلد (${unfiledCount})`, "No folder ({0})", [unfiledCount]) },
      ...folders.map((f) => ({ value: f.name, label: `${f.name} (${f.count})` })),
    ];
    return opts;
  }, [folders, unfiledCount]);

  const folderNames = useMemo(() => folders.map((f) => f.name), [folders]);

  const bulkCount = bulkSelected.length;

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-6xl">
        <div className="flex flex-col gap-4">
          {/* Top bar */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("بحث (اسم الملف / اسم العرض)", "Search (file name / display name)")} />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={folder ?? ""}
                  onChange={(e) => setFolder(e.target.value || null)}
                  options={folderOptions}
                />
                <Select
                  value={tag ?? ""}
                  onChange={(e) => setTag(e.target.value || null)}
                  options={[{ value: "", label: tr("كل Tags", "All tags") }, ...tags.map((t) => ({ value: t.tag, label: `${t.tag} (${t.count})` }))]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manageMode}
                  onChange={(e) => {
                    setManageMode(e.target.checked);
                    setManage(null);
                    setBulkSelected([]);
                  }}
                />
                {tr("وضع الإدارة", "Manage mode")}
              </label>

              <Button variant="ghost" onClick={() => setDuplicatesOpen(true)}>
                {tr("التكرارات", "Duplicates")}
              </Button>

              <div className="inline-flex items-center">
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onUpload(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <Button type="button" onClick={() => uploadInputRef.current?.click()}>
                  {tr("رفع صور", "Upload images")}
                </Button>
              </div>

              {multiple && (
                <Button
                  variant="primary"
                  disabled={!picked.length}
                  onClick={() => {
                    onSelectMultiple?.(picked);
                    toast.success(tr(`تم اختيار ${picked.length} صورة`, "{0} images chosen", [picked.length]));
                    onClose();
                  }}
                >
                  {tr("تطبيق الاختيار (", "Use the selection (")}{picked.length})
                </Button>
              )}
            </div>
          </div>

          {/* Bulk bar */}
          {manageMode && bulkCount > 0 && (
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="text-sm text-white/70">{tr("محدد:", "Selected:")} <span className="text-white">{bulkCount}</span></div>
              <div className="flex-1 flex flex-col md:flex-row gap-2">
                <BulkFolderMove folderNames={folderNames} onMove={bulkMoveFolder} />
                <BulkTags onAdd={bulkAddTags} onRemove={bulkRemoveTags} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setCutoutMany(items.filter((x) => bulkSet.has(x.id)).map(cutoutTargetOf))}
                  data-testid="media-cutout-selected"
                >
                  {tr("✂ شيل الخلفية عن المحدد", "✂ Remove the background from the selected")}
                </Button>
                <Button variant="danger" onClick={bulkDelete} isLoading={deleting}>
                  {tr("حذف المحدد", "Delete selected")}
                </Button>
                <Button variant="ghost" onClick={() => setBulkSelected([])}>
                  {tr("إلغاء التحديد", "Clear selection")}
                </Button>
              </div>
            </div>
          )}

          {/* Main */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_340px] gap-4 min-h-[60vh]">
            {/* Sidebar */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">Folders</div>
                <Button variant="ghost" className="!px-2" onClick={() => setCreateFolderOpen(true)}>
                  +
                </Button>
              </div>

              <div className="space-y-1">
                <FolderRow
                  label={tr(`الكل`, "All")}
                  active={folder === null}
                  count={items.length}
                  onClick={() => setFolder(null)}
                />
                <FolderRow
                  label={tr(`بدون مجلد`, "No folder")}
                  active={folder === "__unfiled__"}
                  count={unfiledCount}
                  onClick={() => setFolder("__unfiled__")}
                />
                {folders.map((f) => (
                  <FolderRow
                    key={f.id}
                    label={f.name}
                    active={folder === f.name}
                    count={f.count}
                    onClick={() => setFolder(f.name)}
                    onRename={() => {
                      setFolderToRename(f);
                      setRenameFolderName(f.name);
                      setRenameFolderOpen(true);
                    }}
                    onDelete={() => setDeleteFolderConfirm(f)}
                  />
                ))}
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-white mb-2">Tags</div>
                <div className="space-y-1 max-h-64 overflow-auto ps-1">
                  {tags.map((t) => (
                    <button
                      key={t.tag}
                      className={`w-full text-start px-3 py-2 rounded-xl text-sm border transition ${
                        tag === t.tag
                          ? "bg-white/[0.06] border-white/[0.12] text-white"
                          : "bg-transparent border-transparent text-white/70 hover:bg-white/[0.04]"
                      }`}
                      onClick={() => setTag(tag === t.tag ? null : t.tag)}
                    >
                      {t.tag} <span className="text-white/40">({t.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner />
                </div>
              ) : (
                <>
                  {items.length === 0 ? (
                    <div className="text-center text-white/60 py-20">{tr("لا يوجد نتائج", "No results")}</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {items.map((img) => {
                        const isPicked = pickedSet.has(img.url);
                        const isBulk = bulkSet.has(img.id);
                        return (
                          <div
                            key={img.id}
                            className={`group relative rounded-xl overflow-hidden border transition cursor-pointer ${
                              manage?.id === img.id ? "border-white/30" : "border-white/[0.06] hover:border-white/20"
                            }`}
                          >
                            {/* Selection overlays */}
                            {manageMode ? (
                              <button
                                className={`absolute top-2 end-2 z-10 w-7 h-7 rounded-lg border flex items-center justify-center transition ${
                                  isBulk ? "bg-white/20 border-white/30" : "bg-black/30 border-white/20 hover:bg-black/40"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBulk(img.id);
                                }}
                                title={tr("تحديد", "Select")}
                              >
                                {isBulk ? "✓" : ""}
                              </button>
                            ) : multiple ? (
                              <button
                                className={`absolute top-2 end-2 z-10 w-7 h-7 rounded-lg border flex items-center justify-center transition ${
                                  isPicked ? "bg-white/20 border-white/30" : "bg-black/30 border-white/20 hover:bg-black/40"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePicked(img.url);
                                }}
                                title={tr("اختيار", "Choose")}
                              >
                                {isPicked ? "✓" : ""}
                              </button>
                            ) : null}

                            <div
                              onClick={() => {
                                if (!manageMode && !multiple && onSelect) {
                                  onSelect(img.url);
                                  onClose();
                                  return;
                                }
                                if (!manageMode && multiple) {
                                  togglePicked(img.url);
                                  return;
                                }
                                openManage(img);
                              }}
                            >
                              <img src={img.url} className="w-full h-28 object-cover" />
                              <div className="p-2">
                                <div className="text-xs text-white/80 truncate" title={img.displayName ?? img.filename}>
                                  {img.displayName || img.filename}
                                </div>
                                <div className="text-[11px] text-white/40 flex items-center justify-between mt-1">
                                  <span>{formatSize(img.size)}</span>
                                  <span>{img.width && img.height ? `${img.width}×${img.height}` : ""}</span>
                                </div>
                              </div>
                            </div>

                            <div className="absolute top-2 start-2 z-10 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                              <button
                                type="button"
                                className="grid h-7 w-7 place-items-center rounded-lg border border-white/20 bg-black/50 text-sm text-white hover:bg-black/70"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCutout(cutoutTargetOf(img));
                                }}
                                title={tr("شيل الخلفية", "Remove background")}
                                aria-label={tr("شيل الخلفية", "Remove background")}
                                data-testid="media-cutout"
                              >
                                ✂
                              </button>
                            </div>

                            {manageMode && (
                              <div className="absolute bottom-2 start-2 opacity-0 group-hover:opacity-100 transition">
                                <Button
                                  variant="ghost"
                                  className="!px-2 !py-1 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openManage(img);
                                  }}
                                >
                                  {tr("إدارة", "Manage")}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {cursor && (
                    <div className="flex justify-center mt-4">
                      <Button variant="ghost" onClick={() => load(false)} isLoading={loadingMore}>
                        {tr("تحميل المزيد", "Load more")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Manage panel */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
              {!manage ? (
                <div className="text-white/60 text-sm">{tr("اختيار صورة (وضع الإدارة) لتعديلها.", "Pick an image (manage mode) to edit it.")}</div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl overflow-hidden border border-white/[0.06]">
                    <img src={manage.url} className="w-full h-40 object-cover" />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <div className="text-xs text-white/50 mb-1">Display name</div>
                      <Input value={manageName} onChange={(e) => setManageName(e.target.value)} />
                    </div>

                    <div>
                      <div className="text-xs text-white/50 mb-1">Folder</div>
                      <Input
                        list="media-folder-list"
                        value={manageFolder ?? ""}
                        onChange={(e) => setManageFolder(e.target.value || null)}
                        placeholder={tr("مثال: homepage", "e.g. homepage")}
                      />
                      <datalist id="media-folder-list">
                        {folderNames.map((n) => (
                          <option key={n} value={n} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <div className="text-xs text-white/50 mb-1">Tags (comma)</div>
                      <Input value={manageTags} onChange={(e) => setManageTags(e.target.value)} placeholder="hero, banner, summer" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="primary" onClick={saveManage} isLoading={savingMeta}>
                        {tr("حفظ", "Save")}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteRequest(manage)}
                        isLoading={deleting}
                      >
                        {tr("حذف", "Delete")}
                      </Button>
                      <Button variant="ghost" onClick={() => setManage(null)}>
                        {tr("إغلاق", "Close")}
                      </Button>
                    </div>
                    <Button variant="secondary" onClick={() => setCutout(cutoutTargetOf(manage))} data-testid="media-cutout-manage">
                      {tr("✂ شيل الخلفية (صورة جديدة)", "✂ Remove background (new picture)")}
                    </Button>

                    <div className="text-xs text-white/40 space-y-1">
                      <div>filename: {manage.filename}</div>
                      <div>id: {manage.id}</div>
                      <div>created: {new Date(manage.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Create folder */}
      <Modal
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        title={tr("إنشاء مجلد", "New folder")}
        widthClassName="max-w-md"
      >
        <div className="space-y-3">
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={tr("اسم المجلد", "Folder name")} />
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={createFolder}>{tr("إنشاء", "Create")}</Button>
            <Button variant="ghost" onClick={() => setCreateFolderOpen(false)}>{tr("إلغاء", "Cancel")}</Button>
          </div>
          <div className="text-xs text-white/50">{tr("ملاحظة: نقل الصور للمجلد بيصير من وضع الإدارة أو Bulk.", "Tip: move images into the folder from manage mode or Bulk.")}</div>
        </div>
      </Modal>

      {/* Rename folder */}
      <Modal
        open={renameFolderOpen}
        onClose={() => setRenameFolderOpen(false)}
        title={tr("تغيير اسم المجلد", "Rename folder")}
        widthClassName="max-w-md"
      >
        <div className="space-y-3">
          <Input value={renameFolderName} onChange={(e) => setRenameFolderName(e.target.value)} placeholder={tr("اسم جديد", "New name")} />
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={renameFolder}>{tr("حفظ", "Save")}</Button>
            <Button variant="ghost" onClick={() => setRenameFolderOpen(false)}>{tr("إلغاء", "Cancel")}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete folder confirm */}
      <ConfirmDialog
        open={!!deleteFolderConfirm}
        title={tr("حذف مجلد", "Delete folder")}
        variant="warning"
        message={deleteFolderConfirm ? tr(`حذف مجلد "${deleteFolderConfirm.name}"؟ (بس إذا فاضي)`, "Delete the folder \"{0}\"? (only if it's empty)", [deleteFolderConfirm.name]) : ""}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onCancel={() => setDeleteFolderConfirm(null)}
        onConfirm={deleteFolderConfirmed}
      />

      {/* Delete image confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title={tr("حذف صورة", "Delete image")}
        variant="danger"
        message={deleteConfirm ? tr(`حذف "${deleteConfirm.displayName || deleteConfirm.filename}"؟`, "Delete \"{0}\"?", [deleteConfirm.displayName || deleteConfirm.filename]) : ""}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        isLoading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />

      {/* Delete older duplicates confirm */}
      <ConfirmDialog
        open={deleteOlderConfirmOpen}
        title={tr("حذف التكرارات", "Delete duplicates")}
        variant="warning"
        message={tr(`حذف ${deleteOlderIds.length} صورة مكررة (الأقدم)؟`, "Delete {0} duplicate images (the oldest)?", [deleteOlderIds.length])}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        isLoading={deleting}
        onCancel={() => {
          setDeleteOlderConfirmOpen(false);
          setDeleteOlderIds([]);
        }}
        onConfirm={confirmDeleteOlderDuplicates}
      />

      {/* Duplicates modal */}
      <Modal
        open={duplicatesOpen}
        onClose={() => setDuplicatesOpen(false)}
        title={tr("الصور المكررة", "Duplicate images")}
        widthClassName="max-w-6xl"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1 flex items-center gap-2">
              <Select
                value={duplicatesMode}
                onChange={(e) => setDuplicatesMode(e.target.value as DuplicatesMode)}
                options={[
                  { value: "exact", label: tr("تطابق كامل", "Exact match") },
                  { value: "near", label: tr("قريب (تشابه)", "Close (similar)") },
                ]}
              />
              <Input
                type="number"
                min={1}
                max={200}
                value={duplicatesLimit}
                onChange={(e) => setDuplicatesLimit(Math.max(1, Math.min(200, Number(e.target.value) || 30)))}
                placeholder={tr("عدد المجموعات", "Number of groups")}
              />
              <Button variant="ghost" onClick={loadDuplicates} isLoading={duplicatesLoading}>
                {tr("تحديث", "Refresh")}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="danger" onClick={deleteSelectedDuplicates} disabled={!duplicateSelected.length} isLoading={deleting}>
                {tr("حذف المحدد (", "Delete selected (")}{duplicateSelected.length})
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  const ids = collectOlderDuplicateIds();
                  if (!ids.length) {
                    toast.error(tr("لا يوجد تكرارات للحذف", "No duplicates to delete"));
                    return;
                  }
                  setDeleteOlderIds(ids);
                  setDeleteOlderConfirmOpen(true);
                }}
              >
                {tr("حذف الأقدم في كل المجموعات", "Delete the oldest in every group")}
              </Button>
              <Button variant="ghost" onClick={() => setDuplicateSelected([])}>
                {tr("إلغاء التحديد", "Clear selection")}
              </Button>
            </div>
          </div>

          {duplicatesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="text-center text-white/60 py-16">{tr("لا يوجد تكرارات", "No duplicates")}</div>
          ) : (
            <div className="flex flex-col gap-4">
              {duplicatesMode === "exact"
                ? (duplicateGroups as DuplicateGroupExact[]).map((group) => (
                    <div key={group.hash} className="border border-white/[0.06] rounded-2xl p-4 bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-white/80">
                          Hash: <span className="text-white/60">{group.hash}</span> {tr("• عدد:", "• Count:")}{" "}
                          <span className="text-white">{group.count}</span>
                        </div>
                        <Button variant="ghost" onClick={() => selectGroupOlderExact(group.items)}>
                          {tr("تحديد الأقدم", "Select the oldest")}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {group.items.map((img) => (
                          <div key={img.id} className="border border-white/[0.06] rounded-xl overflow-hidden">
                            <div className="relative">
                              <img src={img.url} className="w-full h-24 object-cover" />
                              <button
                                className={`absolute top-2 end-2 w-6 h-6 rounded-lg border text-xs flex items-center justify-center ${
                                  duplicateSelectedSet.has(img.id)
                                    ? "bg-white/20 border-white/30"
                                    : "bg-black/40 border-white/20"
                                }`}
                                onClick={() => toggleDuplicate(img.id)}
                                title={tr("تحديد للحذف", "Select to delete")}
                              >
                                {duplicateSelectedSet.has(img.id) ? "✓" : ""}
                              </button>
                            </div>
                            <div className="p-2">
                              <div className="text-[11px] text-white/70 truncate">{img.displayName || img.filename}</div>
                              <div className="text-[10px] text-white/40 flex items-center justify-between">
                                <span>{formatSize(img.size)}</span>
                                <span>{img.width && img.height ? `${img.width}×${img.height}` : ""}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                : (duplicateGroups as DuplicateGroupNear[]).map((group) => (
                    <div key={group.baseId} className="border border-white/[0.06] rounded-2xl p-4 bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-white/80">
                          Base: <span className="text-white/60">{group.baseId}</span>
                        </div>
                        <Button variant="ghost" onClick={() => selectGroupOlderNear(group.items)}>
                          {tr("تحديد الأقدم", "Select the oldest")}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {group.items.map((entry) => (
                          <div key={entry.item.id} className="border border-white/[0.06] rounded-xl overflow-hidden">
                            <div className="relative">
                              <img src={entry.item.url} className="w-full h-24 object-cover" />
                              <button
                                className={`absolute top-2 end-2 w-6 h-6 rounded-lg border text-xs flex items-center justify-center ${
                                  duplicateSelectedSet.has(entry.item.id)
                                    ? "bg-white/20 border-white/30"
                                    : "bg-black/40 border-white/20"
                                }`}
                                onClick={() => toggleDuplicate(entry.item.id)}
                                title={tr("تحديد للحذف", "Select to delete")}
                              >
                                {duplicateSelectedSet.has(entry.item.id) ? "✓" : ""}
                              </button>
                              <div className="absolute bottom-2 start-2 text-[10px] bg-black/50 text-white/80 px-1.5 py-0.5 rounded">
                                d={entry.distance}
                              </div>
                            </div>
                            <div className="p-2">
                              <div className="text-[11px] text-white/70 truncate">{entry.item.displayName || entry.item.filename}</div>
                              <div className="text-[10px] text-white/40 flex items-center justify-between">
                                <span>{formatSize(entry.item.size)}</span>
                                <span>{entry.item.width && entry.item.height ? `${entry.item.width}×${entry.item.height}` : ""}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
            </div>
          )}
        </div>
      </Modal>

      <CutoutEditor open={!!cutout} target={cutout} onClose={() => setCutout(null)} onSaved={(asset) => addCutout(asset)} />
      <CutoutBatch open={!!cutoutMany} targets={cutoutMany ?? []} onClose={() => setCutoutMany(null)} onSaved={(_key, asset) => addCutout(asset)} />

      {/* Usage dialog */}
      <Modal open={usageOpen} onClose={() => setUsageOpen(false)} title={tr("الصورة مستخدمة", "The image is in use")} widthClassName="max-w-lg">
        <div className="space-y-4">
          <div className="text-sm text-white/70">
            {tr("ما بزبط تنحذف — لازم تنشال من الأماكن اللي بتستخدمها أولاً.", "It can't be deleted — remove it from the places that use it first.")}
          </div>
          {usageList.length === 0 ? (
            <div className="text-white/50 text-sm">No usage info.</div>
          ) : (
            <UsageList usage={usageList} />
          )}
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setUsageOpen(false)}>{tr("تمام", "OK")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function FolderRow({
  label,
  count,
  active,
  onClick,
  onRename,
  onDelete,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={`group flex items-center gap-2 px-3 py-2 rounded-xl border transition ${active ? "bg-white/[0.06] border-white/[0.12]" : "border-transparent hover:bg-white/[0.04]"}`}>
      <button className="flex-1 text-start text-sm text-white/80" onClick={onClick}>
        {label}
        <span className="text-white/40"> ({count})</span>
      </button>
      {onRename && (
        <button
          className="opacity-0 group-hover:opacity-100 text-xs text-white/50 hover:text-white px-2"
          onClick={onRename}
          title="Rename"
        >
          ✎
        </button>
      )}
      {onDelete && (
        <button
          className="opacity-0 group-hover:opacity-100 text-xs text-white/50 hover:text-white px-2"
          onClick={onDelete}
          title="Delete"
        >
          🗑
        </button>
      )}
    </div>
  );
}

function BulkFolderMove({
  folderNames,
  onMove,
}: {
  folderNames: string[];
  onMove: (folder: string | null) => void;
}) {
  const [val, setVal] = useState<string>("");
  return (
    <div className="flex items-center gap-2 flex-1">
      <select
        className="w-full bg-surface-900 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/90"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      >
        <option value="">{tr("نقل لمجلد…", "Move to folder…")}</option>
        <option value="__unfiled__">{tr("بدون مجلد", "No folder")}</option>
        {folderNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        onClick={() => {
          if (!val) return;
          if (val === "__unfiled__") onMove(null);
          else onMove(val);
          setVal("");
        }}
      >
        {tr("نقل", "Move")}
      </Button>
    </div>
  );
}

function BulkTags({
  onAdd,
  onRemove,
}: {
  onAdd: (csv: string) => void;
  onRemove: (csv: string) => void;
}) {
  const [csv, setCsv] = useState("");
  return (
    <div className="flex items-center gap-2 flex-1">
      <Input value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Tags: hero, banner" />
      <Button
        variant="ghost"
        onClick={() => {
          onAdd(csv);
          setCsv("");
        }}
      >
        +Tag
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          onRemove(csv);
          setCsv("");
        }}
      >
        -Tag
      </Button>
    </div>
  );
}

function UsageList({ usage }: { usage: MediaUsage[] }) {
  const grouped = groupUsage(usage);
  return (
    <div className="space-y-4">
      {grouped.settings.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-white mb-2">Settings</div>
          <ul className="space-y-1">
            {grouped.settings.map((u, idx) => (
              <li key={`s-${idx}`} className="text-sm text-white/70">• {usageTitle(u)}</li>
            ))}
          </ul>
        </div>
      )}

      {grouped.pages.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-white mb-2">Pages</div>
          <ul className="space-y-1">
            {grouped.pages.map((u, idx) => (
              <li key={`p-${idx}`} className="text-sm text-white/70">• {usageTitle(u)}</li>
            ))}
          </ul>
        </div>
      )}

      {grouped.products.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-white mb-2">Products</div>
          <ul className="space-y-1">
            {grouped.products.map((u, idx) => (
              <li key={`pr-${idx}`} className="text-sm text-white/70">• {usageTitle(u)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
