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

    const previewGridStyle = {
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        maxWidth: '400px'
    };

    const renderPreview = () => {
        const preview = [];
        for (let i = 0; i < Math.min(rows * cols, 20); i++) {
            preview.push(
                <div key={i} className="aspect-square bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xs font-medium text-gray-500">
                    {String.fromCharCode(65 + Math.floor(i / cols))}{(i % cols) + 1}
                </div>
            );
        }
        if (rows * cols > 20) {
            preview.push(
                <div key="more" className="aspect-square flex items-center justify-center text-gray-400 text-xs">...</div>
            );
        }
        return preview;
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                <div className="text-xl">ℹ️</div>
                <p className="text-sm text-blue-800">
                    Configure the parking lot layout by setting the number of rows and columns. Changes will immediately update the parking grid.
                </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                    <span className="text-xl">⚙️</span>
                    <h3 className="font-semibold text-gray-900">Layout Configuration</h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <span>↕️</span> Number of Rows
                            </label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={rows}
                                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                                min="1"
                                max="10"
                                required
                            />
                            <span className="text-xs text-gray-500 mt-1 block">Maximum: 10 rows</span>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <span>↔️</span> Number of Columns
                            </label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={cols}
                                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                                min="1"
                                max="10"
                                required
                            />
                            <span className="text-xs text-gray-500 mt-1 block">Maximum: 10 columns</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="text-sm font-medium text-gray-500 mb-3">Preview ({rows}×{cols} = {rows * cols} spots)</div>
                        <div className="grid gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200" style={previewGridStyle}>
                            {renderPreview()}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
                            onClick={() => {
                                setRows(currentRows);
                                setCols(currentCols);
                            }}
                        >
                            <span className="text-lg">↺</span> Reset
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm flex items-center gap-2"
                        >
                            <span className="text-lg">✓</span> Update Layout
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminPanel;
