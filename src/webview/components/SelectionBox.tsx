import React from 'react';

interface SelectionBoxProps {
    selectionBox: {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ selectionBox }) => {
    if (!selectionBox) return null;

    const minX = Math.min(selectionBox.startX, selectionBox.endX);
    const maxX = Math.max(selectionBox.startX, selectionBox.endX);
    const minY = Math.min(selectionBox.startY, selectionBox.endY);
    const maxY = Math.max(selectionBox.startY, selectionBox.endY);

    return (
        <div
            className="selection-box"
            style={{
                position: 'absolute',
                left: minX,
                top: minY,
                width: maxX - minX,
                height: maxY - minY,
                border: '2px dashed #f20d63',
                borderRadius: '12px',
                backgroundColor: 'rgba(242, 13, 99, 0.05)',
                boxShadow: '0 0 15px rgba(242, 13, 99, 0.3)',
                pointerEvents: 'none',
                zIndex: 1000,
            }}
        />
    );
};
