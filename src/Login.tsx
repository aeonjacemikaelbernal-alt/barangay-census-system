import {
  useEffect,
  useState,
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  UserPlus,
  UserRound,
  LogIn,
} from "lucide-react";

import { supabase } from "./supabaseClient";
import "./Login.css";

import barangayLogo from "./assets/barangay-pambuhan-logo.png";

import barangayHall from "./assets/login/barangay-hall.png";
import aerial1 from "./assets/login/aerial-1.jfif";
import aerial2 from "./assets/login/aerial-2.jfif";
import aerial3 from "./assets/login/aerial-3.jfif";
import aerial4 from "./assets/login/aerial-4.jfif";
import aerial5 from "./assets/login/aerial-5.jfif";
import aerial6 from "./assets/login/aerial-6.jfif";
import aerial7 from "./assets/login/aerial-7.jfif";
import aerial8 from "./assets/login/aerial-8.jfif";
import aerial9 from "./assets/login/aerial-9.jfif";
import aerial10 from "./assets/login/aerial-10.jfif";

type LoginProps = {
  onLoginSuccess: () => void;
};

const carouselImages = [
  barangayHall,
  aerial1,
  aerial2,
  aerial3,
  aerial4,
  aerial5,
  aerial6,
  aerial7,
  aerial8,
  aerial9,
  aerial10,
];

