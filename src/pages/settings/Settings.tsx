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
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Circle,
  Moon,
  Sun,
  Monitor,
  Settings2,
} from "lucide-react";

import "./settings.css";

import { supabase } from "../../services/supabaseClient";
import {
  applyAppTheme,
  readSavedTheme,
  type AppTheme,
} from "../../utils/theme";

type SettingsProps = {
  email?: string;
  onBackToDashboard: () => void;
  onRefreshData: () => void;
  onLogout: () => void;
};

type BarangaySettings = {
  barangayName: string;
  barangayCode: string;
  municipality: string;
  municipalityCode: string;
  province: string;
  provinceCode: string;
  regionName: string;
  regionCode: string;
  captainName: string;
  contactNumber: string;
  address: string;
};

type SystemPreferences = {
  theme: AppTheme;
  confirmLogout: boolean;
};

const defaultSettings: BarangaySettings = {
  barangayName: "",
  barangayCode: "",
  municipality: "",
  municipalityCode: "",
  province: "",
  provinceCode: "",
  regionName: "",
  regionCode: "",
  captainName: "",
  contactNumber: "",
  address: "",
};

const defaultPreferences: SystemPreferences = {
  theme: "light",
  confirmLogout: true,
};

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;

function getPasswordRequirements(password: string) {
  const characterCount = Array.from(password).length;
  const byteCount = new TextEncoder().encode(password).length;

  return [
    {
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: characterCount >= PASSWORD_MIN_LENGTH,
    },
    {
      label: "One uppercase letter",
      met: /\p{Lu}/u.test(password),
    },
    {
      label: "One lowercase letter",
      met: /\p{Ll}/u.test(password),
    },
    {
      label: "One number",
      met: /\p{N}/u.test(password),
    },
    {
      label: "One symbol",
      met: /[^\p{L}\p{N}\s]/u.test(password),
    },
    {
      label: `Within ${PASSWORD_MAX_BYTES}-byte limit`,
      met: byteCount <= PASSWORD_MAX_BYTES,
    },
  ];
}

const BARANGAY_PROFILE_CACHE_KEY =
  "barangay-census:barangay-profile:v1";

function cacheBarangayProfile(
  settings: BarangaySettings
): void {
  localStorage.setItem(
    BARANGAY_PROFILE_CACHE_KEY,
    JSON.stringify({
      regionName: settings.regionName,
      regionCode: settings.regionCode,
      province: settings.province,
      provinceCode: settings.provinceCode,
      municipality: settings.municipality,
      municipalityCode: settings.municipalityCode,
      barangayName: settings.barangayName,
      barangayCode: settings.barangayCode,
    })
  );
}

type PsgcOption = {
  code: string;
  name: string;
};

const PSGC_CACHE_PREFIX =
  "barangay-census:settings-psgc:v1:";

async function loadPsgcOptions(
  url: string,
  cacheKey: string
): Promise<PsgcOption[]> {
  const storageKey =
    `${PSGC_CACHE_PREFIX}${cacheKey}`;

  let cached: PsgcOption[] = [];

  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? parsed : [];
  } catch {
    // Keep the empty fallback when the cached value cannot be parsed.
  }

  if (!navigator.onLine) return cached;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `PSGC request failed: ${response.status}`
      );
    }

    const data = await response.json();
    const options = Array.isArray(data) ? data : cached;

    localStorage.setItem(
      storageKey,
      JSON.stringify(options)
    );

    return options;
  } catch (error) {
    console.error(
      "FAILED TO LOAD PSGC OPTIONS:",
      error
    );
    return cached;
  }
}

