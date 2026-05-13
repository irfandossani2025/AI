import { useEffect, useState } from 'react';
import { bootstrapAdmin, getBootstrapStatus, login } from '../api/client';
import { useAuth } from '../context/AuthContext';

const defaultBootstrapForm = {
  name: '',
  email: '',
  password: '',
  setupToken: ''
};

const defaultLoginForm = {
  email: '',
  password: ''
};

export function LoginForm() {
  const { setUser } = useAuth();
  const [requiresBootstrap, setRequiresBootstrap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(defaultLoginForm);
  const [bootstrapState, setBootstrapState] = useState(defaultBootstrapForm);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBootstrapStatus() {
      try {
        const response = await getBootstrapStatus();
        setRequiresBootstrap(response.requiresBootstrap);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadBootstrapStatus();
  }, []);

  async function handleBootstrapSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await bootstrapAdmin(bootstrapState);
      setUser(response.user);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await login(formState);
      setUser(response.user);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) {
    return <div className="card login-card">Checking setup status...</div>;
  }

  return (
    <div className="login-screen">
      <div className="brand-panel">
        <p className="eyebrow">Techit AI</p>
        <h1>Your private AI workspace</h1>
        <p className="lead">
          Chat with a self-hosted assistant, learn from trusted URLs, and keep your knowledge base under
          your control.
        </p>
      </div>

      <div className="card login-card">
        <p className="eyebrow">{requiresBootstrap ? 'First-time setup' : 'Welcome back'}</p>
        <h2>{requiresBootstrap ? 'Create the admin account' : 'Sign in'}</h2>

        {error ? <div className="alert error">{error}</div> : null}

        {requiresBootstrap ? (
          <form className="form-stack" onSubmit={handleBootstrapSubmit}>
            <input
              className="input"
              placeholder="Full name"
              value={bootstrapState.name}
              onChange={(event) => setBootstrapState((current) => ({ ...current, name: event.target.value }))}
            />
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={bootstrapState.email}
              onChange={(event) => setBootstrapState((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              className="input"
              type="password"
              placeholder="Strong password"
              value={bootstrapState.password}
              onChange={(event) => setBootstrapState((current) => ({ ...current, password: event.target.value }))}
            />
            <input
              className="input"
              type="password"
              placeholder="Setup token from .env"
              value={bootstrapState.setupToken}
              onChange={(event) => setBootstrapState((current) => ({ ...current, setupToken: event.target.value }))}
            />
            <button className="button primary" type="submit">
              Create admin account
            </button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={handleLoginSubmit}>
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={formState.email}
              onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={formState.password}
              onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
            />
            <button className="button primary" type="submit">
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
