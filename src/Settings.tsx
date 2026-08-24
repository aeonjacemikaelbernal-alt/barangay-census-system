import { useEffect, useState } from "react";

import {
  UserRound,
  Building2,
  RefreshCw,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Save,
  MapPin,
  LockKeyhole,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Type,
  Languages,
  Monitor,
} from "lucide-react";

import { supabase } from "./supabaseClient";

type SettingsProps = {
  email?: string;
  onBackToDashboard: () => void;
  onRefreshData: () => void;
  onLogout: () => void;
};

type BarangaySettings = {
  barangayName: string;
  municipality: string;
  province: string;
  captainName: string;
  contactNumber: string;
  address: string;
};

type SystemPreferences = {
  theme: "light" | "dark";
  brightness: number;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  language: "english" | "tagalog";
  confirmLogout: boolean;
  autoRefresh: boolean;
};

const defaultSettings: BarangaySettings = {
  barangayName: "",
  municipality: "",
  province: "",
  captainName: "",
  contactNumber: "",
  address: "",
};

const defaultPreferences: SystemPreferences = {
  theme: "light",
  brightness: 100,
  fontFamily: "Inter",
  fontSize: "medium",
  language: "english",
  confirmLogout: true,
  autoRefresh: false,
};

function Settings({
  email,
  onBackToDashboard,
  onRefreshData,
  onLogout,
}: SettingsProps) {
  /* =========================================================
     BARANGAY SETTINGS
  ========================================================= */

  const [settings, setSettings] =
    useState<BarangaySettings>(defaultSettings);

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [savingSettings, setSavingSettings] =
    useState(false);

  const [saveMessage, setSaveMessage] =
    useState("");

  const [saveError, setSaveError] =
    useState("");

  /* =========================================================
     SYSTEM PREFERENCES
  ========================================================= */

  const [preferences, setPreferences] =
    useState<SystemPreferences>(defaultPreferences);

  const [loadingPreferences, setLoadingPreferences] =
    useState(true);

  const [savingPreferences, setSavingPreferences] =
    useState(false);

  const [preferenceMessage, setPreferenceMessage] =
    useState("");

  const [preferenceError, setPreferenceError] =
    useState("");

  /* =========================================================
     PASSWORD
  ========================================================= */

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  /* =========================================================
     LOAD BARANGAY SETTINGS
  ========================================================= */

  useEffect(() => {
    const loadBarangaySettings = async () => {
      setLoadingSettings(true);
      setSaveError("");

      const { data, error } = await supabase
        .from("barangay_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error(
          "FAILED TO LOAD BARANGAY SETTINGS:",
          error
        );

        setSaveError(
          "Unable to load barangay information."
        );

        setLoadingSettings(false);
        return;
      }

      if (data) {
        setSettings({
          barangayName:
            data.barangay_name || "",
          municipality:
            data.municipality || "",
          province:
            data.province || "",
          captainName:
            data.captain_name || "",
          contactNumber:
            data.contact_number || "",
          address:
            data.address || "",
        });
      }

      setLoadingSettings(false);
    };

    loadBarangaySettings();
  }, []);

  /* =========================================================
     LOAD SYSTEM PREFERENCES
  ========================================================= */

  useEffect(() => {
    const loadPreferences = async () => {
      setLoadingPreferences(true);
      setPreferenceError("");

      const { data, error } = await supabase
        .from("system_preferences")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error(
          "FAILED TO LOAD SYSTEM PREFERENCES:",
          error
        );

        setPreferenceError(
          "Unable to load system preferences."
        );

        setLoadingPreferences(false);
        return;
      }

      if (data) {
        const loadedPreferences: SystemPreferences = {
          theme:
            data.theme === "dark"
              ? "dark"
              : "light",

          brightness:
            Number(data.brightness) || 100,

          fontFamily:
            data.font_family || "Inter",

          fontSize:
            data.font_size === "small"
              ? "small"
              : data.font_size === "large"
              ? "large"
              : "medium",

          language:
            data.language === "tagalog"
              ? "tagalog"
              : "english",

          confirmLogout:
            data.confirm_logout !== false,

          autoRefresh:
            data.auto_refresh === true,
        };

        setPreferences(loadedPreferences);

        applyPreferences(loadedPreferences);
      }

      setLoadingPreferences(false);
    };

    loadPreferences();
  }, []);

  /* =========================================================
     APPLY SYSTEM PREFERENCES
  ========================================================= */

  const applyPreferences = (
    current: SystemPreferences
  ) => {
    const root = document.documentElement;
    const body = document.body;

    const fontSizes = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };

    const fontSize =
      fontSizes[current.fontSize];

    root.style.setProperty(
      "--system-font-family",
      current.fontFamily
    );

    root.style.setProperty(
      "--system-font-size",
      fontSize
    );

    body.style.fontFamily =
      current.fontFamily;

    body.style.fontSize =
      fontSize;

    body.style.filter =
      `brightness(${current.brightness}%)`;

    if (current.theme === "dark") {
      root.style.setProperty(
        "--system-background",
        "#111827"
      );

      root.style.setProperty(
        "--system-surface",
        "#1f2937"
      );

      root.style.setProperty(
        "--system-text",
        "#f9fafb"
      );
    } else {
      root.style.setProperty(
        "--system-background",
        "#f5f7fb"
      );

      root.style.setProperty(
        "--system-surface",
        "#ffffff"
      );

      root.style.setProperty(
        "--system-text",
        "#172033"
      );
    }
  };

  /* =========================================================
     BARANGAY FIELD CHANGE
  ========================================================= */

  const handleChange = (
    field: keyof BarangaySettings,
    value: string
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSaveMessage("");
    setSaveError("");
  };

  /* =========================================================
     SAVE BARANGAY SETTINGS
  ========================================================= */

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSaveMessage("");
    setSaveError("");

    const { error } = await supabase
      .from("barangay_settings")
      .upsert(
        {
          id: 1,
          barangay_name:
            settings.barangayName.trim(),
          municipality:
            settings.municipality.trim(),
          province:
            settings.province.trim(),
          captain_name:
            settings.captainName.trim(),
          contact_number:
            settings.contactNumber.trim(),
          address:
            settings.address.trim(),
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      console.error(
        "FAILED TO SAVE BARANGAY SETTINGS:",
        error
      );

      setSaveError(
        "Unable to save barangay information."
      );

      setSavingSettings(false);
      return;
    }

    setSaveMessage(
      "Barangay information saved successfully."
    );

    setSavingSettings(false);
  };

  /* =========================================================
     PREFERENCE CHANGE
  ========================================================= */

  const handlePreferenceChange = (
    field: keyof SystemPreferences,
    value:
      | string
      | number
      | boolean
  ) => {
    setPreferences((current) => {
      const updated = {
        ...current,
        [field]: value,
      } as SystemPreferences;

      applyPreferences(updated);

      return updated;
    });

    setPreferenceMessage("");
    setPreferenceError("");
  };

  /* =========================================================
     SAVE SYSTEM PREFERENCES
  ========================================================= */

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    setPreferenceMessage("");
    setPreferenceError("");

    const { error } = await supabase
      .from("system_preferences")
      .upsert(
        {
          id: 1,
          theme: preferences.theme,
          brightness: preferences.brightness,
          font_family:
            preferences.fontFamily,
          font_size:
            preferences.fontSize,
          language:
            preferences.language,
          confirm_logout:
            preferences.confirmLogout,
          auto_refresh:
            preferences.autoRefresh,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      console.error(
        "FAILED TO SAVE SYSTEM PREFERENCES:",
        error
      );

      setPreferenceError(
        "Unable to save system preferences."
      );

      setSavingPreferences(false);
      return;
    }

    setPreferenceMessage(
      "System preferences saved successfully."
    );

    setSavingPreferences(false);
  };

  /* =========================================================
     CHANGE PASSWORD
  ========================================================= */

  const handleChangePassword = async () => {
    setPasswordMessage("");
    setPasswordError("");

    if (!newPassword || !confirmPassword) {
      setPasswordError(
        "Please enter your new password and confirm it."
      );
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "Passwords do not match."
      );
      return;
    }

    setChangingPassword(true);

    const { error } =
      await supabase.auth.updateUser({
        password: newPassword,
      });

    if (error) {
      console.error(
        "FAILED TO CHANGE PASSWORD:",
        error
      );

      setPasswordError(
        error.message ||
          "Unable to change password."
      );

      setChangingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    setPasswordMessage(
      "Password changed successfully."
    );

    setChangingPassword(false);
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogoutClick = () => {
    if (preferences.confirmLogout) {
      const confirmed = window.confirm(
        "Are you sure you want to log out?"
      );

      if (!confirmed) {
        return;
      }
    }

    onLogout();
  };

  /* =========================================================
     INPUT STYLE
  ========================================================= */

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #dfe4eb",
    borderRadius: "9px",
    padding: "11px 12px",
    fontSize: "14px",
    outline: "none",
    background: "white",
  };

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <main
      style={{
        flex: 1,
        padding: "34px 42px",
        background:
          preferences.theme === "dark"
            ? "#111827"
            : "#f5f7fb",
        minHeight: "100vh",
        color:
          preferences.theme === "dark"
            ? "#f9fafb"
            : "#172033",
        transition:
          "background 0.25s ease, color 0.25s ease",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          gap: "20px",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 7px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "#7e8a9f",
            }}
          >
            SYSTEM CONFIGURATION
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color:
                preferences.theme === "dark"
                  ? "#f9fafb"
                  : "#172033",
            }}
          >
            Settings
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            Manage your account and barangay system settings.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          style={{
            border: "1px solid #dfe4eb",
            background:
              preferences.theme === "dark"
                ? "#1f2937"
                : "white",
            color:
              preferences.theme === "dark"
                ? "#f9fafb"
                : "#172033",
            borderRadius: "10px",
            padding: "11px 18px",
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ArrowLeft size={16} />

          Back to Dashboard
        </button>
      </div>

      {/* ACCOUNT */}

      <section
        style={{
          background:
            preferences.theme === "dark"
              ? "#1f2937"
              : "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eef4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2458a6",
            }}
          >
            <UserRound size={20} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                color:
                  preferences.theme === "dark"
                    ? "#f9fafb"
                    : "#172033",
              }}
            >
              Account
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "#758094",
                fontSize: "13px",
              }}
            >
              Current signed-in account
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "15px 16px",
            border: "1px solid #edf0f4",
            borderRadius: "10px",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#8993a5",
              marginBottom: "5px",
            }}
          >
            EMAIL ADDRESS
          </span>

          <strong
            style={{
              color:
                preferences.theme === "dark"
                  ? "#f9fafb"
                  : "#172033",
              fontSize: "14px",
            }}
          >
            {email || "No email available"}
          </strong>
        </div>
      </section>

      {/* BARANGAY INFORMATION */}

      <section
        style={{
          background:
            preferences.theme === "dark"
              ? "#1f2937"
              : "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eef8f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#176b57",
            }}
          >
            <Building2 size={20} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                color:
                  preferences.theme === "dark"
                    ? "#f9fafb"
                    : "#172033",
              }}
            >
              Barangay Information
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "#758094",
                fontSize: "13px",
              }}
            >
              Information used throughout the barangay system.
            </p>
          </div>
        </div>

        {loadingSettings ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#758094",
            }}
          >
            Loading barangay information...
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              {[
                [
                  "BARANGAY NAME",
                  "barangayName",
                  "Enter barangay name",
                ],
                [
                  "MUNICIPALITY / CITY",
                  "municipality",
                  "Enter municipality or city",
                ],
                [
                  "PROVINCE",
                  "province",
                  "Enter province",
                ],
                [
                  "BARANGAY CAPTAIN",
                  "captainName",
                  "Enter barangay captain",
                ],
                [
                  "CONTACT NUMBER",
                  "contactNumber",
                  "Enter contact number",
                ],
              ].map(
                ([label, field, placeholder]) => (
                  <div key={field}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#667085",
                        marginBottom: "7px",
                      }}
                    >
                      {label}
                    </label>

                    <input
                      type="text"
                      value={
                        settings[
                          field as keyof BarangaySettings
                        ]
                      }
                      onChange={(event) =>
                        handleChange(
                          field as keyof BarangaySettings,
                          event.target.value
                        )
                      }
                      placeholder={placeholder}
                      style={inputStyle}
                    />
                  </div>
                )
              )}
            </div>

            <div style={{ marginTop: "16px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#667085",
                  marginBottom: "7px",
                }}
              >
                <MapPin size={13} />
                BARANGAY ADDRESS
              </label>

              <textarea
                value={settings.address}
                onChange={(event) =>
                  handleChange(
                    "address",
                    event.target.value
                  )
                }
                placeholder="Enter complete barangay address"
                rows={3}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "20px",
                paddingTop: "18px",
                borderTop: "1px solid #eef0f4",
                gap: "15px",
              }}
            >
              <div>
                {saveMessage && (
                  <span
                    style={{
                      color: "#168a5b",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <CheckCircle2 size={15} />
                    {saveMessage}
                  </span>
                )}

                {saveError && (
                  <span
                    style={{
                      color: "#b42318",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {saveError}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                style={{
                  border: "none",
                  background: savingSettings
                    ? "#9aa4b2"
                    : "#176b57",
                  color: "white",
                  borderRadius: "9px",
                  padding: "11px 18px",
                  cursor: savingSettings
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Save size={16} />

                {savingSettings
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* =====================================================
          SYSTEM PREFERENCES
      ===================================================== */}

      <section
        style={{
          background:
            preferences.theme === "dark"
              ? "#1f2937"
              : "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#f5efff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7048a8",
            }}
          >
            <SlidersHorizontal size={20} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                color:
                  preferences.theme === "dark"
                    ? "#f9fafb"
                    : "#172033",
              }}
            >
              System Preferences
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "#758094",
                fontSize: "13px",
              }}
            >
              Customize the appearance and behavior of the system.
            </p>
          </div>
        </div>

        {loadingPreferences ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              color: "#758094",
            }}
          >
            Loading system preferences...
          </div>
        ) : (
          <>
            {/* THEME */}

            <div
              style={{
                padding: "17px",
                border: "1px solid #edf0f4",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                {preferences.theme === "dark" ? (
                  <Moon size={18} />
                ) : (
                  <Sun size={18} />
                )}

                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "14px",
                    }}
                  >
                    Theme
                  </strong>

                  <span
                    style={{
                      color: "#758094",
                      fontSize: "12px",
                    }}
                  >
                    Choose the system appearance.
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    handlePreferenceChange(
                      "theme",
                      "light"
                    )
                  }
                  style={{
                    padding: "10px 16px",
                    borderRadius: "9px",
                    border:
                      preferences.theme === "light"
                        ? "2px solid #176b57"
                        : "1px solid #dfe4eb",
                    background:
                      preferences.theme === "light"
                        ? "#eef8f4"
                        : "white",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  <Sun size={15} />
                  {" "}Light
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handlePreferenceChange(
                      "theme",
                      "dark"
                    )
                  }
                  style={{
                    padding: "10px 16px",
                    borderRadius: "9px",
                    border:
                      preferences.theme === "dark"
                        ? "2px solid #176b57"
                        : "1px solid #dfe4eb",
                    background:
                      preferences.theme === "dark"
                        ? "#eef8f4"
                        : "white",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  <Moon size={15} />
                  {" "}Dark
                </button>
              </div>
            </div>

            {/* FONT */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  padding: "17px",
                  border: "1px solid #edf0f4",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <Type size={18} />

                  <strong
                    style={{
                      fontSize: "14px",
                    }}
                  >
                    Font Family
                  </strong>
                </div>

                <select
                  value={preferences.fontFamily}
                  onChange={(event) =>
                    handlePreferenceChange(
                      "fontFamily",
                      event.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="Inter">
                    Inter
                  </option>

                  <option value="Arial">
                    Arial
                  </option>

                  <option value="Verdana">
                    Verdana
                  </option>

                  <option value="Georgia">
                    Georgia
                  </option>

                  <option value="Tahoma">
                    Tahoma
                  </option>

                  <option value="Trebuchet MS">
                    Trebuchet MS
                  </option>
                </select>
              </div>

              {/* FONT SIZE */}

              <div
                style={{
                  padding: "17px",
                  border: "1px solid #edf0f4",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <Type size={18} />

                  <strong
                    style={{
                      fontSize: "14px",
                    }}
                  >
                    Font Size
                  </strong>
                </div>

                <select
                  value={preferences.fontSize}
                  onChange={(event) =>
                    handlePreferenceChange(
                      "fontSize",
                      event.target.value
                    )
                  }
                  style={inputStyle}
                >
                  <option value="small">
                    Small
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="large">
                    Large
                  </option>
                </select>
              </div>
            </div>

            {/* BRIGHTNESS */}

            <div
              style={{
                padding: "17px",
                border: "1px solid #edf0f4",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: "14px",
                  marginBottom: "5px",
                }}
              >
                Brightness
              </strong>

              <span
                style={{
                  display: "block",
                  color: "#758094",
                  fontSize: "12px",
                  marginBottom: "12px",
                }}
              >
                Adjust the visual brightness of the system.
              </span>

              <input
                type="range"
                min="80"
                max="110"
                step="5"
                value={preferences.brightness}
                onChange={(event) =>
                  handlePreferenceChange(
                    "brightness",
                    Number(event.target.value)
                  )
                }
                style={{
                  width: "100%",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "6px",
                  color: "#758094",
                  fontSize: "12px",
                }}
              >
                <span>80%</span>

                <strong>
                  {preferences.brightness}%
                </strong>

                <span>110%</span>
              </div>
            </div>

            {/* LANGUAGE */}

            <div
              style={{
                padding: "17px",
                border: "1px solid #edf0f4",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px",
                }}
              >
                <Languages size={18} />

                <strong
                  style={{
                    fontSize: "14px",
                  }}
                >
                  Language
                </strong>
              </div>

              <select
                value={preferences.language}
                onChange={(event) =>
                  handlePreferenceChange(
                    "language",
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="english">
                  English
                </option>

                <option value="tagalog">
                  Tagalog
                </option>
              </select>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#758094",
                  fontSize: "12px",
                }}
              >
                Language preference is saved to Supabase and can be used by the system interface.
              </p>
            </div>

            {/* CONFIRM LOGOUT */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                padding: "16px",
                border: "1px solid #edf0f4",
                borderRadius: "10px",
                marginBottom: "12px",
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  Confirm before logging out
                </strong>

                <span
                  style={{
                    color: "#758094",
                    fontSize: "13px",
                  }}
                >
                  Ask for confirmation before ending the current session.
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  handlePreferenceChange(
                    "confirmLogout",
                    !preferences.confirmLogout
                  )
                }
                style={{
                  width: "48px",
                  height: "26px",
                  borderRadius: "20px",
                  border: "none",
                  background:
                    preferences.confirmLogout
                      ? "#176b57"
                      : "#cbd2dc",
                  padding: "3px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent:
                    preferences.confirmLogout
                      ? "flex-end"
                      : "flex-start",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "white",
                  }}
                />
              </button>
            </div>

            {/* AUTO REFRESH */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                padding: "16px",
                border: "1px solid #edf0f4",
                borderRadius: "10px",
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "14px",
                    marginBottom: "4px",
                  }}
                >
                  Refresh census data when enabled
                </strong>

                <span
                  style={{
                    color: "#758094",
                    fontSize: "13px",
                  }}
                >
                  Reload the latest census records when this preference is turned on.
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  handlePreferenceChange(
                    "autoRefresh",
                    !preferences.autoRefresh
                  )
                }
                style={{
                  width: "48px",
                  height: "26px",
                  borderRadius: "20px",
                  border: "none",
                  background:
                    preferences.autoRefresh
                      ? "#176b57"
                      : "#cbd2dc",
                  padding: "3px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent:
                    preferences.autoRefresh
                      ? "flex-end"
                      : "flex-start",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "white",
                  }}
                />
              </button>
            </div>

            {/* SAVE PREFERENCES */}

            <div
              style={{
                marginTop: "18px",
                paddingTop: "18px",
                borderTop: "1px solid #eef0f4",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <div>
                {preferenceMessage && (
                  <span
                    style={{
                      color: "#168a5b",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <CheckCircle2 size={15} />
                    {preferenceMessage}
                  </span>
                )}

                {preferenceError && (
                  <span
                    style={{
                      color: "#b42318",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AlertCircle size={15} />
                    {preferenceError}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                style={{
                  border: "none",
                  background:
                    savingPreferences
                      ? "#9aa4b2"
                      : "#176b57",
                  color: "white",
                  borderRadius: "9px",
                  padding: "11px 18px",
                  cursor: savingPreferences
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Save size={16} />

                {savingPreferences
                  ? "Saving..."
                  : "Save Preferences"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* CENSUS DATA */}

      <section
        style={{
          background:
            preferences.theme === "dark"
              ? "#1f2937"
              : "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <RefreshCw size={20} />

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
              }}
            >
              Census Data
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "#758094",
                fontSize: "13px",
              }}
            >
              Reload the latest census records from Supabase.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshData}
          style={{
            border: "1px solid #dfe4eb",
            background:
              preferences.theme === "dark"
                ? "#374151"
                : "#f8fafc",
            borderRadius: "9px",
            padding: "10px 15px",
            cursor: "pointer",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <RefreshCw size={16} />

          Refresh Census Data
        </button>
      </section>

      {/* CHANGE PASSWORD */}

      <section
        style={{
          background:
            preferences.theme === "dark"
              ? "#1f2937"
              : "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <LockKeyhole size={20} />

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
              }}
            >
              Change Password
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "#758094",
                fontSize: "13px",
              }}
            >
              Update the password of the current account.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#667085",
                marginBottom: "7px",
              }}
            >
              NEW PASSWORD
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <input
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                placeholder="Enter new password"
                style={{
                  ...inputStyle,
                  paddingRight: "42px",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(
                    !showNewPassword
                  )
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#758094",
                }}
              >
                {showNewPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#667085",
                marginBottom: "7px",
              }}
            >
              CONFIRM PASSWORD
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Confirm new password"
                style={{
                  ...inputStyle,
                  paddingRight: "42px",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#758094",
                }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <div>
            {passwordMessage && (
              <span
                style={{
                  color: "#168a5b",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={15} />
                {passwordMessage}
              </span>
            )}

            {passwordError && (
              <span
                style={{
                  color: "#b42318",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={15} />
                {passwordError}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changingPassword}
            style={{
              border: "none",
              background:
                changingPassword
                  ? "#9aa4b2"
                  : "#176b57",
              color: "white",
              borderRadius: "9px",
              padding: "11px 18px",
              cursor: changingPassword
                ? "not-allowed"
                : "pointer",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <LockKeyhole size={16} />

            {changingPassword
              ? "Updating..."
              : "Update Password"}
          </button>
        </div>
      </section>

      {/* SYSTEM INFORMATION */}

      <section
        style={{
          background:
            preferences.theme === "dark"
              ? "#1f2937"
              : "white",
          border: "1px solid #e7eaf0",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <Monitor size={20} />

          <h2
            style={{
              margin: 0,
              fontSize: "18px",
            }}
          >
            System Information
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            style={{
              padding: "15px",
              border: "1px solid #edf0f4",
              borderRadius: "10px",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                color: "#8993a5",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              APPLICATION
            </p>

            <strong>
              Barangay Digital Census System
            </strong>
          </div>

          <div
            style={{
              padding: "15px",
              border: "1px solid #edf0f4",
              borderRadius: "10px",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                color: "#8993a5",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              MODULE
            </p>

            <strong>
              Census Management System
            </strong>
          </div>

          <div
            style={{
              padding: "15px",
              border: "1px solid #edf0f4",
              borderRadius: "10px",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                color: "#8993a5",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              DATA STORAGE
            </p>

            <strong>
              Supabase
            </strong>
          </div>
        </div>
      </section>

      {/* SECURITY */}

      <section
        style={{
          background:
            preferences.theme === "dark"
              ? "#1f2937"
              : "white",
          border: "1px solid #f0dede",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <ShieldCheck size={20} />

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
              }}
            >
              Security
            </h2>

            <p
              style={{
                margin: "4px 0 0",
                color: "#758094",
                fontSize: "13px",
              }}
            >
              End your current system session.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogoutClick}
          style={{
            border: "1px solid #e3bcbc",
            background: "#fff7f7",
            color: "#b42318",
            borderRadius: "9px",
            padding: "11px 17px",
            cursor: "pointer",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <LogOut size={16} />

          Log Out
        </button>
      </section>
    </main>
  );
}

export default Settings;