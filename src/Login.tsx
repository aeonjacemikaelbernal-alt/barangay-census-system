import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./Login.css";

type LoginProps = {
  onLoginSuccess: () => void;
};

function Login({ onLoginSuccess }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
 const [loginEmail, setLoginEmail] = useState("");
const [loginPassword, setLoginPassword] = useState("");

const [registerEmail, setRegisterEmail] = useState("");
const [registerPassword, setRegisterPassword] = useState("");
const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
    setIsRegister(false);
  };

  return (
    <div className="login-page">

      <div
        className={`login-container ${
          isRegister ? "register-mode" : ""
        }`}
      >

        {/* =================================================
            LOGIN FORM
        ================================================= */}

        <div className="auth-form login-form">

          <h1>Login</h1>

          <p className="auth-subtitle">
            Sign in to access the Barangay Census System
          </p>

<form onSubmit={handleLogin}>

            <div className="auth-input">
            
<input
  type="email"
  name="login-email"
  autoComplete="username"
  placeholder="Email"
  value={loginEmail}
  onChange={(event) =>
    setLoginEmail(event.target.value)
  }
  required
/>
            </div>

            <div className="auth-input">
              <input
  type="password"
  name="login-password"
  autoComplete="current-password"
  placeholder="Password"
  value={loginPassword}
  onChange={(event) =>
    setLoginPassword(event.target.value)
  }
  required
/>
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
  {loading ? "Logging in..." : "Login"}
</button>

          </form>
          

          <p className="switch-text">
            Don't have an account?
          </p>

          <button
            type="button"
            className="switch-button"
            onClick={() => setIsRegister(true)}
          >
            Register
          </button>

        </div>


        {/* =================================================
            REGISTER FORM
        ================================================= */}

        <div className="auth-form register-form">

          <h1>Register</h1>

          <p className="auth-subtitle">
            Create an account for the Barangay Census System
          </p>

<form onSubmit={handleRegister}>

            <div className="auth-input">
              <input
  type="text"
  name="full-name"
  autoComplete="name"
  placeholder="Full Name"
  value={fullName}
  onChange={(event) =>
    setFullName(event.target.value)
  }
  required
/>
            </div>

            <div className="auth-input">
              <input
  type="email"
  name="register-email"
  autoComplete="email"
  placeholder="Email"
  value={registerEmail}
  onChange={(event) =>
    setRegisterEmail(event.target.value)
  }
  required
/>
            </div>

            <div className="auth-input">
              <input
  type="password"
  name="register-password"
  autoComplete="new-password"
  placeholder="Password"
  value={registerPassword}
  onChange={(event) =>
    setRegisterPassword(event.target.value)
  }
  required
/>
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
  {loading ? "Registering..." : "Register"}
</button>

          </form>

          <p className="switch-text">
            Already have an account?
          </p>

          <button
            type="button"
            className="switch-button"
            onClick={() => setIsRegister(false)}
          >
            Login
          </button>

        </div>


        {/* =================================================
            ANIMATED PANEL
        ================================================= */}

        <div className="auth-panel">

          <div className="panel-content login-panel-content">

            <h2>Hello, Welcome!</h2>

            <p>
              Don't have an account?
            </p>

            <button
              type="button"
              onClick={() => setIsRegister(true)}
            >
              Register
            </button>

          </div>


          <div className="panel-content register-panel-content">

            <h2>Welcome Back!</h2>

            <p>
              Already have an account?
            </p>

            <button
              type="button"
              onClick={() => setIsRegister(false)}
            >
              Login
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;