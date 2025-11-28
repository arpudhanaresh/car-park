import React, { useState } from 'react';

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

    return (
        <div className="admin-panel">
            <h3>Admin Configuration</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Rows: </label>
                    <input
                        type="number"
                        value={rows}
                        onChange={(e) => setRows(parseInt(e.target.value))}
                        min="1"
                        max="10"
                    />
                </div>
                <div className="form-group">
                    <label>Columns: </label>
                    <input
                        type="number"
                        value={cols}
                        onChange={(e) => setCols(parseInt(e.target.value))}
                        min="1"
                        max="10"
                    />
                </div>
                <button type="submit">Update Layout</button>
            </form>
        </div>
    );
};

export default AdminPanel;
