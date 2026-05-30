import { getPieceColor, getLegalMoves, isKingInCheck } from './chess-logic.js';

const PIECE_VALUES = {
    'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000, // White pieces
    'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000, // Black pieces
    ' ': 0
};

// Advanced Piece-Square Tables (PSTs) to reward positional play
const PAWN_PST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_PST = [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_PST = [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_PST = [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,  0,  5,  5,  5,  5,  0, -5],
    [0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  5,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_PST = [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20, 20,  0,  0,  0,  0, 20, 20],
    [20, 30, 10,  0,  0, 10, 30, 20]
];

const PST_TABLES = {
    'P': PAWN_PST,
    'N': KNIGHT_PST,
    'B': BISHOP_PST,
    'R': ROOK_PST,
    'Q': QUEEN_PST,
    'K': KING_PST
};

// Advanced evaluation incorporating material and piece-square tables
export function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== ' ') {
                const value = PIECE_VALUES[piece];
                score += value;

                const upperPiece = piece.toUpperCase();
                const pstTable = PST_TABLES[upperPiece];
                if (pstTable) {
                    const isWhite = (piece === upperPiece);
                    if (isWhite) {
                        score += pstTable[r][c];
                    } else {
                        score -= pstTable[7 - r][c];
                    }
                }
            }
        }
    }
    return score;
}

// Move Ordering Heuristics (Checks, captures, promotions sorted first)
export function scoreMove(board, move, currentPlayerColor) {
    let score = 0;
    const piece = board[move.startRow][move.startCol];
    const target = board[move.endRow][move.endCol];

    // Capture heuristic (MVV-LVA: Most Valuable Victim - Least Valuable Assault)
    if (target !== ' ') {
        score += 10000 + (Math.abs(PIECE_VALUES[target]) - Math.abs(PIECE_VALUES[piece]) / 100);
    }

    // Promotion heuristic
    if (piece.toUpperCase() === 'P' && (move.endRow === 0 || move.endRow === 7)) {
        score += 8000;
    }

    // Positional improvement differential (PST score change)
    const pstTable = PST_TABLES[piece.toUpperCase()];
    if (pstTable) {
        const isWhite = (currentPlayerColor === 'white');
        const oldPst = isWhite ? pstTable[move.startRow][move.startCol] : pstTable[7 - move.startRow][move.startCol];
        const newPst = isWhite ? pstTable[move.endRow][move.endCol] : pstTable[7 - move.endRow][move.endCol];
        score += (newPst - oldPst) * 2;
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

    // Sort moves to evaluate high-impact moves first
    allPossibleMoves.sort((a, b) => scoreMove(board, b, currentPlayerColor) - scoreMove(board, a, currentPlayerColor));

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

export function findBestMove(board, aiColor, depth = 4) {
    let bestMove = null;
    let bestValue = -Infinity; // AI aims to maximize its score (positive for AI, negative for opponent)
    const currentPlayerColor = aiColor;

    let allPossibleMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            allPossibleMoves = allPossibleMoves.concat(getLegalMoves(board, r, c, currentPlayerColor));
        }
    }

    // Sort moves to speed up the root level search and cut off bad branches instantly
    allPossibleMoves.sort((a, b) => scoreMove(board, b, currentPlayerColor) - scoreMove(board, a, currentPlayerColor));

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
