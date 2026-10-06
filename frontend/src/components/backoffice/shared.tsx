"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApiException } from "@/lib/api";
import type { ListQuery } from "@/lib/backoffice-api";
import type { Paged } from "@/lib/types";

export const buttonClass =
  "inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed";
export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600";
export function useBasePath() {
  return usePathname().startsWith("/admin") ? "/admin" : "/staff";
}
export function errorTitle(error: unknown) {
  return error instanceof ApiException
    ? error.title
    : "Không thể thực hiện yêu cầu. Vui lòng thử lại.";
}

export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const version = useRef(0);
  const reload = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError("");
    try {
      const value = await load();
      if (current === version.current) setData(value);
    } catch (err) {
      if (current === version.current) setError(errorTitle(err));
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    void reload();
    const requestVersion = version;
    return () => {
      ++requestVersion.current;
    };
  }, [reload]);
  return { data, setData, loading, error, reload };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const locked = useRef(false);
  async function run<T>(
    action: () => Promise<T>,
    done?: (value: T) => void | Promise<void>,
  ) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    setFields({});
    try {
      const value = await action();
      await done?.(value);
    } catch (err) {
      setError(errorTitle(err));
      if (err instanceof ApiException) setFields(err.errors || {});
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return { busy, error, success, fields, run, setError, setSuccess };
}

export function Page({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </header>
      {children}
    </main>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      {children}
    </section>
  );
}
export function Feedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {success}
        </p>
      )}
    </>
  );
}
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return (
    <>
      {loading && (
        <p role="status" className="text-slate-600">
          Đang tải dữ liệu...
        </p>
      )}
      {error && (
        <Card>
          <Feedback error={error} />
          <button className={buttonClass} onClick={retry}>
            Thử lại
          </button>
        </Card>
      )}
    </>
  );
}
export function Field({
  label,
  name,
  errors,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  errors?: Record<string, string[]>;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        {...props}
        name={name}
        className={inputClass}
        aria-invalid={!!(name && errors?.[name])}
      />
      {name && errors?.[name] && (
        <span className="block text-sm text-rose-700">
          {errors[name].join(" ")}
        </span>
      )}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-slate-200 [&_td]:p-3 [&_th]:whitespace-nowrap [&_th]:p-3">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function DetailLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-semibold text-emerald-700 underline underline-offset-2"
    >
      {children}
    </Link>
  );
}

export function RecordList<T>({
  title,
  load,
  headers,
  row,
  rowKey,
  statuses,
  filterLabel = "Trạng thái",
  search = true,
  createHref,
  children,
  refreshKey = 0,
}: {
  title: string;
  load: (query: ListQuery) => Promise<Paged<T>>;
  headers: string[];
  row: (value: T) => ReactNode;
  rowKey: (value: T) => string;
  statuses?: Record<string, string>;
  search?: boolean;
  filterLabel?: string;
  createHref?: string;
  children?: ReactNode;
  refreshKey?: number;
}) {
  const [draftSearch, setDraftSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const resource = useResource(
    useCallback(() => {
      void refreshKey;
      return load({
        search: activeSearch || undefined,
        status: status || undefined,
        page,
        pageSize: 20,
      });
    }, [load, activeSearch, status, page, refreshKey]),
  );
  return (
    <Page
      title={title}
      actions={
        createHref && (
          <Link className={buttonClass} href={createHref}>
            Tạo mới
          </Link>
        )
      }
    >
      {children}
      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setActiveSearch(draftSearch.trim());
            setPage(1);
          }}
        >
          {search && (
            <Field
              label="Tìm kiếm"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
          )}
          {statuses && (
            <Select
              label={filterLabel}
              value={status}
              options={{ "": "Tất cả", ...statuses }}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
          )}
          {search && <button className={buttonClass}>Tìm</button>}
          <button
            type="button"
            className={buttonClass}
            onClick={resource.reload}
            disabled={resource.loading}
          >
            Làm mới
          </button>
        </form>
        <LoadState {...resource} retry={resource.reload} />
        {!resource.loading && !resource.error && resource.data && (
          <>
            {resource.data.items.length ? (
              <Table headers={headers}>
                {resource.data.items.map((item) => (
                  <tr key={rowKey(item)}>{row(item)}</tr>
                ))}
              </Table>
            ) : (
              <p className="text-slate-600">Không có dữ liệu phù hợp.</p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>
                {resource.data.total} bản ghi · Trang {page}
              </span>
              <div className="flex gap-2">
                <button
                  className={buttonClass}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Trước
                </button>
                <button
                  className={buttonClass}
                  disabled={
                    page * resource.data.pageSize >= resource.data.total
                  }
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}

export function ReasonActions({
  actions,
  busy,
  errorFields,
  onAction,
}: {
  actions: { key: string; label: string }[];
  busy: boolean;
  errorFields: Record<string, string[]>;
  onAction: (key: string, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  if (!actions.length) return null;
  return (
    <Card>
      <Field
        label="Lý do (bắt buộc)"
        name="reason"
        errors={errorFields}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            className={buttonClass}
            disabled={busy || !reason.trim()}
            onClick={() => {
              if (window.confirm(`${action.label}?`))
                onAction(action.key, reason.trim());
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function validateImage(file: File) {
  if (
    !/\.(png|jpe?g)$/i.test(file.name) ||
    !["image/png", "image/jpeg"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new ApiException({
      status: 400,
      code: "FILE_INVALID",
      title: "Chỉ nhận ảnh PNG/JPG/JPEG tối đa 5 MB.",
    });
}
