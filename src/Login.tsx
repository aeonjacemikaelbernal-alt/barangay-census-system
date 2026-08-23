import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./Login.css";

type LoginProps = {
  onLoginSuccess: () => void;
};

function Login({ onLoginSuccess }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        email,
        password,
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
        email,
        password,
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

    setPassword("");
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
  placeholder="Email"
  value={email}
  onChange={(event) =>
    setEmail(event.target.value)
  }
  required
/>
            </div>

            <div className="auth-input">
              <input
  type="password"
  placeholder="Password"
  value={password}
  onChange={(event) =>
    setPassword(event.target.value)
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
  placeholder="Email"
  value={email}
  onChange={(event) =>
    setEmail(event.target.value)
  }
  required
/>
            </div>

            <div className="auth-input">
              <input
  type="password"
  placeholder="Password"
  value={password}
  onChange={(event) =>
    setPassword(event.target.value)
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