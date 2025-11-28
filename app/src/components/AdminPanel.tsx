import React, { useState } from 'react';
import './AdminPanel.css';

interface AdminPanelProps {
  currentRows: number;
  currentCols: number;
  onUpdateLayout: (rows: number, cols: number) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentRows, currentCols, onUpdateLayout }) => {
  const [rows, setRows] = useState(currentRows);
  const [cols, setCols] = useState(currentCols);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLayout(rows, cols);
  };

  const previewGridStyle = {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    maxWidth: '400px'
  };

  const renderPreview = () => {
    const preview = [];
    for (let i = 0; i < Math.min(rows * cols, 20); i++) {
      preview.push(
        <div key={i} className="preview-spot">
          {String.fromCharCode(65 + Math.floor(i / cols))}{(i % cols) + 1}
        </div>
      );
    }
    if (rows * cols > 20) {
      preview.push(
        <div key="more" className="preview-spot">...</div>
      );
    }
    return preview;
  };

  return (
    <div className="admin-panel-wrapper">
      <div className="admin-info">
        <div className="admin-info-title">
          <span>ℹ️</span> Admin Configuration
        </div>
        <p className="admin-info-text">
          Configure the parking lot layout by setting the number of rows and columns. Changes will immediately update the parking grid.
        </p>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-icon">⚙️</span>
          <h3 className="admin-card-title">Layout Configuration</h3>
        </div>

        <form onSubmit={handleSubmit} className="layout-form">
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">
                <span>↕️</span> Number of Rows
              </label>
              <input
                type="number"
                className="form-input"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                min="1"
                max="10"
                required
              />
              <span className="form-help">Maximum: 10 rows</span>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span>↔️</span> Number of Columns
              </label>
              <input
                type="number"
                className="form-input"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                min="1"
                max="10"
                required
              />
              <span className="form-help">Maximum: 10 columns</span>
            </div>
          </div>

          <div className="layout-preview">
            <div className="preview-label">Preview ({rows}×{cols} = {rows * cols} spots)</div>
            <div className="preview-grid" style={previewGridStyle}>
              {renderPreview()}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setRows(currentRows);
              setCols(currentCols);
            }}>
              <span className="btn-icon">↺</span> Reset
            </button>
            <button type="submit" className="btn btn-primary">
              <span className="btn-icon">✓</span> Update Layout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPanel;