function Settings({
  email,
  onBackToDashboard,
  onRefreshData,
  onLogout,
}: SettingsProps) {

    type SettingsTab =
    | "barangay"
    | "account"
    | "system";

  const [activeTab, setActiveTab] =
    useState<SettingsTab>("barangay");

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

  const [regions, setRegions] =
    useState<PsgcOption[]>([]);
  const [provinces, setProvinces] =
    useState<PsgcOption[]>([]);
  const [provincesRegionCode, setProvincesRegionCode] =
    useState("");
  const [municipalities, setMunicipalities] =
    useState<PsgcOption[]>([]);
  const [municipalitiesProvinceCode, setMunicipalitiesProvinceCode] =
    useState("");
  const [barangays, setBarangays] =
    useState<PsgcOption[]>([]);
  const [barangaysMunicipalityCode, setBarangaysMunicipalityCode] =
    useState("");

  /* =========================================================
     SYSTEM PREFERENCES
  ========================================================= */

const [preferences, setPreferences] =
  useState<SystemPreferences>(() => {
    return {
      ...defaultPreferences,
      theme: readSavedTheme() ?? "light",
    };
  });

    const isDark = preferences.theme === "dark";

const themeColors = {
  page: isDark ? "#152235" : "#eef6ff",
  surface: isDark ? "#1d2c40" : "#ffffff",
  surfaceSoft: isDark ? "#223249" : "#f8fafc",
  surfaceActive: isDark ? "#2b3d56" : "#eef4fb",

  border: isDark ? "#40516a" : "#dbe5ef",
  borderSoft: isDark ? "#34465f" : "#e7edf4",

  text: isDark ? "#f1f5f9" : "#172033",
  textSecondary: isDark ? "#c1ccda" : "#64748b",
  textMuted: isDark ? "#91a1b5" : "#8993a5",
};

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

  const passwordRequirements =
    getPasswordRequirements(newPassword);
  const passwordScore = newPassword
    ? passwordRequirements.filter((requirement) => requirement.met).length
    : 0;
  const passwordStrength = !newPassword
    ? {
        label: "Not rated",
        color: themeColors.textMuted,
      }
    : passwordScore === passwordRequirements.length
      ? {
          label: "Strong",
          color: isDark ? "#6ee7b7" : "#15803d",
        }
      : passwordScore >= 4
        ? {
            label: "Fair",
            color: isDark ? "#fcd34d" : "#b45309",
          }
        : {
            label: "Weak",
            color: isDark ? "#fca5a5" : "#b91c1c",
          };
  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

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
          barangayCode:
            data.barangay_code || "",
          municipality:
            data.municipality || "",
          municipalityCode:
            data.municipality_code || "",
          province:
            data.province || "",
          provinceCode:
            data.province_code || "",
          regionName:
            data.region_name || "",
          regionCode:
            data.region_code || "",
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
     LOAD PSGC LOCATION OPTIONS
  ========================================================= */

  useEffect(() => {
    void loadPsgcOptions(
      "https://psgc.gitlab.io/api/regions/",
      "regions"
    ).then(setRegions);
  }, []);

  useEffect(() => {
    if (!settings.regionCode) {
      return;
    }

    const regionCode = settings.regionCode;
    let isCurrent = true;

    void loadPsgcOptions(
      `https://psgc.gitlab.io/api/regions/${settings.regionCode}/provinces/`,
      `provinces:${settings.regionCode}`
    ).then((options) => {
      if (!isCurrent) return;
      setProvinces(options);
      setProvincesRegionCode(regionCode);
    });

    return () => {
      isCurrent = false;
    };
  }, [settings.regionCode]);

  useEffect(() => {
    if (!settings.provinceCode) {
      return;
    }

    const provinceCode = settings.provinceCode;
    let isCurrent = true;

    void loadPsgcOptions(
      `https://psgc.gitlab.io/api/provinces/${settings.provinceCode}/municipalities/`,
      `municipalities:${settings.provinceCode}`
    ).then((options) => {
      if (!isCurrent) return;
      setMunicipalities(options);
      setMunicipalitiesProvinceCode(provinceCode);
    });

    return () => {
      isCurrent = false;
    };
  }, [settings.provinceCode]);

  useEffect(() => {
    if (!settings.municipalityCode) {
      return;
    }

    const municipalityCode = settings.municipalityCode;
    let isCurrent = true;

    void loadPsgcOptions(
      `https://psgc.gitlab.io/api/municipalities/${settings.municipalityCode}/barangays/`,
      `barangays:${settings.municipalityCode}`
    ).then((options) => {
      if (!isCurrent) return;
      setBarangays(options);
      setBarangaysMunicipalityCode(municipalityCode);
    });

    return () => {
      isCurrent = false;
    };
  }, [settings.municipalityCode]);

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

  const handleLocationChange = (
    level:
      | "region"
      | "province"
      | "municipality"
      | "barangay",
    code: string
  ) => {
    if (level === "region") {
      const selected = regions.find(
        (item) => item.code === code
      );

      setSettings((current) => ({
        ...current,
        regionCode: code,
        regionName: selected?.name ?? "",
        provinceCode: "",
        province: "",
        municipalityCode: "",
        municipality: "",
        barangayCode: "",
        barangayName: "",
      }));
      return;
    }

    if (level === "province") {
      const selected = provinces.find(
        (item) => item.code === code
      );

      setSettings((current) => ({
        ...current,
        provinceCode: code,
        province: selected?.name ?? "",
        municipalityCode: "",
        municipality: "",
        barangayCode: "",
        barangayName: "",
      }));
      return;
    }

    if (level === "municipality") {
      const selected = municipalities.find(
        (item) => item.code === code
      );

      setSettings((current) => ({
        ...current,
        municipalityCode: code,
        municipality: selected?.name ?? "",
        barangayCode: "",
        barangayName: "",
      }));
      return;
    }

    const selected = barangays.find(
      (item) => item.code === code
    );

    setSettings((current) => ({
      ...current,
      barangayCode: code,
      barangayName: selected?.name ?? "",
    }));
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
          barangay_code:
            settings.barangayCode,
          municipality:
            settings.municipality.trim(),
          municipality_code:
            settings.municipalityCode,
          province:
            settings.province.trim(),
          province_code:
            settings.provinceCode,
          region_name:
            settings.regionName.trim(),
          region_code:
            settings.regionCode,
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

    cacheBarangayProfile(settings);

    setSaveMessage(
      "Barangay information saved successfully."
    );

    setSavingSettings(false);
  };

  const handleThemeChange = (theme: AppTheme) => {
    try {
      localStorage.setItem("barangay-theme", theme);
    } catch (error) {
      console.error("FAILED TO SAVE THEME PREFERENCE:", error);
    }

    setPreferences((current) => ({
      ...current,
      theme,
    }));
    applyAppTheme(theme);
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

    if (
      passwordRequirements.some(
        (requirement) => !requirement.met
      )
    ) {
      setPasswordError(
        "Please meet all the password requirements shown above."
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

    try {
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
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(
        "Password changed successfully."
      );
    } catch (error) {
      console.error(
        "FAILED TO CHANGE PASSWORD:",
        error
      );

      setPasswordError(
        error instanceof Error
          ? error.message
          : "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
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
  border: `1px solid ${themeColors.border}`,
  borderRadius: "9px",
  padding: "11px 12px",
  fontSize: "14px",
  outline: "none",
  background: themeColors.surfaceSoft,
  color: themeColors.text,
  transition:
    "background 0.25s ease, color 0.25s ease, border-color 0.25s ease",
};

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <main
  className="settings-page-main"
  style={{
    flex: 1,
    padding: "34px 42px",
    background: themeColors.page,
    minHeight: "100vh",
    color: themeColors.text,
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

    {/* SETTINGS NAVIGATION */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "22px",
  }}
>
<nav
  style={{
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px",
    marginBottom: "0",
background:
  preferences.theme === "dark"
    ? "#1f2937"
    : "#ffffff",
border:
  preferences.theme === "dark"
    ? "1px solid #334155"
    : "1px solid #dfe5ec",
  }}
>
  {[
    {
      id: "barangay",
      label: "Barangay Profile",
      icon: <Building2 size={16} />,
    },
    {
      id: "account",
      label: "Account & Security",
      icon: <UserRound size={16} />,
    },
    {
      id: "system",
      label: "System",
      icon: <Settings2 size={16} />,
    },
  ].map((item) => {
    const selected = activeTab === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() =>
          setActiveTab(item.id as SettingsTab)
        }
        style={{
          height: "40px",
          padding: "0 16px",
          border: "none",
          borderRadius: "7px",
          background: selected
            ? preferences.theme === "dark"
              ? "#263449"
              : "#eef3f8"
            : "transparent",
          color: selected
            ? preferences.theme === "dark"
              ? "#ffffff"
              : "#172033"
            : "var(--system-text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: selected ? 700 : 600,
          whiteSpace: "nowrap",
          transition: "all 0.15s ease",
        }}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
    );
  })}

  </nav>

  <button
    type="button"
onClick={() => {
  const nextTheme =
    preferences.theme === "light" ? "dark" : "light";

  handleThemeChange(nextTheme);
}}
    title={
      preferences.theme === "light"
        ? "Switch to Dark Mode"
        : "Switch to Light Mode"
    }
    aria-label={
      preferences.theme === "light"
        ? "Switch to Dark Mode"
        : "Switch to Light Mode"
    }
   style={{
  width: "42px",
  height: "42px",
  flexShrink: 0,
  border:
    preferences.theme === "dark"
      ? "1px solid #334155"
      : "1px solid #dfe5ec",
  borderRadius: "10px",
  background:
    preferences.theme === "dark"
      ? "#1f2937"
      : "#ffffff",
  color:
    preferences.theme === "dark"
      ? "#f8fafc"
      : "#475569",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}}
  >
    {preferences.theme === "light" ? (
      <Moon size={17} />
    ) : (
      <Sun size={17} />
    )}
    </button>
</div>

{activeTab === "account" && (
  <>

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
              htmlFor="settings-new-password"
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
                id="settings-new-password"
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_BYTES}
                aria-describedby="settings-password-guidance"
                aria-invalid={Boolean(passwordError)}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setPasswordError("");
                  setPasswordMessage("");
                }}
                placeholder="Enter new password"
                style={{
                  ...inputStyle,
                  paddingRight: "42px",
                }}
              />

              <button
                type="button"
                aria-label={
                  showNewPassword
                    ? "Hide new password"
                    : "Show new password"
                }
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
              htmlFor="settings-confirm-password"
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
                id="settings-confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_BYTES}
                aria-describedby="settings-password-guidance settings-password-match"
                aria-invalid={Boolean(
                  passwordError ||
                    (confirmPassword && !passwordsMatch)
                )}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setPasswordError("");
                  setPasswordMessage("");
                }}
                placeholder="Confirm new password"
                style={{
                  ...inputStyle,
                  paddingRight: "42px",
                }}
              />

              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
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

            <p
              id="settings-password-match"
              className={`settings-password-match ${
                !confirmPassword
                  ? "is-empty"
                  : passwordsMatch
                    ? "is-valid"
                    : "is-invalid"
              }`}
              role="status"
              style={{
                minHeight: "16px",
                margin: "6px 0 0",
                fontSize: "12px",
              }}
            >
              {!confirmPassword
                ? " "
                : passwordsMatch
                  ? "Passwords match."
                  : "Passwords do not match."}
            </p>
          </div>
        </div>

        <div
          id="settings-password-guidance"
          style={{
            marginTop: "16px",
            padding: "14px 15px",
            border: `1px solid ${themeColors.borderSoft}`,
            borderRadius: "10px",
            background: themeColors.surfaceSoft,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <strong style={{ fontSize: "12px" }}>
              Password strength
            </strong>
            <span
              className={`settings-password-strength-label settings-password-strength-${passwordStrength.label.toLowerCase().replace(" ", "-")}`}
              aria-live="polite"
              style={{
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {passwordStrength.label}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Password strength"
            aria-valuemin={0}
            aria-valuemax={passwordRequirements.length}
            aria-valuenow={passwordScore}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${passwordRequirements.length}, minmax(0, 1fr))`,
              gap: "5px",
              marginBottom: "12px",
            }}
          >
            {passwordRequirements.map((_, index) => (
              <span
                key={`password-meter-${index}`}
                style={{
                  height: "5px",
                  borderRadius: "999px",
                  background:
                    newPassword && index < passwordScore
                      ? passwordStrength.color
                      : themeColors.borderSoft,
                  transition: "background 0.18s ease",
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(185px, 1fr))",
              gap: "7px 16px",
            }}
          >
            {passwordRequirements.map((requirement) => {
              const met = Boolean(newPassword) && requirement.met;

              return (
                <span
                  className={`settings-password-rule ${met ? "is-met" : ""}`}
                  key={requirement.label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "11px",
                  }}
                >
                  {met ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Circle size={14} />
                  )}
                  {requirement.label}
                </span>
              );
            })}
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
            className="settings-primary-button"
            onClick={handleChangePassword}
            disabled={changingPassword}
            style={{
              opacity: changingPassword ? 0.72 : 1,
            }}
          >
            <LockKeyhole size={16} />

            {changingPassword
              ? "Updating..."
              : "Update Password"}
          </button>
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

      </>
)}

      {activeTab === "barangay" && (
  <>

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
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                {[
                  [
                    "REGION",
                    settings.regionCode,
                    regions,
                    "region",
                    "Select region",
                  ],
                  [
                    "PROVINCE",
                    settings.provinceCode,
                    settings.regionCode === provincesRegionCode
                      ? provinces
                      : [],
                    "province",
                    "Select province",
                  ],
                  [
                    "MUNICIPALITY / CITY",
                    settings.municipalityCode,
                    settings.provinceCode === municipalitiesProvinceCode
                      ? municipalities
                      : [],
                    "municipality",
                    "Select municipality or city",
                  ],
                  [
                    "BARANGAY",
                    settings.barangayCode,
                    settings.municipalityCode === barangaysMunicipalityCode
                      ? barangays
                      : [],
                    "barangay",
                    "Select barangay",
                  ],
                ].map(
                  ([
                    label,
                    value,
                    options,
                    level,
                    placeholder,
                  ]) => (
                    <div key={String(level)}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#667085",
                          marginBottom: "7px",
                        }}
                      >
                        {String(label)}
                      </label>

                      <select
                        value={String(value)}
                        onChange={(event) =>
                          handleLocationChange(
                            level as
                              | "region"
                              | "province"
                              | "municipality"
                              | "barangay",
                            event.target.value
                          )
                        }
                        disabled={
                          level === "province"
                            ? !settings.regionCode
                            : level === "municipality"
                              ? !settings.provinceCode
                              : level === "barangay"
                                ? !settings.municipalityCode
                                : false
                        }
                        style={inputStyle}
                      >
                        <option value="">
                          {String(placeholder)}
                        </option>
                        {(options as PsgcOption[]).map(
                          (option) => (
                            <option
                              key={option.code}
                              value={option.code}
                            >
                              {option.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )
                )}
              </div>

              {[
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
                className="settings-primary-button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                style={{
                  opacity: savingSettings ? 0.72 : 1,
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
      </>
      )}

      {activeTab === "system" && (
  <>

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

      </>
      )}

    </main>
  );
}

export default Settings;
