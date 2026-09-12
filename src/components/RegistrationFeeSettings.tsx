import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { CreditCard, Save, Settings2 } from "lucide-react";

import {
  loadRegistrationFeeSettings,
  saveRegistrationFeeSettings,
} from "../lib/registrationFees";
import type { SaveRegistrationFeeSettingsInput } from "../lib/registrationFees";

const DEFAULT_DRAFT: SaveRegistrationFeeSettingsInput = {
  feeEnabled: false,
  feeAmount: 199,
  paymentMethod: "GCash",
  accountName: "",
  accountNumber: "",
  instructions: "Include the transaction reference and upload a clear payment receipt.",
  paymentDeadlineDays: 7,
};

export default function RegistrationFeeSettings() {
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const settings = await loadRegistrationFeeSettings();
      setDraft({
        feeEnabled: settings.feeEnabled,
        feeAmount: settings.feeAmount,
        paymentMethod: settings.paymentMethod,
        accountName: settings.accountName,
        accountNumber: settings.accountNumber,
        instructions: settings.instructions,
        paymentDeadlineDays: settings.paymentDeadlineDays,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load registration fee settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveRegistrationFeeSettings(draft);
      setMessage("Registration fee settings saved. New approvals will use these values.");
      await load();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save registration fee settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={styles.card} aria-labelledby="registration-fee-title">
      <div style={styles.header}>
        <div style={styles.titleGroup}>
          <span style={styles.icon}><Settings2 size={20} /></span>
          <div>
            <h2 id="registration-fee-title" style={styles.title}>Registration Fee</h2>
            <p style={styles.subtitle}>
              Charged once after document approval and before business activation.
            </p>
          </div>
        </div>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={draft.feeEnabled}
            disabled={loading || saving}
            onChange={(event) =>
              setDraft((current) => ({ ...current, feeEnabled: event.target.checked }))
            }
          />
          {draft.feeEnabled ? "Enabled" : "Disabled"}
        </label>
      </div>

      <div style={styles.grid}>
        <Field label="Fee amount (PHP)">
          <input
            style={styles.input}
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            value={draft.feeAmount}
            onChange={(event) =>
              setDraft((current) => ({ ...current, feeAmount: Number(event.target.value) }))
            }
          />
        </Field>
        <Field label="Payment method">
          <input
            style={styles.input}
            value={draft.paymentMethod}
            maxLength={50}
            placeholder="GCash, Maya, Bank transfer..."
            onChange={(event) =>
              setDraft((current) => ({ ...current, paymentMethod: event.target.value }))
            }
          />
        </Field>
        <Field label="Account name">
          <input
            style={styles.input}
            value={draft.accountName}
            maxLength={100}
            onChange={(event) =>
              setDraft((current) => ({ ...current, accountName: event.target.value }))
            }
          />
        </Field>
        <Field label="Account number">
          <input
            style={styles.input}
            value={draft.accountNumber}
            maxLength={100}
            onChange={(event) =>
              setDraft((current) => ({ ...current, accountNumber: event.target.value }))
            }
          />
        </Field>
        <Field label="Payment deadline (days)">
          <input
            style={styles.input}
            type="number"
            min="1"
            max="90"
            value={draft.paymentDeadlineDays}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                paymentDeadlineDays: Number(event.target.value),
              }))
            }
          />
        </Field>
        <Field label="Customer instructions" wide>
          <textarea
            style={{ ...styles.input, minHeight: 76, resize: "vertical" }}
            value={draft.instructions}
            maxLength={500}
            onChange={(event) =>
              setDraft((current) => ({ ...current, instructions: event.target.value }))
            }
          />
        </Field>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {message ? <div style={styles.success}>{message}</div> : null}

      <div style={styles.footer}>
        <div style={styles.snapshotNote}>
          <CreditCard size={16} /> Existing payment records keep their original price snapshot.
        </div>
        <button
          type="button"
          style={{ ...styles.saveButton, opacity: loading || saving ? 0.6 : 1 }}
          disabled={loading || saving}
          onClick={() => void save()}
        >
          <Save size={17} /> {saving ? "Saving..." : "Save Fee Settings"}
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label style={{ ...styles.field, ...(wide ? styles.wideField : {}) }}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  card: { marginBottom: 22, padding: 22, border: "1px solid #DCE5EA", borderRadius: 20, background: "#FFFFFF", boxShadow: "0 10px 30px rgba(18,59,93,0.06)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, marginBottom: 20, flexWrap: "wrap" },
  titleGroup: { display: "flex", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", color: "#2F6F91", background: "#EAF4F8" },
  title: { margin: 0, color: "#123B5D", fontSize: 20 },
  subtitle: { margin: "4px 0 0", color: "#64748B", fontSize: 13 },
  toggleLabel: { display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderRadius: 999, color: "#123B5D", background: "#EAF4F8", fontWeight: 700, fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 15 },
  field: { display: "flex", flexDirection: "column", gap: 7 },
  wideField: { gridColumn: "1 / -1" },
  label: { color: "#475569", fontSize: 12, fontWeight: 700 },
  input: { width: "100%", minHeight: 42, padding: "10px 12px", border: "1px solid #CBD5E1", borderRadius: 11, color: "#0F172A", background: "#FFFFFF", font: "inherit", boxSizing: "border-box" },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginTop: 18, flexWrap: "wrap" },
  snapshotNote: { display: "flex", alignItems: "center", gap: 7, color: "#64748B", fontSize: 12 },
  saveButton: { minHeight: 43, padding: "0 16px", border: 0, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#123B5D", background: "#F5B82E", fontWeight: 800, cursor: "pointer" },
  error: { marginTop: 14, padding: 11, borderRadius: 10, color: "#B91C1C", background: "#FEF2F2", fontSize: 13 },
  success: { marginTop: 14, padding: 11, borderRadius: 10, color: "#166534", background: "#F0FDF4", fontSize: 13 },
};