function Login({
  onLoginSuccess,
}: LoginProps) {
  const [isRegister, setIsRegister] =
    useState(false);

  const [loginEmail, setLoginEmail] =
    useState("");

  const [loginPassword, setLoginPassword] =
    useState("");

  const [registerEmail, setRegisterEmail] =
    useState("");

  const [
    registerPassword,
    setRegisterPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [fullName, setFullName] =
    useState("");

  const [
    showLoginPassword,
    setShowLoginPassword,
  ] = useState(false);

  const [
    showRegisterPassword,
    setShowRegisterPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [currentSlide, setCurrentSlide] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide(
        (current) =>
          (current + 1) %
          carouselImages.length
      );
    }, 5000);

    return () =>
      window.clearInterval(timer);
  }, []);

  const previousSlide = () => {
    setCurrentSlide((current) =>
      current === 0
        ? carouselImages.length - 1
        : current - 1
    );
  };

  const nextSlide = () => {
    setCurrentSlide(
      (current) =>
        (current + 1) %
        carouselImages.length
    );
  };

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    onLoginSuccess();
  };

  const handleRegister = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (
      registerPassword !==
      confirmPassword
    ) {
      setErrorMessage(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      "Registration successful. You can now log in."
    );

    setRegisterPassword("");
    setConfirmPassword("");
    setIsRegister(false);
  };

  return (
    <div className="login-page">

      <div
        className={`login-container ${
          isRegister
            ? "register-mode"
            : ""
        }`}
      >

        {/* ================================================
            LOGIN
        ================================================= */}

        <div className="auth-form login-form">

          <div className="auth-heading">

            <div className="auth-heading-icon">
              <UserRound size={26} />
            </div>

            <div>
              <h1>Welcome Back!</h1>

              <p>
                Sign in to access the
                Barangay Census System
              </p>
            </div>

          </div>

          <form onSubmit={handleLogin}>

            <label>Email Address</label>

            <div className="auth-input">
              <Mail size={19} />

              <input
                type="email"
                name="login-email"
                autoComplete="username"
                placeholder="Enter your email address"
                value={loginEmail}
                onChange={(event) =>
                  setLoginEmail(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <label>Password</label>

            <div className="auth-input">
              <LockKeyhole size={19} />

              <input
                type={
                  showLoginPassword
                    ? "text"
                    : "password"
                }
                name="login-password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(event) =>
                  setLoginPassword(
                    event.target.value
                  )
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowLoginPassword(
                    (current) => !current
                  )
                }
              >
                {showLoginPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <div className="auth-options">

              <label className="remember-option">
                <input
                  type="checkbox"
                  defaultChecked
                />
                Remember me
              </label>

              <button
                type="button"
                className="forgot-password"
              >
                Forgot password?
              </button>

            </div>

            {errorMessage && (
              <div className="auth-error">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="auth-success">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              <LogIn size={19} />

              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="switch-row">
            Don't have an account?

            <button
              type="button"
              onClick={() =>
                setIsRegister(true)
              }
            >
              Register here
            </button>
          </div>

          <div className="authorized-card">
            <ShieldCheck size={27} />

            <div>
              <strong>
                Authorized Access Only
              </strong>

              <p>
                This system is restricted
                to authorized barangay
                personnel.
              </p>
            </div>
          </div>

        </div>


        {/* ================================================
            REGISTER
        ================================================= */}

        <div className="auth-form register-form">

          <div className="auth-heading">

            <div className="auth-heading-icon">
              <UserPlus size={26} />
            </div>

            <div>
              <h1>Create an Account</h1>

              <p>
                Register to access the
                Barangay Census System
              </p>
            </div>

          </div>

          <form onSubmit={handleRegister}>

            <label>Full Name</label>

            <div className="auth-input">
              <UserRound size={19} />

              <input
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <label>Email Address</label>

            <div className="auth-input">
              <Mail size={19} />

              <input
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={registerEmail}
                onChange={(event) =>
                  setRegisterEmail(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <label>Password</label>

            <div className="auth-input">
              <LockKeyhole size={19} />

              <input
                type={
                  showRegisterPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                placeholder="Create a password"
                value={registerPassword}
                onChange={(event) =>
                  setRegisterPassword(
                    event.target.value
                  )
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowRegisterPassword(
                    (current) => !current
                  )
                }
              >
                {showRegisterPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <label>
              Confirm Password
            </label>

            <div className="auth-input">
              <LockKeyhole size={19} />

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="auth-error">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="auth-success">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              <UserPlus size={19} />

              {loading
                ? "Registering..."
                : "Register"}
            </button>

          </form>

          <div className="switch-row">
            Already have an account?

            <button
              type="button"
              onClick={() =>
                setIsRegister(false)
              }
            >
              Login here
            </button>
          </div>

        </div>


        {/* ================================================
            PHOTO / ANIMATED PANEL
        ================================================= */}

        <div className="auth-panel">

          <div className="carousel-images">

            {carouselImages.map(
              (image, index) => (
                <img
                  key={image}
                  src={image}
                  alt=""
                  className={
                    index === currentSlide
                      ? "carousel-image active"
                      : "carousel-image"
                  }
                />
              )
            )}

          </div>

          <div className="carousel-overlay" />

          <div className="panel-brand">

            <img
              src={barangayLogo}
              alt="Barangay Pambuhan Logo"
            />

            <h2>
              BARANGAY PAMBUHAN
            </h2>

            <span>
              DIGITAL CENSUS
              MANAGEMENT SYSTEM
            </span>

            <div className="brand-line" />

            <div className="security-copy">
              <ShieldCheck size={26} />

              <div>
                <strong>
                  Secure. Reliable.
                  Confidential.
                </strong>

                <p>
                  This system is for
                  authorized barangay
                  personnel only.
                </p>
              </div>
            </div>

            <div className="location-copy">
              <MapPin size={21} />

              <span>
                Barangay Pambuhan,
                Mercedes, Camarines Norte
              </span>
            </div>

          </div>


          {/* THUMBNAILS */}

          <div className="carousel-thumbnails">

            {carouselImages
              .slice(0, 5)
              .map((image, index) => (

                <button
                  key={image}
                  type="button"
                  className={
                    index === currentSlide
                      ? "thumbnail active"
                      : "thumbnail"
                  }
                  onClick={() =>
                    setCurrentSlide(index)
                  }
                >
                  <img
                    src={image}
                    alt=""
                  />
                </button>

              ))}

          </div>


          {/* CONTROLS */}

          <div className="carousel-controls">

            <button
              type="button"
              onClick={previousSlide}
              aria-label="Previous image"
            >
              <ChevronLeft size={22} />
            </button>

            <div className="carousel-dots">

              {carouselImages.map(
                (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={
                      index ===
                      currentSlide
                        ? "dot active"
                        : "dot"
                    }
                    onClick={() =>
                      setCurrentSlide(
                        index
                      )
                    }
                  />
                )
              )}

            </div>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next image"
            >
              <ChevronRight size={22} />
            </button>

          </div>

          <div className="photo-credit">
            Aerial photos courtesy of
            Photoprinze
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;