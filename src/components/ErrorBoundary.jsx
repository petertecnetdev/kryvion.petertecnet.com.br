import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('[Kryvion] render failure', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return <main className="fatal-error" role="alert">
      <div className="fatal-error-card">
        <span className="fatal-error-icon"><FiAlertTriangle /></span>
        <p className="eyebrow">KRYVION RECOVERY</p>
        <h1>Não foi possível concluir esta visualização.</h1>
        <p>Seus dados permanecem preservados. Recarregue a interface para restabelecer a sessão visual.</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          <FiRefreshCw /> Recarregar Kryvion
        </button>
      </div>
    </main>;
  }
}
