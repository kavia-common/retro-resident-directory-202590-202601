import React, { useMemo, useState } from "react";
import { Field, RetroButton, TextArea, TextInput } from "./RetroUI";

function normalizeResident(resident) {
  return {
    full_name: resident?.full_name ?? resident?.name ?? "",
    building: resident?.building ?? "",
    unit: resident?.unit ?? "",
    phone: resident?.phone ?? "",
    email: resident?.email ?? "",
    notes: resident?.notes ?? "",
  };
}

function validate(values) {
  const errors = {};
  if (!values.full_name.trim()) errors.full_name = "Name is required.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

// PUBLIC_INTERFACE
export function ResidentForm({
  initialResident,
  submitLabel = "Save",
  onCancel,
  onSubmit,
  busy,
}) {
  /** Form for creating/updating a resident record. */
  const initial = useMemo(() => normalizeResident(initialResident), [initialResident]);
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const errors = validate(values);

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function markTouched(name) {
    setTouched((t) => ({ ...t, [name]: true }));
  }

  const canSubmit = Object.keys(errors).length === 0 && !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    const allTouched = Object.keys(values).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (Object.keys(errors).length > 0) return;
    await onSubmit(values);
  }

  return (
    <form className="retro-form" onSubmit={handleSubmit}>
      <div className="retro-grid">
        <Field label="Full name" error={touched.full_name ? errors.full_name : null}>
          <TextInput
            value={values.full_name}
            onChange={(e) => setField("full_name", e.target.value)}
            onBlur={() => markTouched("full_name")}
            placeholder="e.g., Pat Resident"
            autoComplete="name"
          />
        </Field>

        <Field label="Building">
          <TextInput
            value={values.building}
            onChange={(e) => setField("building", e.target.value)}
            placeholder="e.g., A"
          />
        </Field>

        <Field label="Unit">
          <TextInput
            value={values.unit}
            onChange={(e) => setField("unit", e.target.value)}
            placeholder="e.g., 101"
          />
        </Field>

        <Field label="Phone">
          <TextInput
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="e.g., (555) 123-4567"
            autoComplete="tel"
          />
        </Field>

        <Field
          label="Email"
          error={touched.email ? errors.email : null}
          hint="Optional"
        >
          <TextInput
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => markTouched("email")}
            placeholder="e.g., pat@example.com"
            autoComplete="email"
          />
        </Field>

        <div className="retro-grid__full">
          <Field label="Notes" hint="Optional">
            <TextArea
              rows={4}
              value={values.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Any helpful details..."
            />
          </Field>
        </div>
      </div>

      <div className="retro-form__actions">
        <RetroButton type="submit" disabled={!canSubmit}>
          {busy ? "Working..." : submitLabel}
        </RetroButton>
        <RetroButton type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </RetroButton>
      </div>
    </form>
  );
}
