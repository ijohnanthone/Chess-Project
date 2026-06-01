
export const pieceUnicode = {
    'K': '&#9812;', 'Q': '&#9813;', 'R': '&#9814;', 'B': '&#9815;', 'N': '&#9816;', 'P': '&#9817;',
    'k': '&#9818;', 'q': '&#9819;', 'r': '&#9820;', 'b': '&#9821;', 'n': '&#9822;', 'p': '&#9823;',
    ' ': ''
};

export const initialGameState = {
    castlingRights: {
        whiteKingSide: true,
        whiteQueenSide: true,
        blackKingSide: true,
        blackQueenSide: true,
    },
    enPassantTarget: null, // [row, col] of the square behind the jumped pawn
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

export function isValidMove(board, startRow, startCol, endRow, endCol, pieceChar, currentPlayerColor, gameState) {
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
            } else if (Math.abs(dc) === 1 && dr === direction) { // Diagonal capture or en passant
                if (targetPieceChar !== ' ') return true;
                // En Passant check: target square is empty, but matches enPassantTarget
                if (targetPieceChar === ' ' && gameState.enPassantTarget &&
                    endRow === gameState.enPassantTarget[0] && endCol === gameState.enPassantTarget[1]) {
                    // Check if the actual pawn to be captured is in the correct position
                    const jumpedPawnRow = startRow;
                    const jumpedPawnCol = endCol;
                    const jumpedPawnChar = board[jumpedPawnRow][jumpedPawnCol];
                    const opponentPawnChar = currentPlayerColor === 'white' ? 'p' : 'P';
                    if (jumpedPawnChar === opponentPawnChar &&
                        ((currentPlayerColor === 'white' && startRow === 3 && endRow === 2) ||
                         (currentPlayerColor === 'black' && startRow === 4 && endRow === 5))) {
                        return true;
                    }
                }
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
            // Normal King moves
            if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;

            // Castling is handled in getLegalMoves, isValidMove just checks normal King movement
            return false;
        default:
            return false;
    }
}

// Helper function to find the king's position
export function findKing(board, color) {
    const kingChar = color === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingChar) {
                return [r, c];
            }
        }
    }
    return null; // Should not happen in a valid game state
}

// Checks if a square is attacked by the opponent
export function isSquareAttacked(board, row, col, attackerColor, gameState) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const pieceChar = board[r][c];
            if (pieceChar !== ' ' && getPieceColor(pieceChar) === attackerColor) {
                // Use initialGameState for attacks as castling/en passant rights don't affect attacking squares
                if (isValidMove(board, r, c, row, col, pieceChar, attackerColor, initialGameState)) {
                    return true;
                }
            }
        }
    }
    return false;
}

export function isKingInCheck(board, color, gameState) {
    const kingPos = findKing(board, color);
    if (!kingPos) return false; // Should not happen

    const [kingRow, kingCol] = kingPos;
    const opponentColor = color === 'white' ? 'black' : 'white';

    return isSquareAttacked(board, kingRow, kingCol, opponentColor, gameState);
}

// Function to apply a move and return the new board and game state
export function applyMove(board, move, currentGameState) {
    const newBoard = board.map(row => [...row]);
    const newGameState = JSON.parse(JSON.stringify(currentGameState)); // Deep copy for immutability

    const pieceChar = newBoard[move.startRow][move.startCol];
    const pieceColor = getPieceColor(pieceChar);
    const opponentColor = pieceColor === 'white' ? 'black' : 'white';

    // Reset en passant target for the next turn
    newGameState.enPassantTarget = null;

    // Handle Castling
    if (pieceChar.toUpperCase() === 'K' && Math.abs(move.startCol - move.endCol) === 2) {
        // King-side castling
        if (move.endCol === 6) {
            newBoard[move.startRow][5] = newBoard[move.startRow][7]; // Move Rook
            newBoard[move.startRow][7] = ' ';
        }
        // Queen-side castling
        else if (move.endCol === 2) {
            newBoard[move.startRow][3] = newBoard[move.startRow][0]; // Move Rook
            newBoard[move.startRow][0] = ' ';
        }
        newBoard[move.endRow][move.endCol] = pieceChar;
        newBoard[move.startRow][move.startCol] = ' ';
    }
    // Handle En Passant
    else if (pieceChar.toUpperCase() === 'P' && move.startCol !== move.endCol && newBoard[move.endRow][move.endCol] === ' ') {
        // This is an en passant capture, remove the jumped pawn
        const jumpedPawnRow = move.startRow;
        const jumpedPawnCol = move.endCol;
        newBoard[jumpedPawnRow][jumpedPawnCol] = ' ';
        newBoard[move.endRow][move.endCol] = pieceChar;
        newBoard[move.startRow][move.startCol] = ' ';
    }
    // Normal move
    else {
        newBoard[move.endRow][move.endCol] = pieceChar;
        newBoard[move.startRow][move.startCol] = ' ';

        // Check for pawn double move to set en passant target
        if (pieceChar.toUpperCase() === 'P' && Math.abs(move.startRow - move.endRow) === 2) {
            newGameState.enPassantTarget = [move.startRow + (pieceColor === 'white' ? -1 : 1), move.startCol];
        }
    }

    // Pawn promotion (simplified to Queen for now, but applyMove should handle it)
    if (pieceChar.toUpperCase() === 'P') {
        if (pieceColor === 'white' && move.endRow === 0) {
            newBoard[move.endRow][move.endCol] = 'Q';
        } else if (pieceColor === 'black' && move.endRow === 7) {
            newBoard[move.endRow][move.endCol] = 'q';
        }
    }

    // Update castling rights
    // If King moves, lose all castling rights for that color
    if (pieceChar.toUpperCase() === 'K') {
        if (pieceColor === 'white') {
            newGameState.castlingRights.whiteKingSide = false;
            newGameState.castlingRights.whiteQueenSide = false;
        } else {
            newGameState.castlingRights.blackKingSide = false;
            newGameState.castlingRights.blackQueenSide = false;
        }
    }
    // If Rook moves from original position, lose corresponding castling right
    if (pieceChar.toUpperCase() === 'R') {
        if (pieceColor === 'white') {
            if (move.startRow === 7 && move.startCol === 0) newGameState.castlingRights.whiteQueenSide = false;
            if (move.startRow === 7 && move.startCol === 7) newGameState.castlingRights.whiteKingSide = false;
        } else {
            if (move.startRow === 0 && move.startCol === 0) newGameState.castlingRights.blackQueenSide = false;
            if (move.startRow === 0 && move.startCol === 7) newGameState.castlingRights.blackKingSide = false;
        }
    }

    return { newBoard, newGameState };
}

