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
  UserRound,
  LogIn,
} from "lucide-react";

import { supabase } from "../../services/supabaseClient";

import {
  getAuthorizedUser,
  type AuthorizedUser,
} from "../../services/authService";

import "./Login.css";

import barangayLogo from "../../assets/barangay-pambuhan-logo.png";

import barangayHall from "../../assets/login/barangay-hall.png";
import aerial1 from "../../assets/login/aerial-1.jfif";
import aerial2 from "../../assets/login/aerial-2.jfif";
import aerial3 from "../../assets/login/aerial-3.jfif";
import aerial4 from "../../assets/login/aerial-4.jfif";
import aerial5 from "../../assets/login/aerial-5.jfif";
import aerial6 from "../../assets/login/aerial-6.jfif";
import aerial7 from "../../assets/login/aerial-7.jfif";
import aerial8 from "../../assets/login/aerial-8.jfif";
import aerial9 from "../../assets/login/aerial-9.jfif";
import aerial10 from "../../assets/login/aerial-10.jfif";

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
type LoginProps = {
  onLoginSuccess: (
    user: AuthorizedUser
  ) => void;
};

function Login({
  onLoginSuccess,
}: LoginProps) {

  const [loginEmail, setLoginEmail] =
    useState("");

  const [loginPassword, setLoginPassword] =
    useState("");





  const [
    showLoginPassword,
    setShowLoginPassword,
  ] = useState(false);



  const [currentSlide, setCurrentSlide] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
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
  setLoading(true);

  try {
    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.user) {
      setErrorMessage(
        "Unable to verify your account."
      );
      return;
    }

    const authorizedUser =
      await getAuthorizedUser(data.user.id);

    if (!authorizedUser) {
      await supabase.auth.signOut();

      setErrorMessage(
        "Your account is not authorized to access this system."
      );

      return;
    }

    if (!authorizedUser.is_active) {
      await supabase.auth.signOut();

      setErrorMessage(
        "Your account has been deactivated. Please contact the system administrator."
      );

      return;
    }

    onLoginSuccess(authorizedUser); 
  } catch (error) {
    console.error(
      "LOGIN AUTHORIZATION CHECK FAILED:",
      error
    );

    await supabase.auth.signOut();

    setErrorMessage(
      "Unable to verify your account access. Please try again."
    );
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="login-page">

      <div
        className="login-container"
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

              <span className="remember-option">
                Session ends when you log out or close this tab.
              </span>

              <span className="forgot-password">
                Need a password reset? Contact the system administrator.
              </span>

            </div>

            {errorMessage && (
              <div className="auth-error">
                {errorMessage}
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
