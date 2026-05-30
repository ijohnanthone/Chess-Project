
export const pieceUnicode = {
    'K': '&#9812;', 'Q': '&#9813;', 'R': '&#9814;', 'B': '&#9815;', 'N': '&#9816;', 'P': '&#9817;',
    'k': '&#9818;', 'q': '&#9819;', 'r': '&#9820;', 'b': '&#9821;', 'n': '&#9822;', 'p': '&#9823;',
    ' ': ''
};

export function getPieceColor(pieceChar) {
    if (pieceChar === ' ') return null;
    return pieceChar === pieceChar.toUpperCase() ? 'white' : 'black';
}

// Checks if any piece blocks the path for Rook, Bishop, Queen
export function isPathBlocked(board, startRow, startCol, endRow, endCol) {
    const dr = Math.sign(endRow - startRow);
    const dc = Math.sign(endCol - startCol);
    let r = startRow + dr;
    let c = startCol + dc;

    while (r !== endRow || c !== endCol) {
        if (board[r][c] !== ' ') {
            return true;
        }
        r += dr;
        c += dc;
    }
    return false;
}

export function isValidMove(board, startRow, startCol, endRow, endCol, pieceChar, currentPlayerColor) {
    const pieceColor = getPieceColor(pieceChar);
    const targetPieceChar = board[endRow][endCol];
    const targetPieceColor = getPieceColor(targetPieceChar);

    // Basic boundary checks
    if (endRow < 0 || endRow >= 8 || endCol < 0 || endCol >= 8) {
        return false;
    }

    // Cannot move a non-existent piece
    if (pieceChar === ' ') return false;

    // Cannot move opponent's piece if it's not a capture
    if (pieceColor !== currentPlayerColor) {
        return false;
    }

    // Cannot capture own piece
    if (targetPieceColor === pieceColor) {
        return false;
    }

    const dr = endRow - startRow;
    const dc = endCol - startCol;

    switch (pieceChar.toUpperCase()) {
        case 'P': // Pawn
            const direction = pieceColor === 'white' ? -1 : 1;
            if (dc === 0) { // Straight move
                if (targetPieceChar === ' ') {
                    if (dr === direction) return true;
                    if (((pieceColor === 'white' && startRow === 6) || (pieceColor === 'black' && startRow === 1)) &&
                        dr === 2 * direction && board[startRow + direction][startCol] === ' ') {
                        return true;
                    }
                }
            } else if (Math.abs(dc) === 1 && dr === direction) { // Diagonal capture
                if (targetPieceChar !== ' ') return true;
            }
            return false;
        case 'R': // Rook
            if (dr === 0 || dc === 0) {
                return !isPathBlocked(board, startRow, startCol, endRow, endCol);
            }
            return false;
        case 'N': // Knight
            return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
        case 'B': // Bishop
            if (Math.abs(dr) === Math.abs(dc)) {
                return !isPathBlocked(board, startRow, startCol, endRow, endCol);
            }
            return false;
        case 'Q': // Queen
            if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
                return !isPathBlocked(board, startRow, startCol, endRow, endCol);
            }
            return false;
        case 'K': // King
            return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
        default:
            return false;
    }
}

export function getLegalMoves(board, row, col, currentPlayerColor) {
    const legalMoves = [];
    const pieceChar = board[row][col];
    if (pieceChar === ' ' || getPieceColor(pieceChar) !== currentPlayerColor) {
        return legalMoves; // Cannot move an empty square or opponent's piece
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (isValidMove(board, row, col, r, c, pieceChar, currentPlayerColor)) {
                const targetPieceChar = board[r][c];
                const isCapture = targetPieceChar !== ' ';
                legalMoves.push({ startRow: row, startCol: col, endRow: r, endCol: c, isCapture: isCapture, piece: pieceChar });
            }
        }
    }
    return legalMoves;
}
