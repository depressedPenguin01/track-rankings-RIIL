import { useState } from "react";

export default function ProtectedUpload({ children }) {
  const [input, setInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");

  const uploadPassword = import.meta.env.VITE_UPLOAD_PASSWORD;

  function handleSubmit(e) {
    e.preventDefault();

    if (!uploadPassword) {
      setError("Missing upload password in environment config.");
      return;
    }

    if (input === uploadPassword) {
      setUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password.");
    }
  }

  if (unlocked) {
    return children;
  }

  return (
    <section className="panel auth-panel">
      <h2>Admin Upload Access</h2>
      <p>Enter the upload password to continue.</p>

      <form onSubmit={handleSubmit} className="password-form">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Unlock</button>
      </form>

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}