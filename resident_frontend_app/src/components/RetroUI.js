import React from "react";
import "../App.css";

// PUBLIC_INTERFACE
export function RetroButton({ variant = "primary", size = "md", ...props }) {
  /** Retro-styled button with variants and sizes. */
  const cls = ["retro-btn", `retro-btn--${variant}`, `retro-btn--${size}`]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...props} />;
}

// PUBLIC_INTERFACE
export function RetroPanel({ title, actions, children }) {
  /** Panel container with title bar, suitable for retro "window" UI. */
  return (
    <section className="retro-panel" aria-label={title || "panel"}>
      {(title || actions) && (
        <div className="retro-panel__titlebar">
          <div className="retro-panel__title">{title}</div>
          <div className="retro-panel__actions">{actions}</div>
        </div>
      )}
      <div className="retro-panel__body">{children}</div>
    </section>
  );
}

// PUBLIC_INTERFACE
export function StatusBanner({ kind = "info", title, children, actions }) {
  /** Banner for loading/error/empty/information messages. */
  return (
    <div className={["status", `status--${kind}`].join(" ")} role="status">
      <div className="status__content">
        {title && <div className="status__title">{title}</div>}
        <div className="status__text">{children}</div>
      </div>
      {actions && <div className="status__actions">{actions}</div>}
    </div>
  );
}

// PUBLIC_INTERFACE
export function Field({ label, hint, error, children }) {
  /** Labeled field wrapper with hint and error text. */
  return (
    <label className="field">
      <div className="field__label">{label}</div>
      <div className="field__control">{children}</div>
      {hint && !error && <div className="field__hint">{hint}</div>}
      {error && (
        <div className="field__error" role="alert">
          {error}
        </div>
      )}
    </label>
  );
}

// PUBLIC_INTERFACE
export function TextInput(props) {
  /** Retro text input with consistent styling. */
  return <input className="retro-input" {...props} />;
}

// PUBLIC_INTERFACE
export function TextArea(props) {
  /** Retro textarea with consistent styling. */
  return <textarea className="retro-input retro-textarea" {...props} />;
}