// Helper functions for castling conditions
function canCastleKingSide(board, color, gameState) {
    const row = color === 'white' ? 7 : 0;
    const kingChar = color === 'white' ? 'K' : 'k';
    const rookChar = color === 'white' ? 'R' : 'r';

    if (board[row][4] !== kingChar || board[row][7] !== rookChar) return false;
    if (color === 'white' && !gameState.castlingRights.whiteKingSide) return false;
    if (color === 'black' && !gameState.castlingRights.blackKingSide) return false;

    // Check if squares between king and rook are empty
    if (board[row][5] !== ' ' || board[row][6] !== ' ') return false;

    // Check if king is in check or passes through attacked squares
    if (isKingInCheck(board, color, gameState)) return false;
    if (isSquareAttacked(board, row, 5, color === 'white' ? 'black' : 'white', gameState)) return false;
    if (isSquareAttacked(board, row, 6, color === 'white' ? 'black' : 'white', gameState)) return false;

    return true;
}

function canCastleQueenSide(board, color, gameState) {
    const row = color === 'white' ? 7 : 0;
    const kingChar = color === 'white' ? 'K' : 'k';
    const rookChar = color === 'white' ? 'R' : 'r';

    if (board[row][4] !== kingChar || board[row][0] !== rookChar) return false;
    if (color === 'white' && !gameState.castlingRights.whiteQueenSide) return false;
    if (color === 'black' && !gameState.castlingRights.blackQueenSide) return false;

    // Check if squares between king and rook are empty
    if (board[row][1] !== ' ' || board[row][2] !== ' ' || board[row][3] !== ' ') return false;

    // Check if king is in check or passes through attacked squares
    if (isKingInCheck(board, color, gameState)) return false;
    if (isSquareAttacked(board, row, 3, color === 'white' ? 'black' : 'white', gameState)) return false;
    if (isSquareAttacked(board, row, 2, color === 'white' ? 'black' : 'white', gameState)) return false; // King lands here

    return true;
}


// Replaced simulateAndCheck with a version using the new applyMove
function simulateAndCheck(board, move, color, gameState) {
    const { newBoard, newGameState } = applyMove(board, move, gameState);
    return isKingInCheck(newBoard, color, newGameState);
}


export function getLegalMoves(board, row, col, currentPlayerColor, gameState) {
    const legalMoves = [];
    const pieceChar = board[row][col];
    if (pieceChar === ' ' || getPieceColor(pieceChar) !== currentPlayerColor) {
        return legalMoves; // Cannot move an empty square or opponent's piece
    }

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const potentialMove = { startRow: row, startCol: col, endRow: r, endCol: c, piece: pieceChar };
            if (isValidMove(board, row, col, r, c, pieceChar, currentPlayerColor, gameState)) {
                if (!simulateAndCheck(board, potentialMove, currentPlayerColor, gameState)) {
                    const targetPieceChar = board[r][c];
                    const isCapture = targetPieceChar !== ' ';
                    legalMoves.push({ ...potentialMove, isCapture: isCapture });
                }
            }
        }
    }

    // Add Castling moves
    if (pieceChar.toUpperCase() === 'K') {
        const kingRow = currentPlayerColor === 'white' ? 7 : 0;
        const kingCol = 4;
        if (canCastleKingSide(board, currentPlayerColor, gameState)) {
            const castlingMove = { startRow: kingRow, startCol: kingCol, endRow: kingRow, endCol: 6, isCastling: true, piece: pieceChar };
            if (!simulateAndCheck(board, castlingMove, currentPlayerColor, gameState)) {
                 legalMoves.push(castlingMove);
            }
        }
        if (canCastleQueenSide(board, currentPlayerColor, gameState)) {
            const castlingMove = { startRow: kingRow, startCol: kingCol, endRow: kingRow, endCol: 2, isCastling: true, piece: pieceChar };
            if (!simulateAndCheck(board, castlingMove, currentPlayerColor, gameState)) {
                legalMoves.push(castlingMove);
            }
        }
    }

    return legalMoves;
}
