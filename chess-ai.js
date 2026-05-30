import { getPieceColor, getLegalMoves, isKingInCheck } from './chess-logic.js';

const PIECE_VALUES = {
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000, // White pieces
    'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000, // Black pieces
    ' ': 0
};

// Simple board evaluation function
export function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            score += PIECE_VALUES[board[r][c]];
        }
    }
    return score;
}

// Applies a move to a board and returns the new board state
export function applyMove(board, move) {
    const newBoard = board.map(row => [...row]); // Deep copy

    newBoard[move.endRow][move.endCol] = newBoard[move.startRow][move.startCol];
    newBoard[move.startRow][move.startCol] = ' ';

    // Pawn promotion (simplified to Queen)
    const pieceChar = newBoard[move.endRow][move.endCol];
    const pieceColor = getPieceColor(pieceChar);
    if (pieceChar.toUpperCase() === 'P') {
        if (pieceColor === 'white' && move.endRow === 0) {
            newBoard[move.endRow][move.endCol] = 'Q';
        } else if (pieceColor === 'black' && move.endRow === 7) {
            newBoard[move.endRow][move.endCol] = 'q';
        }
    }
    return { newBoard };
}

// Minimax algorithm with alpha-beta pruning
export function minimax(board, depth, alpha, beta, maximizingPlayer, aiColor) {
    if (depth === 0) {
        return evaluateBoard(board);
    }

    const currentPlayerColor = maximizingPlayer ? aiColor : (aiColor === 'white' ? 'black' : 'white');
    let allPossibleMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            allPossibleMoves = allPossibleMoves.concat(getLegalMoves(board, r, c, currentPlayerColor));
        }
    }

    if (allPossibleMoves.length === 0) {
        const inCheck = isKingInCheck(board, currentPlayerColor);
        if (inCheck) {
            // Checkmate: return very high/low score depending on which player is checkmated
            return maximizingPlayer ? (-500000 - depth) : (500000 + depth);
        } else {
            // Stalemate: return neutral score
            return 0;
        }
    }

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of allPossibleMoves) {
            const { newBoard } = applyMove(board, move);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, maxEval);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of allPossibleMoves) {
            const { newBoard } = applyMove(board, move);
            const evaluation = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, minEval);
            if (beta <= alpha) {
                break; // Alpha-beta pruning
            }
        }
        return minEval;
    }
}

export function findBestMove(board, aiColor, depth = 2) {
    let bestMove = null;
    let bestValue = -Infinity; // AI aims to maximize its score (positive for AI, negative for opponent)
    const currentPlayerColor = aiColor;

    let allPossibleMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            allPossibleMoves = allPossibleMoves.concat(getLegalMoves(board, r, c, currentPlayerColor));
        }
    }
    // Shuffle moves to add some randomness, especially for equally good moves
    allPossibleMoves.sort(() => Math.random() - 0.5);

    for (const move of allPossibleMoves) {
        const { newBoard } = applyMove(board, move);
        const moveValue = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiColor); // False because next player is opponent
        if (moveValue > bestValue) {
            bestValue = moveValue;
            bestMove = move;
        }
    }
    return bestMove;
}
